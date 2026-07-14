const axios = require("axios");
const serverConfig = require("../../config/app.config");
const { logInfo, logSuccess, logError } = require("../../utils/logEventUtils");

const deleteFileFromStorageR2 = async (filePath) => {
  const { services } = serverConfig;
  const storageUrl = `${services.storageUrl}/api/delete`;
  const hasKey = !!process.env.CLEANER_KEY_ID;

  logInfo("deleteFileFromStorageR2", `🗑 Đang xoá: ${filePath}`);
  logInfo("deleteFileFromStorageR2", `📡 Storage URL: ${storageUrl}`);
  logInfo("deleteFileFromStorageR2", `🔑 CLEANER_KEY_ID: ${hasKey ? "✅ có" : "❌ THIẾU - sẽ bị 401"}`);

  try {
    const res = await axios.post(
      storageUrl,
      { key: filePath },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CLEANER_KEY_ID || ""}`,
        },
        timeout: 10000, // 10s timeout
      },
    );

    const data = res.data;

    if (data.success) {
      logSuccess("deleteFileFromStorageR2", `✅ Xoá thành công: ${filePath}`);
      return { success: true, message: data.message };
    } else {
      logError("deleteFileFromStorageR2", `❌ Xoá thất bại: ${filePath} | ${data.error || "Unknown"}`);
      return { success: false, error: data.error || "Delete failed" };
    }
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.message || error.message;

    if (status === 401) {
      logError("deleteFileFromStorageR2", `🔐 401 Unauthorized - CLEANER_KEY_ID sai hoặc thiếu!`);
    } else if (status === 404) {
      logError("deleteFileFromStorageR2", `📭 404 - File không tồn tại trên R2: ${filePath}`);
    } else {
      logError("deleteFileFromStorageR2", `❌ Lỗi không xác định [${status}]: ${msg}`);
    }

    return { success: false, error: msg };
  }
};

module.exports = { deleteFileFromStorageR2 };
