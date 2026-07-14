const { createBaseImagePayload, createIntValue } = require("./createBasePayload");
const { getSfSymbol, getWkCondition, celsiusToFahrenheit } = require("../../utils/weatherUtils");

const ML4 = createIntValue(4); // max_lines: 4 — dùng lại cho mọi overlay
const ML1 = createIntValue(1); // max_lines: 1
const ML2 = createIntValue(2); // max_lines: 2

// ===== DEFAULT =====
exports.imagePostPayloadDefault = ({ imageUrl, optionsData }) => {
  const { caption } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  if (caption?.trim()) {
    data.caption = caption;
    data.overlays.push({
      data: {
        text: caption,
        text_color: "#FFFFFFE6",
        type: "standard",
        max_lines: ML4,
        background: { colors: [], material_blur: "ultra_thin" },
      },
      alt_text: caption,
      overlay_id: "caption:standard",
      overlay_type: "caption",
    });
  }
  return { data };
};

// ===== DECORATIVE =====
// icon thường null trong themes.json → chỉ gửi nếu có giá trị
exports.imagePostPayloadDecorative = ({ imageUrl, optionsData }) => {
  const { overlay_id, caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption || "",
      text_color: text_color || "#FFFFFF",
      type: "static_content",
      ...(icon && { icon: { type: "emoji", data: icon } }),
      max_lines: ML4,
      background: {
        material_blur: "ultra_thin",
        colors: [color_top, color_bottom].filter(Boolean),
      },
    },
    alt_text: caption || "",
    overlay_id: overlay_id
      ? (overlay_id.startsWith("caption:") ? overlay_id : `caption:${overlay_id}`)
      : "caption:miss_you",
    overlay_type: "caption",
  });

  return { data };
};

// ===== CUSTOME / SPECIAL (gradient màu) =====
// overlay_id dùng "caption:miss_you" — iOS nhận ra overlay này
exports.imagePostPayloadCustome = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: caption || "",
      text_color: text_color || "#FFFFFF",
      type: "static_content",
      ...(icon && { icon: { type: "emoji", data: icon } }),
      max_lines: ML4,
      background: {
        material_blur: "ultra_thin",
        colors: [color_top, color_bottom].filter(Boolean),
      },
    },
    alt_text: caption || "",
    overlay_id: "caption:miss_you",
    overlay_type: "caption",
  });

  return { data };
};

// ===== ICON (image_icon / caption_icon) =====
// overlay_id dùng "caption:ootd" — iOS nhận ra overlay này
exports.imagePostPayloadIcon = ({ imageUrl, optionsData }) => {
  const { caption, text_color, color_top, color_bottom, icon } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const iconUrl = typeof icon === "string" ? icon : (icon?.data || "");

  data.overlays.push({
    data: {
      text: caption || "",
      text_color: text_color || "#FFFFFF",
      type: "static_content",
      icon: { type: "image", data: iconUrl, source: "url" },
      max_lines: ML4,
      background: {
        material_blur: "ultra_thin",
        colors: [color_top, color_bottom].filter(Boolean),
      },
    },
    alt_text: caption || "",
    overlay_id: "caption:ootd",
    overlay_type: "caption",
  });

  return { data };
};

// ===== GIF / Kanade (image_gif / caption_gif) =====
// icon từ client: string URL hoặc object { data, source }
// iOS gRPC cần: { type: "image", data: url, source: "url" }
// overlay_id dùng "caption:miss_you" — iOS nhận ra
exports.imagePostPayloadGif = ({ imageUrl, optionsData }) => {
  const { caption, text, text_color, color_top, color_bottom, icon, overlay_id, payload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";

  const gifUrl = typeof icon === "string" ? icon : (icon?.data || payload?.icon_url || "");
  const colors = [color_top, color_bottom].filter(Boolean);

  // Dùng overlay_id từ optionsData nếu hợp lệ, fallback về miss_you
  const resolvedOverlayId = overlay_id
    ? (overlay_id.startsWith("caption:") ? overlay_id : `caption:${overlay_id}`)
    : "caption:miss_you";

  data.overlays.push({
    data: {
      text: displayText,
      text_color: text_color || payload?.color || "#FFFFFF",
      type: "time",
      max_lines: ML4,
      icon: { type: "image", data: gifUrl, source: "url", scale: 1.5 },
      background: colors.length
        ? { colors }
        : { material_blur: "ultra_thin", colors: [] },
    },
    alt_text: displayText,
    overlay_id: resolvedOverlayId,
    overlay_type: "caption",
  });

  return { data };
};

// ===== STREAK =====
exports.imagePostPayloadStreak = ({ imageUrl, optionsData }) => {
  const { text, caption } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = String(text || caption || "0");

  data.overlays.push({
    data: {
      text: displayText,
      text_color: "#00000099",
      type: "streak",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "flame.fill", color: "#00000099" },
      background: { colors: ["#FFD25F", "#EAA900"] },
    },
    alt_text: displayText,
    overlay_id: "caption:streak",
    overlay_type: "caption",
  });

  return { data };
};

// ===== LOCKET COUNT =====
exports.imagePostPayloadLocketCount = ({ imageUrl, optionsData }) => {
  const { text, caption } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = String(text || caption || "0");

  data.overlays.push({
    data: {
      text: displayText,
      text_color: "#00000099",
      type: "locket_count",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "suit.heart.fill", color: "#00000099" },
      background: { colors: ["#FFD25F", "#EAA900"] },
    },
    alt_text: displayText,
    overlay_id: "locket_count",
    overlay_type: "caption",
  });

  return { data };
};

// ===== TIME =====
exports.imagePostPayloadTime = ({ imageUrl, optionsData }) => {
  const { text, caption, text_color } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";

  data.overlays.push({
    data: {
      text: displayText,
      text_color: text_color || "#FFFFFFE6",
      type: "static_content",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "clock.fill", color: "#FFFFFFCC" },
      background: { material_blur: "ultra_thin", colors: [] },
    },
    alt_text: displayText,
    overlay_id: "caption:time",
    overlay_type: "caption",
  });

  return { data };
};

// ===== WEATHER =====
exports.imagePostPayloadWeather = ({ imageUrl, optionsData }) => {
  const { payload: wp, color_top, color_bottom } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  // wp.wk_condition từ frontend là WMO integer (vd: 55 = drizzle dày)
  const wmoCode    = wp?.wk_condition ?? 0;
  const isDaylight = wp?.is_daylight ?? true;
  const tempC      = wp?.temperature ?? wp?.temp_c_rounded ?? 0;
  const displayText = `${Math.round(tempC)}°C`;

  data.overlays.push({
    data: {
      text:       displayText,
      text_color: "#FFFFFF",
      type:       "weather",
      max_lines:  ML1,
      icon: {
        type:  "sf_symbol",
        data:  getSfSymbol(wmoCode, isDaylight),
        color: "#FFFFFF",
      },
      background: {
        colors: [color_top, color_bottom].filter(Boolean),
      },
      payload: {
        temperature:  celsiusToFahrenheit(tempC),
        wk_condition: getWkCondition(wmoCode),
        is_daylight:  isDaylight,
        // cloud_cover: Open-Meteo trả 0–100%, convert về 0–1 int như iOS WeatherKit
        cloud_cover:  createIntValue(Math.round((wp?.cloud_cover ?? 0) / 100)),
      },
    },
    alt_text:     displayText,
    overlay_id:   "caption:weather",
    overlay_type: "caption",
  });

  return { data };
};

// ===== MUSIC =====
exports.imagePostPayloadMusic = ({ imageUrl, optionsData }) => {
  const { caption, text, icon, payload: musicPayload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";
  const albumArt = musicPayload?.image || (typeof icon === "object" ? icon?.data : icon) || "";

  data.overlays.push({
    data: {
      max_lines: ML1,
      payload: musicPayload ? {
        // Đọc cả snake_case (backend resolveTrack) lẫn camelCase (client fallback)
        song_title:  musicPayload.song_title  || musicPayload.title      || "",
        artist:      musicPayload.artist      || "",
        isrc:        musicPayload.isrc        || "",
        preview_url: musicPayload.preview_url || musicPayload.previewUrl || "",
        spotify_url: musicPayload.spotify_url || musicPayload.spotifyUrl || "",
      } : undefined,
      text: displayText,
      background: { material_blur: "ultra_thin", colors: ["#565A663D", "#565A663D"] },
      type: "music",
      icon: { type: "image", data: albumArt, source: "url" },
      text_color: "#FFFFFFE6",
    },
    alt_text: displayText,
    overlay_id: "caption:music",
    overlay_type: "caption",
  });

  return { data };
};

// ===== REVIEW =====
exports.imagePostPayloadReview = ({ imageUrl, optionsData }) => {
  const { caption, text, payload: reviewPayload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const comment = reviewPayload?.comment || text || caption || "";
  const rating = reviewPayload?.rating ?? 5;
  const ratingDisplay = Number(rating).toFixed(1);   // "5.0"
  const ratingInt = Math.round(rating);              // 5
  // text hiển thị: ★5.0 - "comment" (hoặc chỉ ★5.0 nếu không có comment)
  const starText = comment
    ? `★${ratingDisplay} - "${comment}"`
    : `★${ratingDisplay}`;
 
  data.overlays.push({
    data: {
      text: starText,
      text_color: "#FFFFFFE6",
      type: "review",
      max_lines: ML1,
      payload: {
        comment,
        rating: createIntValue(ratingInt),
      },
      background: { material_blur: "regular", colors: [] },
    },
    alt_text: starText,
    overlay_id: "caption:review",
    overlay_type: "caption",
  });
  return { data };
};

// ===== HEART =====
exports.imagePostPayloadHeart = ({ imageUrl, optionsData }) => {
  const { text_color } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });

  data.overlays.push({
    data: {
      text: "",
      text_color: text_color || "#FFFFFFE6",
      type: "static_content",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "heart.fill", color: "#FF0000CC" },
      background: { material_blur: "ultra_thin", colors: [] },
    },
    alt_text: "❤️",
    overlay_id: "caption:heart",
    overlay_type: "caption",
  });

  return { data };
};

// ===== BATTERY =====
exports.imagePostPayloadBattery = ({ imageUrl, optionsData }) => {
  const { caption, text } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || `${caption}%`;

  data.overlays.push({
    data: {
      text: displayText,
      text_color: "#FFFFFFE6",
      type: "static_content",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "battery.100", color: "#FFFFFFCC" },
      background: { material_blur: "ultra_thin", colors: [] },
    },
    alt_text: displayText,
    overlay_id: "caption:battery",
    overlay_type: "caption",
  });

  return { data };
};

// ===== LOCATION =====
exports.imagePostPayloadLocation = ({ imageUrl, optionsData }) => {
  const { caption, text } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";

  data.overlays.push({
    data: {
      text: displayText,
      text_color: "#FFFFFFE6",
      type: "static_content",
      max_lines: ML1,
      icon: { type: "sf_symbol", data: "location.fill", color: "#FFFFFFCC" },
      background: { material_blur: "ultra_thin", colors: [] },
    },
    alt_text: displayText,
    overlay_id: "caption:location",
    overlay_type: "caption",
  });

  return { data };
};

// ===== COLOR PALETTE =====
// Gửi palette màu lấy từ ảnh lên Locket
exports.imagePostPayloadColorPalette = ({ imageUrl, optionsData }) => {
  const { text, caption, text_color, payload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";
  const paletteColors = payload?.colors || [];

  data.overlays.push({
    data: {
      text: displayText,
      text_color: text_color || "#FFFFFFE6",
      type: "color_palette",
      max_lines: ML1,
      background: { material_blur: "ultra_thin", colors: [] },
      payload: { colors: paletteColors },
    },
    alt_text: displayText,
    overlay_id: "caption:color_palette",
    overlay_type: "caption",
  });

  return { data };
};

// ===== POLL =====
// Gửi bình chọn (poll) với 2 emoji lên Locket
exports.imagePostPayloadPoll = ({ imageUrl, optionsData }) => {
  const { text, caption, text_color, background, payload } = optionsData;
  const data = createBaseImagePayload({ imageUrl, optionsData });
  const displayText = text || caption || "";
  const bgColors = background?.colors?.length
    ? background.colors
    : ["#685AF7", "#685AF7"];

  data.overlays.push({
    data: {
      text: displayText,
      text_color: text_color || "#FFFFFFF0",
      type: "poll",
      max_lines: ML1,
      background: { colors: bgColors },
      payload: {
        left_emoji: payload?.left_emoji || "👍",
        right_emoji: payload?.right_emoji || "👎",
      },
    },
    alt_text: displayText,
    overlay_id: "caption:poll",
    overlay_type: "caption",
  });

  return { data };
};
