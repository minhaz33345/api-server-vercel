const { deleteTempFile } = require("./cleanTempMedia");
const { deleteFileFromStorageR2 } = require("./deleteFileFromStorage");
const { downloadMediaOnStorage } = require("./downloadMedia");
const { processImageBuffer } = require("./processImageBuffer");

// LƯU Ý: bản rút gọn cho Vercel chỉ xử lý ẢNH (sharp/heic-convert).
// processVideoBuffer/generateThumbnail (dùng ffmpeg-static/fluent-ffmpeg) đã
// bị bỏ vì không phù hợp với serverless (binary lớn, dễ vượt thời gian/kích
// thước giới hạn của function). Xem README.md trong thư mục này.
module.exports = {
  downloadMediaOnStorage,
  deleteTempFile,
  deleteFileFromStorageR2,
  processImageBuffer,
};
