const creImagePayload = require("./createImagePayload");

// Bản rút gọn (Vercel): không export creVideoPayload — postImageMoment.js
// chỉ dùng creImagePayload. createVideoPayload.js bị bỏ khỏi thư mục này.
module.exports = {
  creImagePayload,
};
