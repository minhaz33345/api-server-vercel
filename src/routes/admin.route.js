const Router = require("express");
const router = Router();

const { verifyAdminKey } = require("../middlewares/verifyAdminKey");
const {
  updateDeviceToken,
  getAppCheckStatus,
} = require("../controllers/adminAppCheck.controller");

router.post("/appcheck/device-token", verifyAdminKey, updateDeviceToken);
router.get("/appcheck/status", verifyAdminKey, getAppCheckStatus);

module.exports = router;
