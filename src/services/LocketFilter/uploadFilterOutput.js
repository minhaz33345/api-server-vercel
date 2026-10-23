const { uploadImageBuffer } = require("./uploadImageBuffer");

/**
 * Upload ảnh AI vừa trả về (dạng base64/Buffer) lên bucket locket-filters,
 * path filter_outputs/{uid}/... — dùng khi AI provider KHÔNG tự trả sẵn URL
 * (Gemini, OpenAI Images, Replicate...), khác với Locket thật (đã có output_url sẵn).
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {Buffer} imageBuffer - ảnh đã qua AI, giải mã từ base64
 * @returns {Promise<string>} URL công khai để FE hiển thị / dùng cho postMomentV2
 */
const uploadFilterOutput = (userId, idToken, imageBuffer) =>
  uploadImageBuffer(userId, idToken, imageBuffer, "filter_outputs");

module.exports = { uploadFilterOutput };
