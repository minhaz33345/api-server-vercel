const axios = require("axios");
const serverConfig = require("../config/app.config");

const loginHeader = {
  "Content-Type": "application/json",
  "Accept-Language": "en-US",
  "X-Ios-Bundle-Identifier": "com.locket.Locket",
  "baggage": "sentry-environment=production,sentry-public_key=78fa64317f434fd89d9cc728dd168f50,sentry-release=com.locket.Locket%401.121.1%2B1,sentry-trace_id=2cdda588ea0041ed93d052932b127a3e",
  "sentry-trace": "2cdda588ea0041ed93d052932b127a3e-a3e2ba7a095d4f9d-0",
  "User-Agent": "FirebaseAuth.iOS/10.23.1 com.locket.Locket/2.8.0 iPhone/18.0 hw/iPhone12_1",
  "X-Client-Version": "iOS/FirebaseSDK/10.23.1/FirebaseCore-iOS",
  "X-Firebase-GMPID": "1:641029076083:ios:cc8eb46290d69b234fa606",
  "X-Firebase-Client": "H4sIAAAAAAAAAKtWykhNLCpJSk0sKVayio7VUSpLLSrOzM9TslIyUqoFAFyivEQfAAAA",
  "Firebase-Instance-ID-Token": "fJPTpDP6oUV_pzt9fKJ5jy:APA91bEd7R3KNqzEghv_d1iyvw3LAG3GSGod1j161FUsnGJtuGz-iQGEHiUnutN2d7dZP-z5wTEx3XbLtFkpS0WpIeT4kpSg9pzwQsIuO4S19O6RR8Nphsc",
  "X-Firebase-AppCheck": "eyJraWQiOiJrMnhhbUEiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjY0MTAyOTA3NjA4Mzppb3M6Y2M4ZWI0NjI5MGQ2OWIyMzRmYTYwNiIsImF1ZCI6WyJwcm9qZWN0cy82NDEwMjkwNzYwODMiLCJwcm9qZWN0cy9sb2NrZXQtNDI1MmEiXSwicHJvdmlkZXIiOiJkZXZpY2VfY2hlY2tfZGV2aWNlX2lkZW50aWZpY2F0aW9uIiwiaXNzIjoiaHR0cHM6Ly9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tLzY0MTAyOTA3NjA4MyIsImV4cCI6MTc3ODM4MDQ3MywiaWF0IjoxNzc4Mzc2ODczLCJqdGkiOiJBZHdWQ3gya0p6eFBIZElhT3lLYjk0RC1jV2tMZXJ3RTRiZkhDaU1MeG1JIn0.PIf4_8l6sLusXF-IGSGqdpYQ3A1jlOsFez6wB9EjD4OH_PxLPDySaK-y_Rc5ei-MGvfTpiPgVxn5J1uc_Ut-rz3ilE6Rt1wPwOhTHXDvTT5uFANXf4wXunnfUzithVMpBXAMKo1RlGhosdyu3c3iif_InbTIFAHylLvO-T1wTUbPcI3gRp_rLpiQkYqOJ5V_azPCER5H3R0kB24Mpyvctv0NpXZCBAq4lcLdVNBVlwDawr72HDxNZYyCJI7E4k2e-wdTcVPERdQA0LVGcHgFH5bhfMgP3v4RLrVTXmIERBuJrRrI5FKywtq26W6jYLP5DIuCaLaj2a-F9zB43PfABkEDlKDcthr3niP7S6qfsQ1mWAsZBuOpxEmzGadOSy38qEuWpi-z5ithYti3OLLv3ufs_CPoW4kJIyJDouiYcBwfh5oj5FSwOlZsxDtaXtHKnXaHP__JypdTVnoql6nVN67jdzASkO65ClvwbJRvEr6qlK2R6LpOHEmQa6qEW47a",
};

const BASE_URL_LOCKET = serverConfig.function.locketApi;

const instanceLocketV2 = axios.create({
  baseURL: BASE_URL_LOCKET,
  timeout: 30000,
  headers: {
    ...loginHeader,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Interceptor: thêm token động trước mỗi request
instanceLocketV2.interceptors.request.use(
  async (config) => {
    // ── idToken ──
    const token = config?.meta?.idToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      // Log 20 ký tự đầu để debug mà không lộ full token
      console.log(`[instanceLocket] 🔑 idToken: ${token.substring(0, 20)}...`);
    } else {
      console.warn("[instanceLocket] ⚠️ Không có idToken!");
    }

    // ── AppCheck: tự động refresh qua device_token khi hết hạn ──
    // Bỏ qua nếu caller set meta.skipAppCheck = true (fetch nhẹ như fetchUserV2 trong push)
    if (config?.meta?.skipAppCheck) {
      // Giữ nguyên giá trị tĩnh trong loginHeader, không fetch mới
    } else {
      const appCheckToken = config?.meta?.appCheckToken;
      if (appCheckToken) {
        config.headers["X-Firebase-AppCheck"] = appCheckToken;
        console.log(`[instanceLocket] ✅ AppCheck từ meta: ${appCheckToken.substring(0, 20)}...`);
      } else {
        const { getAppCheckToken } = require("../services/LocketAppCheck");
        config.headers["X-Firebase-AppCheck"] = await getAppCheckToken();
      }
    }

    console.log(`[instanceLocket] 📡 → ${config.method?.toUpperCase()} ${config.baseURL}/${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor response: log lỗi từ Locket
instanceLocketV2.interceptors.response.use(
  (response) => {
    const errData = response.data?.error;
    if (errData) {
      console.error(`[instanceLocket] ❌ Locket error: status=${errData.status} message=${errData.message}`);
      console.error(`[instanceLocket] ❌ Full Locket response:`, JSON.stringify(response.data));
      // Throw để caller biết Locket reject — thay vì trả undefined data
      const err = new Error(errData.message || "Locket API error");
      err.locketError = errData;
      err.response = response;
      throw err;
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const data = error.response?.data;
    console.error(`[instanceLocket] ❌ HTTP ${status}:`, JSON.stringify(data));
    return Promise.reject(error);
  }
);

module.exports = { instanceLocketV2 };
