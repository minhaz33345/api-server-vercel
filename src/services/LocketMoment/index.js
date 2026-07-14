const { getInfoLocketMoments } = require("./getInfoMoment");
const { getLocketMoments } = require("./getMoment");
const { postImageToLocket, postImageToLocketV2 } = require("./postImageMoment");

// Bản rút gọn: không có postVideoToLocket/postVideoToLocketV2 (cần ffmpeg,
// xem README.md). Controller trả lỗi rõ ràng nếu client gửi type: "video".
module.exports = {
  postImageToLocket,
  postImageToLocketV2,

  getInfoLocketMoments,

  getLocketMoments,
};
