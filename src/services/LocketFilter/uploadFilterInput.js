const { uploadImageBuffer } = require("./uploadImageBuffer");

/**
 * Upload ảnh gốc (input) lên bucket locket-filters, path filter_inputs/{uid}/...
 * Giữ hàm riêng này (thay vì gọi uploadImageBuffer trực tiếp ở generateFilteredImage.js)
 * để chỗ gọi đọc rõ ràng "đây là ảnh gốc", không lẫn với ảnh AI trả về.
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {Buffer} imageBuffer
 * @returns {Promise<string>} URL download
 */
const uploadFilterInput = (userId, idToken, imageBuffer) =>
  uploadImageBuffer(userId, idToken, imageBuffer, "filter_inputs");

module.exports = { uploadFilterInput };
