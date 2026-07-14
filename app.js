const express = require("express");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const cors = require("cors");

const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

const routes = require("./src/routes/index.js");
const errorHandler = require("./src/helpers/error-handler.js");

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
// Bản gốc dùng corsGuard + SQLite whitelist (admin panel). Bản Vercel-lite
// này KHÔNG có SQLite (filesystem serverless là read-only/ephemeral) nên
// whitelist domain lấy trực tiếp từ biến môi trường ALLOWED_ORIGINS
// (phân tách bằng dấu phẩy), vd: "https://app.example.com,https://example.com"
// Để trống / "*" = cho phép mọi origin (KHÔNG khuyến khích cho production).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // server-to-server / curl / Postman
    if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "x-app-author",
    "x-app-name",
    "x-app-client",
    "x-app-api",
    "x-app-env",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

routes(app);

app.use(errorHandler);

// Khi chạy local (node app.js / npm start) thì listen bình thường.
// Trên Vercel, file này KHÔNG được gọi trực tiếp — Vercel import app qua
// module.exports bên dưới và tự quản lý request/response (xem vercel.json).
if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, () => {
    console.log(`🚀 API (Vercel-lite) đang chạy tại http://localhost:${PORT}`);
  });
}

module.exports = app;
