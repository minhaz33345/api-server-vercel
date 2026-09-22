const { setDeviceToken, getStatus } = require("../services/LocketAppCheck");

/**
 * POST /admin/appcheck/device-token
 * Body: { device_token: "..." }
 * Cập nhật device_token mới (lấy từ Charles Proxy, header X-Firebase-AppCheck
 * khi bắt traffic app Locket) -> AppCheck JWT sẽ tự exchange lại ở lần gọi tới.
 */
const updateDeviceToken = async (req, res, next) => {
  try {
    const { device_token } = req.body;
    if (!device_token || typeof device_token !== "string" || device_token.trim().length < 50) {
      return res.status(400).json({ success: false, message: "device_token không hợp lệ" });
    }

    const persisted = await setDeviceToken(device_token.trim());
    return res.status(200).json({
      success: true,
      message: persisted
        ? "Cập nhật device_token thành công (đã lưu Redis). AppCheck sẽ tự refresh."
        : "Cập nhật device_token thành công, NHƯNG chưa lưu bền vững — REDIS_URL chưa cấu hình nên sẽ mất khi instance cold start.",
      persisted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /admin/appcheck/status
 * Xem trạng thái hiện tại (không ép refresh) để chẩn đoán nhanh.
 */
const getAppCheckStatus = async (req, res, next) => {
  try {
    return res.status(200).json({ success: true, ...(await getStatus()) });
  } catch (error) {
    next(error);
  }
};

module.exports = { updateDeviceToken, getAppCheckStatus };
