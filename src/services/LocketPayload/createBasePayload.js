const crypto = require("crypto");
const { logInfo } = require("../../utils/logEventUtils");
const { createAnalytics } = require("../LocketAnalytics");
const { getYYYYMMDD } = require("../../utils/formatDay");

const getMd5Hash = (str) => {
  return crypto.createHash("md5").update(str).digest("hex");
};

const createIntValue = (value) => ({
  "@type": "type.googleapis.com/google.protobuf.Int64Value",
  value: value.toString(),
});

/**
 * Tạo payload cơ bản cho ảnh hoặc video
 */
const createBasePayload = ({
  mediaUrl,
  thumbnailUrl,
  optionsData,
  isVideo = false,
}) => {
  const { recipients, audience } = optionsData;
  
  logInfo("createBasePayload", "Bắt đầu khởi tạo payload");

  const payload = {
    thumbnail_url: thumbnailUrl || mediaUrl, // nếu ảnh thì chính là mediaUrl
    md5: getMd5Hash(mediaUrl),
    show_personally: false,
    analytics: createAnalytics(),
    overlays: [],
  };

  const isGroup = !!optionsData?.group?.id;

  if (audience === "private") {
    payload.sent_to_self_only = true;
    payload.sent_to_all = false;
  } else if (isGroup) {
    payload.sent_to_self_only = false;
    payload.sent_to_all = false;
  } else {
    payload.sent_to_self_only = false;
    payload.sent_to_all = true;
    payload.recipients = Array.isArray(recipients)
      ? recipients
      : recipients
        ? [recipients]
        : [];
  }

  // Nếu là video thì thêm các trường riêng
  if (isVideo) {
    payload.video_url = mediaUrl;
  }

  // Khôi phục streak: ghi vào ngày trong quá khứ (ưu tiên hơn streakData)
  if (optionsData?.restoreStreakDate?.mode === "restore") {
    const restoreDate = optionsData.restoreStreakDate.data;
    logInfo("restoreStreak", "Khôi phục streak cho ngày:", restoreDate);
    payload.restore_streak_for_yyyymmdd = createIntValue(restoreDate);
  }
  // Đăng bình thường: cập nhật streak hôm nay (chỉ khi chưa post hôm nay)
  else if (optionsData?.streakData) {
    logInfo("newStreakDate", "Ghi nhận streak cho ngày", optionsData.streakData);
    payload.update_streak_for_yyyymmdd = createIntValue(optionsData.streakData);
  }

  // Nếu gửi vào nhóm: thêm group field
  if (isGroup) {
    const groupConversationOnly = optionsData.group.groupConversationOnly ?? true;
    payload.group = {
      id: optionsData.group.id,
      group_conversation_only: groupConversationOnly,
    };
    // message_client_token CHỈ khi group_conversation_only = true (Only Chat)
    if (groupConversationOnly && optionsData.group.messageClientToken) {
      payload.group.message_client_token = optionsData.group.messageClientToken;
    }
    logInfo("createBasePayload", `Gửi vào nhóm: ${optionsData.group.id} | group_only: ${groupConversationOnly} | token: ${payload.group.message_client_token ?? "none"}`);
  }

  return payload;
};

/**
 * Tạo payload cho ảnh
 */
const createBaseImagePayload = ({ imageUrl, optionsData }) =>
  createBasePayload({ mediaUrl: imageUrl, optionsData, isVideo: false });

/**
 * Tạo payload cho video (sử dụng chung base)
 */
const createBaseVideoPayload = ({ videoUrl, thumbnailUrl, optionsData }) =>
  createBasePayload({
    mediaUrl: videoUrl,
    thumbnailUrl,
    optionsData,
    isVideo: true,
  });

module.exports = {
  createBasePayload,
  createBaseImagePayload,
  createBaseVideoPayload,
  createIntValue,
};
