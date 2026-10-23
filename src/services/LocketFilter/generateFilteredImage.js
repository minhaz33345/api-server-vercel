const { instanceLocketV2 } = require("../../libs");
const { logInfo, logError } = require("../../utils/logEventUtils");
const { createAnalytics } = require("../LocketAnalytics");
const { uploadFilterInput } = require("./uploadFilterInput");

/**
 * Sinh ảnh filter bằng AI từ 1 ảnh gốc + prompt mô tả.
 * Flow đúng với traffic thật của app:
 *   1. Upload ảnh gốc lên bucket locket-filters (filter_inputs/{uid}/...)
 *   2. POST generateFilteredImage với image_url vừa upload + prompt
 *   3. Locket trả output_url (ảnh đã áp filter, lưu ở filter_outputs/{uid}/...)
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.idToken
 * @param {Buffer} params.imageBuffer - ảnh gốc (JPEG)
 * @param {string} params.prompt - mô tả filter muốn áp dụng
 * @returns {Promise<{ output_url: string }>}
 */
const generateFilteredImage = async ({ userId, idToken, imageBuffer, prompt }) => {
  try {
    logInfo("generateFilteredImage", "Start");

    if (!prompt || typeof prompt !== "string") {
      throw new Error("Missing prompt");
    }
    if (!Buffer.isBuffer(imageBuffer)) {
      throw new Error("Missing imageBuffer");
    }

    const imageUrl = await uploadFilterInput(userId, idToken, imageBuffer);

    const postData = {
      data: {
        analytics: createAnalytics(),
        image_url: imageUrl,
        prompt,
      },
    };

    const response = await instanceLocketV2.post("generateFilteredImage", postData, {
      meta: { idToken },
    });

    const outputUrl = response.data?.result?.data?.output_url;
    if (!outputUrl) {
      throw new Error("Locket không trả về output_url");
    }

    logInfo("generateFilteredImage", "End");
    return { output_url: outputUrl };
  } catch (error) {
    const message =
      error.response?.data?.error || error.response?.statusText || error.message;
    logError("generateFilteredImage", message);
    throw new Error(message);
  }
};

module.exports = { generateFilteredImage };
