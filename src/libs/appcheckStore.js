// Thay thế cho db.getSetting/setSetting (SQLite) của bản self-hosted.
// Vercel serverless: filesystem read-only/ephemeral, mỗi cold start có thể
// là 1 instance mới -> phải lưu ở nơi ngoài process (Redis, qua REDIS_URL
// đã có sẵn trong app.config.js nhưng chưa được dùng ở đâu).
// Nếu REDIS_URL chưa cấu hình: fallback im lặng về in-memory, mất state
// mỗi khi instance bị recycle — vẫn chạy được nhưng không bền vững.

let redisClient = null;
let redisInitTried = false;

function getRedis() {
  if (redisInitTried) return redisClient;
  redisInitTried = true;

  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn(
      "⚠️ appcheckStore: REDIS_URL chưa được set — chỉ dùng in-memory, sẽ mất khi cold start."
    );
    return null;
  }

  try {
    const Redis = require("ioredis");
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      connectTimeout: 5000,
      lazyConnect: false,
    });
    redisClient.on("error", (err) => {
      console.warn("⚠️ appcheckStore: Redis lỗi kết nối:", err.message);
    });
    return redisClient;
  } catch (err) {
    console.warn("⚠️ appcheckStore: không khởi tạo được ioredis:", err.message);
    return null;
  }
}

async function getSetting(key) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(`appcheck:${key}`);
  } catch (err) {
    console.warn(`⚠️ appcheckStore: get(${key}) lỗi:`, err.message);
    return null;
  }
}

async function setSetting(key, value) {
  const redis = getRedis();
  if (!redis) return false;
  try {
    await redis.set(`appcheck:${key}`, String(value));
    return true;
  } catch (err) {
    console.warn(`⚠️ appcheckStore: set(${key}) lỗi:`, err.message);
    return false;
  }
}

module.exports = { getSetting, setSetting };
