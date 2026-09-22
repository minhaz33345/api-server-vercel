const axios = require("axios");
const { firebase } = require("../../config/app.config");
const constants = require("../../utils/constants");
const { getSetting, setSetting } = require("../../libs/appcheckStore");

// ── device_token từ Apple DeviceCheck (sống 1-2 ngày) ──
// KHÔNG hardcode giá trị thật vào source — repo này public trên GitHub.
// Seed ban đầu (nếu có) đọc từ env; giá trị sống thật được set qua
// POST /admin/appcheck/device-token và lưu ở Redis (xem appcheckStore.js).
let DEVICE_TOKEN = process.env.APPCHECK_DEVICE_TOKEN_SEED || null;

// ── Cache AppCheck JWT — in-memory, riêng theo từng instance serverless ──
let cachedToken = null;
let cachedExp = null;
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
  const now = Math.floor(Date.now() / 1000);
  return cachedExp - now < 300;
}

// ── Load device_token + JWT đã lưu từ Redis khi cold start ──
// Chạy đúng 1 lần mỗi instance, cache lại promise để các request đến
// cùng lúc trong 1 instance chờ chung 1 lần đọc thay vì đọc Redis N lần.
let readyPromise = null;
function ensureLoaded() {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        const savedDeviceToken = await getSetting("device_token");
        if (savedDeviceToken) {
          DEVICE_TOKEN = savedDeviceToken;
          console.log("🛡️ AppCheck: loaded persisted device_token từ Redis");
        }
      } catch (err) {
        console.warn("🛡️ AppCheck: không load được persisted device_token:", err.message);
      }

      try {
        const savedJwt = await getSetting("jwt");
        if (savedJwt) {
          const exp = parseExp(savedJwt);
          const now = Math.floor(Date.now() / 1000);
          if (exp && exp - now > 300) {
            cachedToken = savedJwt;
            cachedExp = exp;
            console.log(`🛡️ AppCheck: loaded persisted JWT, còn ${exp - now}s`);
          }
        }
      } catch (err) {
        console.warn("🛡️ AppCheck: không load được persisted JWT:", err.message);
      }
    })();
  }
  return readyPromise;
}

// ── Gọi Firebase đổi device_token lấy AppCheck JWT ──
async function fetchNewToken() {
  if (!DEVICE_TOKEN) {
    throw new Error(
      "Chưa có device_token nào — set APPCHECK_DEVICE_TOKEN_SEED hoặc gọi POST /admin/appcheck/device-token trước."
    );
  }

  const res = await axios.post(
    EXCHANGE_URL,
    { limited_use: false, device_token: DEVICE_TOKEN },
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "vi-VN,vi;q=0.9",
        "X-Ios-Bundle-Identifier": constants.IOS_BUNDLE_ID,
        "X-Goog-Api-Key": firebase.apiKey,
        "User-Agent": "Locket/1 CFNetwork/3860.400.51 Darwin/25.3.0",
        Connection: "keep-alive",
      },
      timeout: 10000,
    }
  );

  const token = res.data?.token;
  if (!token) throw new Error("Không nhận được AppCheck token từ Firebase");

  console.log("✅ AppCheck token mới, TTL:", res.data?.ttl);
  return token;
}

// ── Hàm chính: trả về token hợp lệ, tự refresh khi gần hết hạn ──
async function getAppCheckToken() {
  await ensureLoaded();
  if (!isExpired()) return cachedToken;

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = fetchNewToken()
      .then(async (token) => {
        cachedToken = token;
        cachedExp = parseExp(token);
        await setSetting("jwt", token); // lưu Redis để sống sót qua cold start
        return token;
      })
      .catch((err) => {
        console.error("❌ Không refresh được AppCheck token:", err.message);
        // Trả token cũ (nếu có) thay vì null để không sập toàn bộ API
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
// Trả về true nếu đã lưu Redis thành công, false nếu chỉ sống trong
// instance hiện tại (REDIS_URL chưa cấu hình).
async function setDeviceToken(newDeviceToken) {
  DEVICE_TOKEN = newDeviceToken;
  cachedToken = null;
  cachedExp = null;
  // Reset lock để tránh trường hợp isRefreshing=true bị stuck khi exchange
  // cũ đang fail nhưng admin đã kịp update token mới.
  isRefreshing = false;
  refreshPromise = null;

  const persisted = await setSetting("device_token", newDeviceToken);
  if (!persisted) {
    console.warn(
      "⚠️ AppCheck: device_token chỉ sống trong instance hiện tại — sẽ mất khi cold start (REDIS_URL chưa cấu hình)."
    );
  }
  console.log("🔄 device_token mới đã được set, sẽ fetch AppCheck JWT mới ở lần gọi tới");
  return persisted;
}

// ── Admin: xem trạng thái hiện tại để chẩn đoán mà không cần đợi 1 lần upload thật fail ──
async function getStatus() {
  await ensureLoaded();
  const now = Math.floor(Date.now() / 1000);
  return {
    has_cached_token: !!cachedToken,
    token_valid: !isExpired(),
    expires_in_sec: cachedExp ? Math.max(0, cachedExp - now) : null,
    device_token_length: DEVICE_TOKEN?.length || 0,
    device_token_preview: DEVICE_TOKEN ? DEVICE_TOKEN.slice(0, 12) + "…" : null,
    is_refreshing: isRefreshing,
    persistence: process.env.REDIS_URL ? "redis" : "in-memory (KHÔNG sống sót qua cold start)",
  };
}

module.exports = { getAppCheckToken, setDeviceToken, getStatus };
