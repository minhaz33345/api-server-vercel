const { instanceLocketV2 } = require("../../libs");
const { logInfo, logError, logBanner } = require("../../utils/logEventUtils");
const { uploadImageToFirebaseStorage } = require("../FirestorageService");
const { creImagePayload } = require("../LocketPayload");

// Helper: build postData từ type
const buildImagePostData = (type, imageUrl, optionsData) => {
  switch (type) {
    case "default":
      return creImagePayload.imagePostPayloadDefault({ imageUrl, optionsData });

    case "decorative":
      return creImagePayload.imagePostPayloadDecorative({ imageUrl, optionsData });

    // custome + special: cùng cấu trúc gradient color_top/color_bottom
    // overlay_id = "caption:miss_you" (iOS nhận ra)
    case "custome":
    case "special":
      return creImagePayload.imagePostPayloadCustome({ imageUrl, optionsData });

    // image_icon / caption_icon: có icon URL
    // overlay_id = "caption:ootd" (iOS nhận ra)
    case "image_icon":
    case "caption_icon":
      return creImagePayload.imagePostPayloadIcon({ imageUrl, optionsData });

    // image_gif / caption_gif: GIF URL + màu gradient
    // overlay_id = "caption:miss_you" (iOS nhận ra)
    case "image_gif":
    case "caption_gif":
      return creImagePayload.imagePostPayloadGif({ imageUrl, optionsData });

    // Dynamic captions — mỗi loại có handler riêng
    case "streak":
      return creImagePayload.imagePostPayloadStreak({ imageUrl, optionsData });
    case "locket_count":
      return creImagePayload.imagePostPayloadLocketCount({ imageUrl, optionsData });
    case "time":
      return creImagePayload.imagePostPayloadTime({ imageUrl, optionsData });
    case "weather":
      return creImagePayload.imagePostPayloadWeather({ imageUrl, optionsData });
    case "music":
      return creImagePayload.imagePostPayloadMusic({ imageUrl, optionsData });
    case "review":
      return creImagePayload.imagePostPayloadReview({ imageUrl, optionsData });
    case "heart":
      return creImagePayload.imagePostPayloadHeart({ imageUrl, optionsData });
    case "battery":
      return creImagePayload.imagePostPayloadBattery({ imageUrl, optionsData });
    case "location":
      return creImagePayload.imagePostPayloadLocation({ imageUrl, optionsData });

    case "color_palette":
      return creImagePayload.imagePostPayloadColorPalette({ imageUrl, optionsData });

    case "poll":
      return creImagePayload.imagePostPayloadPoll({ imageUrl, optionsData });

    default:
      throw new Error(`Không hỗ trợ type: ${type}`);
  }
};

// ===== V1: nhận image file =====
const postImageToLocket = async ({ userId, idToken, image, optionsData }) => {
  try {
    logInfo("postImage", "Start");

    if (!optionsData?.type) throw new Error("Missing optionsData.type");

    const imageUrl = await uploadImageToFirebaseStorage(userId, idToken, image);
    const { type } = optionsData;
    logBanner(`Type đang sử dụng: ${type}`);

    const postData = buildImagePostData(type, imageUrl, optionsData);

    const postResponse = await instanceLocketV2.post("postMomentV2", postData, {
      meta: { idToken },
    });

    logInfo("postImage", "End");
    return postResponse.data;
  } catch (error) {
    const message =
      error.response?.data?.error || error.response?.statusText || error.message;
    logError("postImage", message);
    throw new Error(message);
  }
};

// ===== V2: nhận imageBuffer =====
const postImageToLocketV2 = async ({ userId, idToken, imageBuffer, optionsData }) => {
  try {
    logInfo("postImage", "Start");

    if (!optionsData?.type) throw new Error("Missing optionsData.type");

    const imageUrl = await uploadImageToFirebaseStorage(userId, idToken, imageBuffer);
    const { type } = optionsData;
    logBanner(`Type đang sử dụng: ${type}`);

    const postData = buildImagePostData(type, imageUrl, optionsData);
    console.log("🔍 [postImageV2] postData gửi Locket:", JSON.stringify(postData, null, 2));

    const postResponse = await instanceLocketV2.post("postMomentV2", postData, {
      meta: { idToken },
    });

    console.log("🔍 [postImageV2] Locket response:", JSON.stringify(postResponse.data, null, 2));
    logInfo("postImage", "End");
    return postResponse.data;
  } catch (error) {
    const message =
      error.response?.data?.error || error.response?.statusText || error.message;
    logError("postImage", message);
    throw new Error(message);
  }
};

module.exports = {
  postImageToLocket,
  postImageToLocketV2,
};
