const {
  postServices,
  authServices,
  friendServices,
  processServices,
} = require("../services");
const { formatFileSize } = require("../utils/formatFileSize");
const { logWarning, logTable, logLoading, logInfo } = require("../utils/logEventUtils");
const { instanceLocketV2 } = require("../libs/instanceLocket");
const { createAnalytics } = require("../services/LocketAnalytics/createAnalytics");
const { countEntries: countEntriesService } = require("../services/LocketAnalytics/countEntries");

const MAX_SIZE_MB_UPLOAD = 20; // MB

// Bản rút gọn (Vercel) của locket.controller.js gốc trong apps/self-hosted/api.
// Đã bỏ: chat/message (gRPC + socket), group, admin, payment, push notification,
// upload video (ffmpeg). Chỉ giữ: auth, friend, thông tin user, moment (ảnh),
// upload ảnh (V2 - nhận URL media, không nhận multipart trực tiếp trừ avatar).

class LocketController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await authServices.login(email, password);
      return res.status(200).json({ data: user, success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      await authServices.logout();
      return res.status(200).json({ success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const user = await authServices.refreshIdToken(refreshToken);
      return res.status(200).json({ data: user, success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  async getInfoLocket(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const user = await authServices.getUserInfoV2(idToken, localId);
      return res.status(200).json({ data: user, success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  async getStreakInfo(req, res, next) {
    try {
      const { idToken } = req.user;
      const payload = {
        data: {
          excluded_users: [],
          fetch_streak: true,
          should_count_missed_moments: true,
        },
      };
      const response = await instanceLocketV2.post("getLatestMomentV2", payload, {
        meta: { idToken },
      });
      const streak = response.data?.result?.streak || null;
      return res.status(200).json({ success: true, data: { streak } });
    } catch (error) {
      next(error);
    }
  }

  // ── Friend ──────────────────────────────────────────────────────────────
  async getAllFriends(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const data = await friendServices.getAllFriends(idToken, localId);
      return res.status(200).json({ data, success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  async getIncomingFriendRequests(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const { pageToken = null, limit = 10 } = req.body;
      const data = await friendServices.getAllFriendRequests(idToken, localId, pageToken, limit);
      return res.status(200).json({ ...data, success: true });
    } catch (error) {
      next(error);
    }
  }

  async getOutgoingFriendRequests(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const { pageToken = null, limit = 10 } = req.body;
      const data = await friendServices.getOutgoingFriendRequests(idToken, localId, pageToken, limit);
      return res.status(200).json({ ...data, success: true });
    } catch (error) {
      next(error);
    }
  }

  async sendFriendRequest(req, res, next) {
    try {
      const { idToken } = req.user;
      const { uid } = req.body;
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu uid" });
      const data = await friendServices.sendFriendRequest(idToken, uid.trim());
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async sendFriendRequestV2(req, res, next) {
    try {
      const { idToken } = req.user;
      const uid = req.body?.data?.friendUid || req.body?.uid;
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu friendUid" });
      const data = await friendServices.sendFriendRequest(idToken, uid.trim());
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async sendCelebrityRequest(req, res, next) {
    try {
      const { idToken } = req.user;
      const uid = req.body?.friendUid || req.body?.uid;
      const intent = req.body?.intent || "add-friend";
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu friendUid" });
      const data = await friendServices.sendCelebrityRequest(idToken, uid.trim(), intent);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async acceptFriendRequest(req, res, next) {
    try {
      const { idToken } = req.user;
      const uid = req.body?.uid || req.body?.data?.user_uid;
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu uid" });
      const data = await friendServices.acceptFriendRequest(idToken, uid.trim());
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async deleteFriendRequest(req, res, next) {
    try {
      const { idToken } = req.user;
      const uid = req.body?.uid || req.body?.data?.user_uid;
      const direction = req.body?.direction || "incoming";
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu uid" });
      const data = await friendServices.deleteFriendRequest(idToken, uid.trim(), direction);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async fetchUserV2(req, res, next) {
    try {
      const { idToken } = req.user;
      const { uid } = req.body;
      if (!uid?.trim()) return res.status(400).json({ error: "Thiếu uid" });
      const data = await friendServices.fetchUserV2(idToken, uid.trim());
      if (!data) return res.status(404).json({ success: false, error: "Không tìm thấy user" });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async searchByUsername(req, res, next) {
    try {
      const { idToken } = req.user;
      const { username } = req.body;
      if (!username?.trim()) return res.status(400).json({ error: "Thiếu username" });
      const data = await friendServices.getUserByUsername(idToken, username.trim());
      if (!data) return res.status(404).json({ success: false, message: "Không tìm thấy người dùng" });
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async searchByInviteToken(req, res, next) {
    try {
      const { idToken } = req.user;
      const { inviteToken } = req.body;
      if (!inviteToken?.trim()) return res.status(400).json({ error: "Thiếu inviteToken" });
      const data = await friendServices.getUserByInviteToken(idToken, inviteToken.trim());
      return res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // ── Profile ─────────────────────────────────────────────────────────────
  async updateProfileInfo(req, res, next) {
    const { idToken, localId } = req.user;
    const { first_name, last_name } = req.body;
    const file = req.file;

    if (!file && first_name === undefined && last_name === undefined) {
      return res.status(400).json({ error: "Cần ít nhất avatar hoặc first_name/last_name" });
    }

    try {
      const data = { analytics: createAnalytics() };
      let profilePictureUrl;

      if (file) {
        const processedBuffer = await processServices.processImageBuffer({
          imageBuffer: file.buffer,
          maxSizeMB: 1,
          resolution: 512,
        });
        const { uploadAvatarToFirebaseStorage } = require("../services/FirestorageService");
        profilePictureUrl = await uploadAvatarToFirebaseStorage(localId, idToken, processedBuffer);
        data.profile_picture_url = profilePictureUrl;
      }
      if (first_name) data.first_name = first_name;
      if (last_name) data.last_name = last_name;

      const response = await instanceLocketV2.post("changeProfileInfo", { data }, { meta: { idToken } });

      return res.status(200).json({
        success: true,
        data: {
          ...response.data?.result,
          profile_picture_url: profilePictureUrl,
          first_name: data.first_name,
          last_name: data.last_name,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // ── Moment (chỉ ẢNH) ────────────────────────────────────────────────────
  async getMoments(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const { pageToken = null, friendId = null, limit = 60 } = req.body;
      const data = await postServices.getLocketMoments(idToken, localId, pageToken, friendId, limit);
      return res.status(200).json({
        data: data?.moments || [],
        nextPageToken: data?.nextPageToken || null,
        success: true,
        message: "ok",
      });
    } catch (error) {
      next(error);
    }
  }

  async getInfoMoments(req, res, next) {
    try {
      const { idToken, uid } = req.user;
      const { idMoment } = req.body;
      const data = await postServices.getInfoLocketMoments(idToken, idMoment);
      return res.status(200).json({ data, success: true, message: "ok" });
    } catch (error) {
      next(error);
    }
  }

  // Upload media (V2): client cần đã có sẵn URL media (vd: upload lên service
  // storage riêng hoặc thẳng Firebase trước), API này tải về, resize/nén rồi
  // đăng lên Locket. CHỈ HỖ TRỢ type: "image" trong bản Vercel này.
  async uploadMediaV2(req, res, next) {
    let mediaPath;
    try {
      const { options, optionsData: optionsDataRaw, mediaInfo } = req.body;
      const optionsData = options ?? optionsDataRaw;
      const { idToken, localId } = req.user;
      const { type, url, name, size } = mediaInfo || {};

      if (!url) {
        return res.status(400).json({ error: "Thiếu mediaInfo.url" });
      }

      if (type === "video") {
        return res.status(501).json({
          success: false,
          message:
            "Bản Vercel rút gọn này chỉ hỗ trợ upload ẢNH. Upload video cần ffmpeg " +
            "(không phù hợp serverless) — hãy dùng bản self-hosted (Docker/VPS) cho video.",
        });
      }

      const sizeInMB = size / (1024 * 1024);
      if (sizeInMB > MAX_SIZE_MB_UPLOAD) {
        return res.status(400).json({ success: false, message: "File quá lớn" });
      }

      logTable("uploadMediaV2", { localId, type, name, size: formatFileSize(size) });
      logLoading("uploadMediaV2", "Downloading media");

      const media = await processServices.downloadMediaOnStorage(url, "image", name);
      if (!media) {
        return res.status(404).json({ message: "Không thể tải media từ URL!" });
      }

      mediaPath = media.path;

      const processedBuffer = await processServices.processImageBuffer({
        imageBuffer: media.buffer,
        maxSizeMB: 1,
        resolution: 1440,
      });

      const result = await postServices.postImageToLocketV2({
        userId: localId,
        idToken,
        imageBuffer: processedBuffer,
        optionsData,
      });

      await processServices.deleteFileFromStorageR2(mediaPath).catch(() => {});

      const rawData = result?.result?.data;
      const momentData = rawData?.moment ?? rawData;

      return res.status(200).json({
        success: true,
        message: "Upload media successfully",
        data: momentData,
      });
    } catch (error) {
      next(error);
    } finally {
      if (mediaPath) {
        try {
          processServices.deleteTempFile(mediaPath);
        } catch {}
      }
    }
  }

  async countEntries(req, res, next) {
    try {
      const { idToken, localId } = req.user;
      const total = await countEntriesService(idToken, localId);
      return res.status(200).json({ success: true, data: { userId: localId, count: total } });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LocketController();
