// Middleware nhận 1 file ảnh (field "image") qua multipart/form-data
// cho generateFilteredImage. Dùng memoryStorage để đẩy buffer thẳng lên
// Firebase Storage, không lưu tạm ra disk.
const multer = require("multer");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB cho ảnh gốc trước khi Locket xử lý
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Chỉ chấp nhận file ảnh"));
    }
    cb(null, true);
  },
});

/**
 * Middleware: parse 1 file từ field "image" → req.file = { buffer, mimetype, originalname, size }
 */
const uploadFilterInputImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Ảnh vượt quá 15MB" });
        }
        return res.status(400).json({ error: `Lỗi upload: ${err.message}` });
      }
      return res.status(400).json({ error: err.message || "Lỗi upload file" });
    }
    next();
  });
};

module.exports = uploadFilterInputImage;
