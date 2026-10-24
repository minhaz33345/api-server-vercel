const axios = require("axios");
const { logInfo, logError } = require("../../utils/logEventUtils");
const { uploadFilterOutput } = require("./uploadFilterOutput");

// Đổi provider: Kira AI (kiraai.vn) thay vì gọi generateFilteredImage riêng tư
// của Locket thật. Lợi ích: Kira nhận base64 trực tiếp (bỏ được bước
// uploadFilterInput lên Firebase trước), và không còn phải giả fingerprint
// app/thiết bị để gọi API riêng tư của Locket -> hết rủi ro ban tài khoản.
//
// Flow mới:
//   1. Gửi ảnh gốc (base64) + prompt -> POST kiraai.vn/api/v1/images/generations
//   2. Kira trả thẳng ảnh đã sửa (base64 PNG) trong data[0].b64_json
//   3. Upload buffer đó lên Firebase Storage (bucket locket-filters/filter_outputs/)
//      y như ảnh thường -> có URL để FE hiển thị / gửi moment
const KIRA_API_URL = "https://kiraai.vn/api/v1/images/generations";
// kira-3.0-image là model preview (proxy qua Gemini 3.1 flash image preview
// bên Google) — từng gặp lỗi "Publisher model ... was not found or your
// project does not have access to it" do key/dự án Kira chưa có quyền truy
// cập model preview đó. kira-2.0-image là bản Kira ghi là "ổn định lâu dài",
// dùng làm mặc định; vẫn thử 3.0 trước vì nhanh hơn, lỗi thì fallback tự động.
const KIRA_MODEL_PRIMARY = "kira-3.0-image";
const KIRA_MODEL_FALLBACK = "kira-2.0-image";

/**
 * Sinh ảnh filter bằng Kira AI (image-to-image) từ 1 ảnh gốc + prompt.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.idToken - vẫn cần để upload Firebase Storage (bucket locket-filters)
 * @param {Buffer} params.imageBuffer - ảnh gốc (JPEG)
 * @param {string} params.prompt - prompt của filter đã chọn
 * @param {string} [params.aspectRatio] - "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
 * @param {string} [params.filterType] - filter_type từ catalog, chỉ để trả ngược lại cho FE
 * @param {string} [params.filterLabel] - filter_label từ catalog, chỉ để trả ngược lại cho FE
 * @returns {Promise<{ output_url: string, filter_type?: string, filter_label?: string }>}
 */
const generateFilteredImage = async ({
  userId,
  idToken,
  imageBuffer,
  prompt,
  aspectRatio = "3:4",
  filterType,
  filterLabel,
}) => {
  try {
    logInfo("generateFilteredImage(kira)", "Start");

    if (!prompt || typeof prompt !== "string") throw new Error("Missing prompt");
    if (!Buffer.isBuffer(imageBuffer)) throw new Error("Missing imageBuffer");

    const apiKey = process.env.KIRA_API_KEY;
    if (!apiKey) throw new Error("Thiếu KIRA_API_KEY trong biến môi trường");

    const callKira = (model) =>
      axios.post(
        KIRA_API_URL,
        {
          model,
          prompt,
          aspect_ratio: aspectRatio,
          reference_images: [
            {
              mime_type: "image/jpeg",
              data: imageBuffer.toString("base64"),
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 45000,
        }
      );

    let response;
    try {
      response = await callKira(KIRA_MODEL_PRIMARY);
    } catch (primaryError) {
      logError(
        "generateFilteredImage(kira)",
        `${KIRA_MODEL_PRIMARY} lỗi, fallback sang ${KIRA_MODEL_FALLBACK}: ${
          primaryError.response?.data?.error?.message || primaryError.message
        }`
      );
      response = await callKira(KIRA_MODEL_FALLBACK);
    }

    const b64 = response.data?.data?.[0]?.b64_json;
    if (!b64) throw new Error("Kira AI không trả về ảnh");

    const outputBuffer = Buffer.from(b64, "base64");

    // Up lên Firebase Storage y như ảnh bình thường -> có URL cho FE
    const outputUrl = await uploadFilterOutput(userId, idToken, outputBuffer);

    logInfo("generateFilteredImage(kira)", "End");
    return {
      output_url: outputUrl,
      ...(filterType ? { filter_type: filterType } : {}),
      ...(filterLabel ? { filter_label: filterLabel } : {}),
    };
  } catch (error) {
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.response?.statusText ||
      error.message;
    logError("generateFilteredImage(kira)", typeof message === "string" ? message : JSON.stringify(message));
    throw new Error(typeof message === "string" ? message : "Lỗi tạo ảnh filter");
  }
};

module.exports = { generateFilteredImage };
