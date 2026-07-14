const { instanceFirestore } = require("../../libs");

const getLocketMoments = async (
  idToken,
  userId,
  pageToken = null,
  userUid = null,
  limit = 60,
) => {
  // Khi KHÔNG lọc theo user → fetch 1 trang bình thường
  if (!userUid) {
    const params = { orderBy: "date desc", pageSize: limit };
    if (pageToken) params.pageToken = pageToken;

    try {
      const response = await instanceFirestore.get(
        `/locket/documents/history/${userId}/entries`,
        { params, meta: { idToken } },
      );
      const documents = response.data.documents || [];
      return {
        moments: documents.map(normalizeMoment).filter(Boolean),
        nextPageToken: response.data.nextPageToken || null,
      };
    } catch (error) {
      console.error("❌ Lỗi khi lấy moments:", error.response?.data || error.message);
      return { moments: [], nextPageToken: null };
    }
  }

  // Khi lọc theo userUid (tab "Bạn" hoặc xem moments của 1 người)
  // → phải loop qua nhiều trang Firestore vì mỗi trang chỉ có vài entry khớp
  const MAX_PAGES = 5; // VPS Singapore → mỗi trang ~300ms → 5 trang ≤ 1.5s
  let collected = [];
  let cursor = pageToken;
  let lastPageToken = null;
  let pageCount = 0;

  try {
    while (collected.length < limit && pageCount < MAX_PAGES) {
      const params = { orderBy: "date desc", pageSize: 60 };
      if (cursor) params.pageToken = cursor;

      const response = await instanceFirestore.get(
        `/locket/documents/history/${userId}/entries`,
        { params, meta: { idToken } },
      );

      const documents = response.data.documents || [];
      const filtered = documents
        .map(normalizeMoment)
        .filter((m) => m && m.user === userUid);

      collected = collected.concat(filtered);
      cursor = response.data.nextPageToken || null;
      lastPageToken = cursor;
      pageCount++;

      if (!cursor) break; // hết pages Firestore
    }

    return {
      moments: collected.slice(0, limit),
      // nếu còn dư hơn limit items đã collect → vẫn còn trang
      nextPageToken: collected.length > limit ? lastPageToken : (lastPageToken || null),
    };
  } catch (error) {
    console.error("❌ Lỗi khi lấy moments (filter):", error.response?.data || error.message);
    return { moments: [], nextPageToken: null };
  }
};

function normalizeMoment(doc) {
  if (!doc || !doc.fields) return null;

  const f = doc.fields;
  const overlays = f.overlays?.arrayValue?.values || [];

  // chỉ lấy overlay đầu tiên (nếu có)
  const overlay = overlays[0]?.mapValue?.fields || {};
  const overlayData = overlay.data?.mapValue?.fields || {};

  const backgroundFields = overlayData.background?.mapValue?.fields || {};

  const getIsPublic = (f) => {
    const sentToAll = parseFirestoreValue(f.sent_to_all);
    const sentToSelfOnly = parseFirestoreValue(f.sent_to_self_only);

    // Ưu tiên sent_to_self_only nếu có true
    if (sentToSelfOnly) return false;
    if (sentToAll) return true;
    return false;
  };

  return {
    id: f.canonical_uid?.stringValue || doc.name.split("/").pop(),
    caption: f.caption?.stringValue || overlay.alt_text?.stringValue || "",
    user: f.user?.stringValue || null,
    thumbnailUrl: replaceFirebaseWithCDN(f.thumbnail_url?.stringValue),
    videoUrl: replaceFirebaseWithCDN(f.video_url?.stringValue),
    md5: f.md5?.stringValue || null,
    date: f.date?.timestampValue || doc.createTime || null,
    isPublic: getIsPublic(f),
    overlays: {
      id: overlay.overlay_id?.stringValue || null,
      // overlay_type trong Firestore luôn là "caption" — đọc data.type (semantic type như "music",
      // "weather", "streak", v.v.) trước, fallback về overlay_type nếu không có.
      type: overlayData.type?.stringValue || overlay.overlay_type?.stringValue || null,
      text: overlayData.text?.stringValue || null,
      textColor: overlayData.text_color?.stringValue || null,
      maxLines: overlayData.max_lines?.integerValue
        ? parseInt(overlayData.max_lines.integerValue, 10)
        : null,
      background: {
        materialBlur:
          overlayData.background?.mapValue?.fields?.material_blur
            ?.stringValue || null,
        colors: parseFirestoreValue(backgroundFields.colors) || [],
      },
      icon: parseFirestoreValue(overlayData.icon),
      payload: parseFirestoreValue(overlayData.payload),
    },
    createTime: doc.createTime || null,
    updateTime: doc.updateTime || null,
  };
}

function replaceFirebaseWithCDN(url) {
  if (!url) return null; // hoặc "" nếu bạn muốn
  return url.replace(
    "https://firebasestorage.googleapis.com",
    "https://cdn.locketcamera.com",
  );
}

function parseFirestoreValue(v) {
  if (!v) return null;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return parseFloat(v.doubleValue);
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue !== undefined) {
    const fields = v.mapValue.fields || {};
    const obj = {};
    for (const key in fields) {
      obj[key] = parseFirestoreValue(fields[key]);
    }
    return obj;
  }
  if (v.arrayValue !== undefined) {
    return (v.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
}

module.exports = {
  getLocketMoments,
};