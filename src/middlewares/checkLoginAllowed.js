const path = require("path");

let db = null;
const getDb = () => {
  if (!db) {
    try { db = require("../db"); }
    catch (err) { console.warn("⚠️ Admin DB không load được:", err.message); db = null; }
  }
  return db;
};

const checkLoginAllowed = (req, res, next) => {
  const adminDb = getDb();
  if (!adminDb) return next();

  const { email, phone } = req.body;
  const identifier = email || phone;

  // 1. Kiểm tra đăng nhập có bật không
  if (!adminDb.isLoginEnabled()) {
    return res.status(403).json({
      success: false,
      message: "Đăng nhập hiện đang tạm khoá. Vui lòng thử lại sau.",
      errorCode: "LOGIN_DISABLED",
    });
  }

  // 2. Kiểm tra whitelist
  const whitelistEnabled = adminDb.getSetting("whitelist_enabled") === "true";
  if (!whitelistEnabled || !identifier) return next();

  // Dùng cùng logic normalize như khi lưu vào DB
  const normalized = adminDb.normalizeValue
    ? adminDb.normalizeValue(identifier)
    : identifier.trim().toLowerCase();

  const row = adminDb.db.prepare(
    "SELECT expires_at FROM allowed_identifiers WHERE value = ?"
  ).get(normalized);

  if (!row) {
    return res.status(403).json({
      success: false,
      message: "Tài khoản này chưa được cấp quyền truy cập.",
      errorCode: "NOT_ALLOWED",
    });
  }

  if (row.expires_at && new Date(row.expires_at) <= new Date()) {
    return res.status(403).json({
      success: false,
      message: "Tài khoản của bạn đã hết hạn. Vui lòng gia hạn để tiếp tục.",
      errorCode: "EXPIRED",
    });
  }

  next();
};

module.exports = { checkLoginAllowed };
