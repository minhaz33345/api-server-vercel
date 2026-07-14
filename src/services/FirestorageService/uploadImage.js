const fs = require("fs");
const {
  logInfo,
  logError,
  logSuccess,
  logWarning,
  logDebug,
  logPerformance,
} = require("../../utils/logEventUtils");
const { instanceFirestoreUpload } = require("../../libs");

//#region Image handlers

/**
 * Uploads an image to Firebase Storage.
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {File|Buffer} image - The image to be uploaded. Can be a `File` object or a `Buffer`.
 * @returns
 */
const uploadImageToFirebaseStorage = async (userId, idToken, image) => {
  try {
    logInfo("uploadImageToFirebaseStorage", "Start");
    const imageName = `${Date.now()}_vtd182.webp`;

    // Bước 1: Khởi tạo quá trình upload
    const url = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}?uploadType=resumable&name=users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}`;
    const initHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${image.size || image.length}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent":
        "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": "image/webp",
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
    };

    const data = JSON.stringify({
      name: `users/${userId}/moments/thumbnails/${imageName}`,
      contentType: "image/*",
      bucket: "",
      metadata: { creator: userId, visibility: "private" },
    });

    const response = await fetch(url, {
      method: "POST",
      headers: initHeaders,
      body: data,
    });

    if (!response.ok) {
      throw new Error(`Failed to start upload: ${response.statusText}`);
    }

    const uploadUrl = response.headers.get("X-Goog-Upload-URL");

    if (!uploadUrl) {
      throw new Error("Firebase did not return upload URL");
    }
    // Bước 2: Tải dữ liệu hình ảnh lên thông qua URL resumable trả về từ bước 1
    let imageBuffer;
    if (image instanceof Buffer) {
      imageBuffer = image;
    } else {
      imageBuffer = fs.readFileSync(image.path);
    }

    try {
      await instanceFirestoreUpload.put(uploadUrl, imageBuffer);
    } catch (err) {
      console.error("Upload error:", err);
      throw new Error("Failed to upload image");
    }

    // Lấy URL tải về hình ảnh từ Firebase Storage
    const getUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/users%2F${userId}%2Fmoments%2Fthumbnails%2F${imageName}`;
    const getHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
    };

    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: getHeaders,
    });

    if (!getResponse.ok) {
      throw new Error(
        `Failed to get download token: ${getResponse.statusText}`,
      );
    }

    const downloadToken = (await getResponse.json()).downloadTokens;
    logInfo("uploadImageToFirebaseStorage", "End");

    return `${getUrl}?alt=media&token=${downloadToken}`;
  } catch (error) {
    logError("uploadImageToFirebaseStorage", error.message);
    throw error;
  } finally {
    // Xoá file ảnh tạm
    if (image.path) {
      fs.unlinkSync(image.path);
    }
  }
};
//#endregion

/**
 * Upload ảnh đại diện nhóm lên Firebase Storage.
 * Path đúng theo API Locket: users/{uid}/public/group_profile_pics/{groupId}.webp
 * (Khác hoàn toàn với moment thumbnail — dùng thư mục public, tên file = groupId)
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {string} groupId
 * @param {Buffer} imageBuffer - Ảnh đã resize/nén webp
 * @returns {string} URL download đầy đủ (có alt=media&token=...)
 */
const uploadGroupAvatarToFirebaseStorage = async (userId, idToken, groupId, imageBuffer) => {
  const CALLER = "uploadGroupAvatarFirebase";
  const t0 = Date.now();

  try {
    // ── Thông tin đầu vào ───────────────────────────────────────────────────
    const storagePath = `users/${userId}/public/group_profile_pics/${groupId}.webp`;
    const encodedPath = encodeURIComponent(storagePath).replace(/%2F/g, "%2F");

    logInfo(CALLER, "═══ BẮT ĐẦU UPLOAD FIREBASE ═══", {
      user_id:      userId,
      group_id:     groupId,
      storage_path: storagePath,
      buffer_size:  `${(imageBuffer.length / 1024).toFixed(1)} KB (${imageBuffer.length} bytes)`,
    });

    // ── Bước 1: Khởi tạo resumable upload ─────────────────────────────────
    const t1 = Date.now();
    logInfo(CALLER, "📤 Bước 1/3: Khởi tạo resumable upload...");

    const initUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/${encodedPath}?uploadType=resumable&name=${encodedPath}`;
    const initHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${imageBuffer.length}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent": "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": "image/webp",
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
    };

    const initBody = JSON.stringify({
      name: storagePath,
      contentType: "image/webp",
      cacheControl: "private, max-age=0",
      bucket: "",
      metadata: null,
    });

    logDebug(CALLER, "Init request details", {
      url:          initUrl.slice(0, 100) + "…",
      content_type: "image/webp",
      cache_control: "private, max-age=0",
      upload_bytes: imageBuffer.length,
    });

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: initHeaders,
      body: initBody,
    });

    logInfo(CALLER, `Init response: HTTP ${initResponse.status} ${initResponse.statusText}`, {
      status:      initResponse.status,
      ok:          initResponse.ok,
      ms:          Date.now() - t1,
    });

    if (!initResponse.ok) {
      const errBody = await initResponse.text().catch(() => "(no body)");
      logError(CALLER, "❌ Init upload thất bại", {
        status:      initResponse.status,
        status_text: initResponse.statusText,
        response_body: errBody.slice(0, 300),
      });
      throw new Error(`Failed to start group avatar upload: ${initResponse.statusText}`);
    }

    const uploadUrl = initResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      logError(CALLER, "❌ Firebase không trả về X-Goog-Upload-URL", {
        headers_received: [...initResponse.headers.keys()].join(", "),
      });
      throw new Error("Firebase did not return upload URL for group avatar");
    }

    logSuccess(CALLER, "✅ Bước 1 OK: nhận được upload URL", {
      upload_url_prefix: uploadUrl.slice(0, 80) + "…",
      ms: Date.now() - t1,
    });

    // ── Bước 2: PUT buffer ảnh ─────────────────────────────────────────────
    const t2 = Date.now();
    logInfo(CALLER, `📦 Bước 2/3: PUT ảnh lên Firebase (${(imageBuffer.length / 1024).toFixed(1)} KB)...`);

    try {
      await instanceFirestoreUpload.put(uploadUrl, imageBuffer);
      logSuccess(CALLER, "✅ Bước 2 OK: PUT ảnh thành công", {
        bytes_uploaded: imageBuffer.length,
        ms:             Date.now() - t2,
        speed_kbps:     ((imageBuffer.length / 1024) / ((Date.now() - t2) / 1000)).toFixed(1) + " KB/s",
      });
    } catch (err) {
      logError(CALLER, "❌ PUT ảnh thất bại", {
        error:  err.message,
        status: err.response?.status,
        ms:     Date.now() - t2,
      });
      throw new Error("Failed to upload group avatar image");
    }

    // ── Bước 3: Lấy downloadToken ──────────────────────────────────────────
    const t3 = Date.now();
    logInfo(CALLER, "🔑 Bước 3/3: Lấy download token từ Firebase...");

    const getUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/${encodedPath}`;
    const getResponse = await fetch(getUrl, {
      method: "GET",
      headers: {
        "content-type": "application/json; charset=UTF-8",
        authorization: `Bearer ${idToken}`,
      },
    });

    logInfo(CALLER, `Get-token response: HTTP ${getResponse.status}`, {
      status: getResponse.status,
      ok:     getResponse.ok,
      ms:     Date.now() - t3,
    });

    if (!getResponse.ok) {
      const errBody = await getResponse.text().catch(() => "(no body)");
      logError(CALLER, "❌ Lấy download token thất bại", {
        status:        getResponse.status,
        status_text:   getResponse.statusText,
        response_body: errBody.slice(0, 300),
      });
      throw new Error(`Failed to get group avatar download token: ${getResponse.statusText}`);
    }

    const responseJson = await getResponse.json();
    const downloadToken = responseJson.downloadTokens;

    if (!downloadToken) {
      logError(CALLER, "❌ Response không có downloadTokens", {
        response_keys: Object.keys(responseJson).join(", "),
      });
      throw new Error("Firebase response missing downloadTokens");
    }

    const finalUrl = `${getUrl}?alt=media&token=${downloadToken}`;

    logSuccess(CALLER, "✅ UPLOAD FIREBASE HOÀN TẤT", {
      storage_path:   storagePath,
      token_prefix:   downloadToken.slice(0, 12) + "…",
      final_url:      finalUrl.slice(0, 100) + "…",
      step1_init_ms:  t2 - t1,
      step2_put_ms:   t3 - t2,
      step3_token_ms: Date.now() - t3,
      total_ms:       Date.now() - t0,
    });

    return finalUrl;
  } catch (error) {
    logError(CALLER, `❌ Upload thất bại sau ${Date.now() - t0}ms: ${error.message}`, {
      user_id:  userId,
      group_id: groupId,
      stack:    error.stack?.split("\n").slice(0, 3).join(" | "),
    });
    throw error;
  }
};

/**
 * Upload ảnh đại diện cá nhân (AVT) lên Firebase Storage.
 * Path đúng theo API Locket: users/{uid}/public/profile_pic.webp
 * (Tên file cố định — mỗi lần đổi avatar sẽ ghi đè lên file cũ, đúng hành vi app gốc)
 *
 * @param {string} userId
 * @param {string} idToken
 * @param {Buffer} imageBuffer - Ảnh đã resize/nén webp
 * @returns {string} URL download đầy đủ (có alt=media&token=...)
 */
const uploadAvatarToFirebaseStorage = async (userId, idToken, imageBuffer) => {
  const CALLER = "uploadAvatarFirebase";
  const t0 = Date.now();

  try {
    const storagePath = `users/${userId}/public/profile_pic.webp`;
    const encodedPath = encodeURIComponent(storagePath);

    logInfo(CALLER, "═══ BẮT ĐẦU UPLOAD AVATAR CÁ NHÂN ═══", {
      user_id: userId,
      storage_path: storagePath,
      buffer_size: `${(imageBuffer.length / 1024).toFixed(1)} KB (${imageBuffer.length} bytes)`,
    });

    // ── Bước 1: Khởi tạo resumable upload ─────────────────────────────────
    const t1 = Date.now();
    const initUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/${encodedPath}?uploadType=resumable&name=${encodedPath}`;
    const initHeaders = {
      "content-type": "application/json; charset=UTF-8",
      authorization: `Bearer ${idToken}`,
      "x-goog-upload-protocol": "resumable",
      accept: "*/*",
      "x-goog-upload-command": "start",
      "x-goog-upload-content-length": `${imageBuffer.length}`,
      "accept-language": "vi-VN,vi;q=0.9",
      "x-firebase-storage-version": "ios/10.13.0",
      "user-agent": "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
      "x-goog-upload-content-type": "image/webp",
      "x-firebase-gmpid": "1:641029076083:ios:cc8eb46290d69b234fa609",
    };

    const initBody = JSON.stringify({
      name: storagePath,
      bucket: "",
      cacheControl: "private, max-age=0",
      contentType: "image/webp",
      metadata: null,
    });

    const initResponse = await fetch(initUrl, {
      method: "POST",
      headers: initHeaders,
      body: initBody,
    });

    if (!initResponse.ok) {
      const errBody = await initResponse.text().catch(() => "(no body)");
      logError(CALLER, "❌ Init upload thất bại", {
        status: initResponse.status,
        response_body: errBody.slice(0, 300),
      });
      throw new Error(`Failed to start avatar upload: ${initResponse.statusText}`);
    }

    const uploadUrl = initResponse.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("Firebase did not return upload URL for avatar");
    }

    logSuccess(CALLER, "✅ Bước 1 OK: nhận được upload URL", { ms: Date.now() - t1 });

    // ── Bước 2: PUT buffer ảnh — Firebase trả về luôn downloadTokens trong
    //           response (nhờ header "x-goog-upload-command: upload, finalize"
    //           đã set sẵn trong instanceFirestoreUpload).
    const t2 = Date.now();
    let downloadToken;
    try {
      const putResponse = await instanceFirestoreUpload.put(uploadUrl, imageBuffer);
      downloadToken = putResponse?.data?.downloadTokens;
      logSuccess(CALLER, "✅ Bước 2 OK: PUT ảnh thành công", { ms: Date.now() - t2 });
    } catch (err) {
      logError(CALLER, "❌ PUT ảnh thất bại", { error: err.message });
      throw new Error("Failed to upload avatar image");
    }

    if (!downloadToken) {
      throw new Error("Firebase PUT response missing downloadTokens");
    }

    const getUrl = `https://firebasestorage.googleapis.com/v0/b/locket-img/o/${encodedPath}`;
    const finalUrl = `${getUrl}?alt=media&token=${downloadToken}`;

    // ── Bước 3: GET để verify ảnh đã thực sự đọc được (đúng mục AVT trong
    //           api collect.md) — không bắt buộc để upload xong, nhưng giúp
    //           phát hiện sớm nếu Firebase báo PUT OK mà ảnh chưa sẵn sàng đọc.
    const t3 = Date.now();
    try {
      const verifyResponse = await fetch(finalUrl);
      if (!verifyResponse.ok) {
        throw new Error(`GET verify trả về HTTP ${verifyResponse.status}`);
      }
      logSuccess(CALLER, "✅ Bước 3 OK: verify ảnh đọc được", {
        ms: Date.now() - t3,
        content_type: verifyResponse.headers.get("content-type"),
        content_length: verifyResponse.headers.get("content-length"),
      });
      // Response là binary ảnh (image/webp), không cần dùng tới —
      // nhưng vẫn phải đọc/hủy body để giải phóng connection, tránh leak.
      await verifyResponse.body?.cancel();
    } catch (err) {
      logError(CALLER, "❌ GET verify thất bại — ảnh có thể chưa sẵn sàng", {
        error: err.message,
      });
      throw new Error("Avatar uploaded but failed verification GET");
    }

    logSuccess(CALLER, "🎉 UPLOAD AVATAR HOÀN TẤT", {
      storage_path: storagePath,
      total_ms: Date.now() - t0,
    });

    return finalUrl;
  } catch (error) {
    logError(CALLER, `❌ Upload thất bại sau ${Date.now() - t0}ms: ${error.message}`, {
      user_id: userId,
    });
    throw error;
  }
};

module.exports = {
  uploadImageToFirebaseStorage,
  uploadGroupAvatarToFirebaseStorage,
  uploadAvatarToFirebaseStorage,
};
