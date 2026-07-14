const { checkTokenValid } = require("../utils/checkTokenValid");
const { logInfo, logSuccess, logError } = require("../utils/logEventUtils");

/**
 * Decode JWT payload an toàn (hỗ trợ base64url)
 */
const decodeJwtPayload = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    // Convert base64url -> base64
    let payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    
    // Thêm padding nếu thiếu
    while (payloadBase64.length % 4 !== 0) {
      payloadBase64 += "=";
    }

    const decoded = Buffer.from(payloadBase64, "base64").toString("utf-8");
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Decode JWT failed: ${error.message}`);
  }
};

const verifyIdToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check header
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logInfo("verifyIdToken", "❌ Missing or invalid Authorization header");
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Missing Bearer token",
    });
  }

  const idToken = authHeader.split(" ")[1];

  if (!idToken) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Token is empty",
    });
  }

  try {
    // 2. Kiểm tra token hợp lệ
    const { valid, message } = checkTokenValid(idToken);
    if (!valid) {
      logInfo("verifyIdToken", `❌ Token validation failed: ${message}`);
      return res.status(401).json({
        success: false,
        message: message || "Invalid token",
      });
    }

    // 3. Decode payload (an toàn với base64url)
    const decodedPayload = decodeJwtPayload(idToken);

    // 4. Kiểm tra token hết hạn
    const now = Math.floor(Date.now() / 1000);
    if (decodedPayload.exp && decodedPayload.exp < now) {
      logInfo("verifyIdToken", `❌ Token expired`);
      return res.status(401).json({
        success: false,
        message: "Token đã hết hạn, vui lòng đăng nhập lại",
        code: "TOKEN_EXPIRED",
      });
    }

    // 5. Kiểm tra có user_id/uid không
    const userId = decodedPayload.user_id || decodedPayload.uid || decodedPayload.sub;
    if (!userId) {
      logError("verifyIdToken", "❌ Token missing user_id/uid");
      return res.status(401).json({
        success: false,
        message: "Token không chứa thông tin người dùng",
      });
    }

    // 6. Gán vào req.user
    req.user = {
      idToken,
      localId: userId,
      uid: userId,
      email: decodedPayload?.email || null,
      phone: decodedPayload?.phone_number || null,
      name: decodedPayload?.name || null,
      picture: decodedPayload?.picture || null,
      exp: decodedPayload.exp,
      iat: decodedPayload.iat,
    };

    logSuccess(
      "verifyIdToken",
      `✅ Authenticated: ${req.user.email || req.user.phone || userId}`
    );

    next();
  } catch (error) {
    logError("verifyIdToken", `❌ Token error: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: "Token không hợp lệ hoặc đã hết hạn",
      error: error.message,
    });
  }
};

module.exports = {
  verifyIdToken,
};