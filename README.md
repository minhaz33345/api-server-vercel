# Locket Minh API — bản Vercel-lite

Bản rút gọn của `apps/self-hosted/api`, đóng gói lại để deploy serverless lên
**Vercel**. Chỉ chứa đúng phạm vi được yêu cầu: **auth, friend, upload ảnh,
xem moment**.

## Đã giữ lại

| Nhóm | Endpoint |
|---|---|
| Auth | `POST /locket/login`, `GET /locket/logout`, `POST /locket/refresh-token` |
| User | `POST /locket/getInfoUser`, `POST /locket/getStreakInfo`, `POST /locket/updateProfileInfo` (avatar) |
| Friend | `getAllFriendsV2`, `getIncomingFriendRequests(V2)`, `getOutgoingFriendRequests(V2)`, `searchByUsername`, `searchByInviteToken`, `getUserByUsername`, `fetchUserV2`, `sendFriendRequest(V2)`, `sendCelebrityRequestV2`, `acceptFriendRequest`, `deleteFriendRequest` |
| Moment (ảnh) | `POST /locket/postMomentV2` (chỉ `mediaInfo.type: "image"`), `getMomentV2`, `getInfoMomentV2`, `countEntries` |

## Đã bỏ (và lý do không đưa lên Vercel được)

Backend gốc (`apps/self-hosted/api`) là 1 server sống liên tục (Docker/VPS),
dùng cho các tính năng không phù hợp với serverless:

- **Chat realtime + group chat** (`socket.io`) — Vercel function không giữ
  kết nối WebSocket kiểu long-lived này.
- **Push notification watcher** (`bootWatchers`, stream gRPC Firestore chạy
  nền vĩnh viễn) — serverless function chỉ sống trong 1 request rồi tắt.
- **Admin panel + SQLite** (`better-sqlite3`, whitelist đăng nhập, CORS
  IP-guard, log truy cập) — filesystem của Vercel là read-only/ephemeral,
  ghi SQLite sẽ mất dữ liệu giữa các lần gọi.
- **Upload/post video** (ffmpeg qua `fluent-ffmpeg` + `ffmpeg-static`) —
  binary lớn + xử lý lâu, dễ vượt giới hạn thời gian/kích thước function.
  Gọi `postMomentV2` với `mediaInfo.type: "video"` sẽ trả `501` kèm thông báo
  rõ ràng thay vì lỗi khó hiểu.
- Payment, admin, music, weather-proxy, GitHub webhook auto-deploy: không
  nằm trong phạm vi yêu cầu (auth/friend/upload ảnh/moment).

➡️ Nếu sau này cần chat realtime, push, hoặc video, vẫn nên chạy
`apps/self-hosted/api` đầy đủ trên VPS/Railway/Fly.io/Docker — nơi hỗ trợ
process chạy liên tục + đĩa ghi được.

## Về CORS (khác bản gốc)

Bản gốc quản lý whitelist domain/IP qua admin panel + SQLite (`corsGuard.js`).
Bản này dùng biến môi trường `ALLOWED_ORIGINS` (danh sách domain cách nhau
bằng dấu phẩy) trong `.env` / Vercel Environment Variables. Để trống hoặc
`*` = cho phép mọi origin (không khuyến khích khi lên production thật).

## Về upload ảnh (`postMomentV2`)

Route này **không nhận file multipart trực tiếp** — nó nhận JSON:

```json
{
  "mediaInfo": { "type": "image", "url": "https://.../anh.jpg", "name": "anh.jpg", "size": 123456 },
  "optionsData": { "type": "default", "caption": "..." }
}
```

Client cần tự upload file lên nơi lưu trữ trước (vd: service `storage` cùng
repo, hoặc Firebase Storage/R2 riêng) để có `url`, rồi mới gọi endpoint này.
API sẽ tải ảnh về, resize/nén (sharp), rồi đăng lên Locket. Đây đúng là luồng
V2 mà bản self-hosted gốc cũng dùng (không phải mình lược bớt tính năng).

Riêng `POST /locket/updateProfileInfo` (đổi avatar) NHẬN multipart trực tiếp
(field `avatar`), vì đã dùng `multer.memoryStorage()` từ đầu — an toàn cho
serverless.

## Deploy lên Vercel

1. Copy `.env.example` → điền giá trị thật, add vào **Vercel > Settings >
   Environment Variables** (đừng commit `.env` thật vào git).
2. Từ thư mục này:
   ```bash
   npm install -g vercel   # nếu chưa có
   vercel                  # link project lần đầu
   vercel --prod           # deploy production
   ```
   Hoặc import repo trên vercel.com, set **Root Directory** = `apps/api-vercel`.
3. Test: `GET https://<project>.vercel.app/health` → `{ "status": "ok" }`.

## Chạy local để test trước khi deploy

```bash
npm install
cp .env.example .env.development
npm run dev   # nodemon, http://localhost:5001
```
