// Middleware nhận 1 file ảnh avatar (field "avatar") qua multipart/form-data.
// Dùng memoryStorage để xử lý buffer trực tiếp qua sharp rồi đẩy lên Firebase,
// không cần lưu tạm ra disk.
const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // tối đa 8MB cho ảnh gốc trước khi nén
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ chấp nhận file ảnh"));
    }
    cb(null, true);
  },
});

/**
 * Middleware: parse 1 file từ field "avatar" → req.file = { buffer, mimetype, originalname, size }
 */
const uploadAvatarImage = (req, res, next) => {
  upload.single("avatar")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Ảnh vượt quá 8MB" });
        }
        return res.status(400).json({ error: `Lỗi upload: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "Lỗi upload file" });
    }
    next();
  });
};

module.exports = uploadAvatarImage;
