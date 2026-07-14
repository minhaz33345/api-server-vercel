const axios = require("axios");

// ── device_token từ Apple DeviceCheck (sống 1-2 ngày) ──
// Cập nhật lại khi hết hạn qua endpoint POST /admin/appcheck/device-token
let DEVICE_TOKEN =
  "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";

// ── Cache AppCheck JWT (in-memory) ──
let cachedToken = null;
let cachedExp   = null;
let isRefreshing = false;
let refreshPromise = null;

const EXCHANGE_URL =
  "https://firebaseappcheck.googleapis.com/v1/projects/locket-4252a/apps/1:641029076083:ios:cc8eb46290d69b234fa606:exchangeDeviceCheckToken";

// ── Parse exp từ JWT ──
function parseExp(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded.exp || null;
  } catch {
    return null;
  }
}

// ── Kiểm tra token còn < 5 phút thì refresh ──
function isExpired() {
  if (!cachedToken || !cachedExp) return true;
  const now      = Math.floor(Date.now() / 1000);
  const timeLeft = cachedExp - now;
  return timeLeft < 300;
}

// ── Load token đã lưu từ DB khi khởi động ──
// Giúp server restart không cần ngay lập tức gọi exchange (tránh phụ thuộc DEVICE_TOKEN liên tục)
function loadPersistedToken() {
  try {
    const { getSetting } = require("../../db");
    const saved = getSetting("appcheck_jwt");
    if (!saved) return;
    const exp = parseExp(saved);
    if (!exp) return;
    const now = Math.floor(Date.now() / 1000);
    // Chỉ dùng nếu còn ít nhất 5 phút
    if (exp - now > 300) {
      cachedToken = saved;
      cachedExp   = exp;
      console.log(`🛡️ AppCheck: loaded persisted token, còn ${exp - now}s`);
    }
  } catch (err) {
    console.warn("🛡️ AppCheck: không load được persisted token:", err.message);
  }
}

// ── Gọi Firebase đổi device_token lấy AppCheck JWT ──
async function fetchNewToken() {
  const res = await axios.post(
    EXCHANGE_URL,
    { limited_use: false, device_token: DEVICE_TOKEN },
    {
      headers: {
        "Content-Type":           "application/json",
        Accept:                   "*/*",
        "Accept-Encoding":        "gzip, deflate, br",
        "Accept-Language":        "vi-VN,vi;q=0.9",
        "X-Ios-Bundle-Identifier":"com.locket.Locket",
        "X-Goog-Api-Key":         "AIzaSyCQngaaXQIfJaH0aS2l7REgIjD7nL431So",
        "User-Agent":             "Locket/1 CFNetwork/3860.400.51 Darwin/25.3.0",
        baggage: "sentry-environment=production,sentry-public_key=78fa64317f434fd89d9cc728dd168f50,sentry-release=com.locket.Locket%402.8.0%2B1,sentry-trace_id=6014f8d90c2a4b14b519dfd605c17033",
        "sentry-trace":           "6014f8d90c2a4b14b519dfd605c17033-c546794503be4253-0",
        Connection:               "keep-alive",
      },
      timeout: 10000,
    }
  );

  const token = res.data?.token;
  if (!token) throw new Error("Không nhận được AppCheck token từ Firebase");

  console.log("✅ AppCheck token mới, TTL:", res.data?.ttl);
  return token;
}

// ── Lưu token mới vào DB ──
function persistToken(token) {
  try {
    const { setSetting } = require("../../db");
    setSetting("appcheck_jwt", token);
  } catch (err) {
    console.warn("🛡️ AppCheck: không lưu được token vào DB:", err.message);
  }
}

// ── Hàm chính: trả về token hợp lệ, tự refresh khi gần hết hạn ──
async function getAppCheckToken() {
  if (!isExpired()) return cachedToken;

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = fetchNewToken()
      .then((token) => {
        cachedToken = token;
        cachedExp   = parseExp(token);
        persistToken(token); // Lưu vào DB để dùng sau khi restart
        return token;
      })
      .catch((err) => {
        console.error("❌ Không refresh được AppCheck token:", err.message);
        // Trả về token cũ (có thể hơi cũ) thay vì null để tránh break toàn bộ API
        return cachedToken;
      })
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// ── Admin: cập nhật device_token mới khi bắt được từ proxy ──
function setDeviceToken(newDeviceToken) {
  DEVICE_TOKEN = newDeviceToken;
  cachedToken  = null;
  cachedExp    = null;
  console.log("🔄 device_token mới đã được set, sẽ refresh AppCheck lần tới");
}

// ── Admin: set trực tiếp AppCheck JWT (bypass DEVICE_TOKEN) ──
// Dùng khi bắt được JWT từ traffic Charles Proxy hoặc các nguồn khác
function setAppCheckToken(jwt) {
  const exp = parseExp(jwt);
  if (!exp) throw new Error("JWT không hợp lệ (không parse được exp)");
  const now = Math.floor(Date.now() / 1000);
  if (exp <= now) throw new Error("JWT đã hết hạn");
  cachedToken = jwt;
  cachedExp   = exp;
  persistToken(jwt);
  console.log(`🛡️ AppCheck JWT set thủ công, còn ${exp - now}s`);
}

// Load persisted token ngay khi module được require
loadPersistedToken();

module.exports = { getAppCheckToken, setDeviceToken, setAppCheckToken };
