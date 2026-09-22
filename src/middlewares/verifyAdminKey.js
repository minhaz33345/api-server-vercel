const crypto = require("crypto");

// Bản self-hosted dùng login -> JWT (verifyAdmin.js, có SQLite lưu session).
// Bản Vercel-lite không có DB cho admin -> dùng 1 shared secret tĩnh so
// sánh timing-safe qua header x-api-key (header này đã được whitelist sẵn
// trong CORS ở app.js).
function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

const verifyAdminKey = (req, res, next) => {
  const expected = process.env.ADMIN_API_KEY;
  if (!expected) {
    console.warn("⚠️ ADMIN_API_KEY chưa được set trong env — khoá toàn bộ route admin.");
    return res.status(503).json({ success: false, message: "Admin endpoint chưa được cấu hình" });
  }

  const provided = req.headers["x-api-key"];
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ success: false, message: "x-api-key không hợp lệ" });
  }

  next();
};

module.exports = { verifyAdminKey };
