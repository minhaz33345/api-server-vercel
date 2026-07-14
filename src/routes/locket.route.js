const Router = require("express");
const router = Router();

const locketController = require("../controllers/locket.controller.js");
const { verifyIdToken } = require("../middlewares/verifyToken.js");
const { checkLoginAllowed } = require("../middlewares/checkLoginAllowed.js");
const uploadAvatarImage = require("../middlewares/avatar-upload.middleware.js");

// ── Auth ────────────────────────────────────────────────────────────────────
router.post("/login", checkLoginAllowed, locketController.login);
router.get("/logout", locketController.logout);
router.post("/refresh-token", locketController.refreshToken);

// ── User info ────────────────────────────────────────────────────────────────
router.post("/getInfoUser", verifyIdToken, locketController.getInfoLocket);
router.post("/getStreakInfo", verifyIdToken, locketController.getStreakInfo);
router.post(
  "/updateProfileInfo",
  verifyIdToken,
  uploadAvatarImage,
  locketController.updateProfileInfo
);

// ── Friend ───────────────────────────────────────────────────────────────────
router.post("/getAllFriendsV2", verifyIdToken, locketController.getAllFriends);
router.post("/getIncomingFriendRequests", verifyIdToken, locketController.getIncomingFriendRequests);
router.post("/getIncomingFriendRequestsV2", verifyIdToken, locketController.getIncomingFriendRequests);
router.post("/getOutgoingFriendRequests", verifyIdToken, locketController.getOutgoingFriendRequests);
router.post("/getOutgoingFriendRequestsV2", verifyIdToken, locketController.getOutgoingFriendRequests);
router.post("/searchByUsername", verifyIdToken, locketController.searchByUsername);
router.post("/searchByInviteToken", verifyIdToken, locketController.searchByInviteToken);
router.post("/getUserByUsername", verifyIdToken, locketController.searchByUsername);
router.post("/fetchUserV2", verifyIdToken, locketController.fetchUserV2);
router.post("/sendFriendRequest", verifyIdToken, locketController.sendFriendRequest);
router.post("/sendFriendRequestV2", verifyIdToken, locketController.sendFriendRequestV2);
router.post("/sendCelebrityRequestV2", verifyIdToken, locketController.sendCelebrityRequest);
router.post("/acceptFriendRequest", verifyIdToken, locketController.acceptFriendRequest);
router.post("/deleteFriendRequest", verifyIdToken, locketController.deleteFriendRequest);

// ── Moment (ảnh) ─────────────────────────────────────────────────────────────
// postMomentV2: body { mediaInfo: { type: "image", url, name, size }, options/optionsData }
// -> client cần đã có URL media từ trước (vd upload lên service storage riêng)
router.post("/postMomentV2", verifyIdToken, locketController.uploadMediaV2);
router.post("/getInfoMomentV2", verifyIdToken, locketController.getInfoMoments);
router.post("/getMomentV2", verifyIdToken, locketController.getMoments);

// ── Analytics ─────────────────────────────────────────────────────────────────
router.post("/countEntries", verifyIdToken, locketController.countEntries);
router.get("/countEntries", verifyIdToken, locketController.countEntries);

module.exports = router;
