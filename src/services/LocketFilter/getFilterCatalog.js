const axios = require("axios");
const { logInfo, logError } = require("../../utils/logEventUtils");

// Catalog filter AI công khai của LocketDio — access-control-allow-origin
// trên server đó chỉ cho phép đúng origin https://locket-dio.com, nên domain
// self-hosted khác (vd. locket-minh.click) gọi thẳng từ browser sẽ bị CORS
// chặn. Giải pháp: backend (server-to-server, không bị CORS) gọi hộ rồi trả
// lại cho frontend qua route /locket/filterCatalog của chính mình.
const CATALOG_URL = "https://data.locket-dio.com/v1/public/getFilters";

let cache = { data: null, fetchedAt: 0 };
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút — catalog ít đổi, tránh gọi lại liên tục

const getFilterCatalog = async () => {
  const CALLER = "getFilterCatalog";

  if (cache.data && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  try {
    const response = await axios.get(CATALOG_URL, {
      timeout: 10000,
      headers: {
        accept: "application/json, text/plain, */*",
        "x-app-author": "dio",
        "x-app-name": "locketdio",
        "x-api-key": "LKD-LOCKETDIO-AB02F55KYM55DD02MM03YY25-LKD",
        "x-app-env": "production",
        origin: "https://locket-dio.com",
        referer: "https://locket-dio.com/",
        "x-app-api": "v2.5.5",
        "x-app-client": "LocketDio1.7.8",
      },
    });

    const categories = response.data?.data ?? [];
    cache = { data: categories, fetchedAt: Date.now() };

    logInfo(CALLER, `Lấy catalog thành công: ${categories.length} category`);
    return categories;
  } catch (error) {
    const message = error.response?.data || error.message;
    logError(CALLER, typeof message === "string" ? message : JSON.stringify(message));

    // Có cache cũ thì trả tạm còn hơn lỗi trắng cho FE
    if (cache.data) return cache.data;
    throw new Error("Không lấy được danh mục filter AI");
  }
};

module.exports = { getFilterCatalog };
