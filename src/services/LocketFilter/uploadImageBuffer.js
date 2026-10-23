const crypto = require("crypto");
const { logInfo, logError } = require("../../utils/logEventUtils");
const { instanceFirestoreUpload } = require("../../libs");
const { getAppCheckToken } = require("../LocketAppCheck");

/**
 * Upload 1 Buffer ảnh bất kỳ lên bucket locket-filters, dùng chung cho:
 *  - ảnh gốc trước khi gửi AI  (pathPrefix = "filter_inputs")
 *  - ảnh AI trả về, cần URL để FE hiển thị / gửi moment (pathPrefix = "filter_outputs")
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {Buffer} imageBuffer
 * @param {string} pathPrefix - "filter_inputs" | "filter_outputs" | ...
 * @returns {Promise<string>} URL download đầy đủ (có alt=media&token=...)
 */
const uploadImageBuffer = async (userId, idToken, imageBuffer, pathPrefix) => {
  const CALLER = `uploadImageBuffer:${pathPrefix}`;

  try {
    const fileName = `${Date.now()}-${crypto.randomUUID().toUpperCase()}.jpeg`;
    const storagePath = `${pathPrefix}/${userId}/${fileName}`;
    const encodedPath = encodeURIComponent(storagePath).replace(/%2F/g, "%2F");

    logInfo(CALLER, "Bắt đầu upload", {
      user_id: userId,
      storage_path: storagePath,
      buffer_size: `${(imageBuffer.length / 1024).toFixed(1)} KB`,
    });

    const initUrl = `https://firebasestorage.googleapis.com/v0/b/locket-filters/o/${encodedPath}?uploadType=resumable&name=${encodedPath}`;
    const appCheckToken = await getAppCheckToken();

    const initHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${imageBuffer.length}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent": "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": "image/jpeg",
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
      ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
    };

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: initHeaders,
      body: JSON.stringify({
        name: storagePath,
        contentType: "image/jpeg",
        bucket: "",
        metadata: { creator: userId, visibility: "private" },
      }),
    });

    if (!initResponse.ok) {
      const errBody = await initResponse.text().catch(() => "(không đọc được body)");
      logError(CALLER, `Init upload thất bại: HTTP ${initResponse.status}`, {
        status: initResponse.status,
        response_body: errBody.slice(0, 500),
      });
      throw new Error(`Upload init failed: ${initResponse.status} — ${errBody.slice(0, 200)}`);
    }

    const uploadUrl = initResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) throw new Error("Firebase did not return upload URL");

    await instanceFirestoreUpload.put(uploadUrl, imageBuffer);

    const getUrl = `https://firebasestorage.googleapis.com/v0/b/locket-filters/o/${encodedPath}`;
    const getResponse = await fetch(getUrl, {
      headers: { authorization: `Bearer ${idToken}` },
    });

    if (!getResponse.ok) {
      throw new Error(`Failed to read metadata after upload: HTTP ${getResponse.status}`);
    }

    const { downloadTokens } = await getResponse.json();
    logInfo(CALLER, "Upload thành công");

    return `${getUrl}?alt=media&token=${downloadTokens}`;
  } catch (error) {
    logError(CALLER, error.message);
    throw error;
  }
};

module.exports = { uploadImageBuffer };
