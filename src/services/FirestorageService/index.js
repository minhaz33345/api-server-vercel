const {
  uploadImageToFirebaseStorage,
  uploadGroupAvatarToFirebaseStorage,
  uploadAvatarToFirebaseStorage,
} = require("./uploadImage");

// Bản rút gọn: không export uploadVideoToFirebaseStorage / uploadThumbnailFromVideo
// (nằm trong uploadVideo.js, phụ thuộc generateThumbnail.js -> ffmpeg, đã bỏ).
module.exports = {
  uploadImageToFirebaseStorage,
  uploadGroupAvatarToFirebaseStorage,
  uploadAvatarToFirebaseStorage,
};
