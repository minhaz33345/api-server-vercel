const axios = require("axios");
const constants = require("../utils/constants");
const { firebase } = require("../config/app.config");

const instanceFirestore = axios.create({
  baseURL: firebase.apiBase.firestore,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": constants.USER_AGENT,
    "X-Ios-Bundle-Identifier": constants.IOS_BUNDLE_ID,
  },
});

instanceFirestore.interceptors.request.use((config) => {
  if (config.meta?.idToken) {
    config.headers.Authorization = `Bearer ${config.meta.idToken}`;
  }
  return config;
});

const instanceFirestoreUpload = axios.create({
  timeout: 30000,
  headers: {
    "content-type": "application/octet-stream",
    "x-goog-upload-protocol": "resumable",
    "x-goog-upload-offset": "0",
    "x-goog-upload-command": "upload, finalize",
    "upload-incomplete": "?0",
    "upload-draft-interop-version": "3",
    "user-agent":
      "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
  },
});

// Instance riêng cho video upload với timeout 3 phút.
// Video 10-20MB từ server lên Firebase thường mất 15-50s tuỳ băng thông,
// nên 30s của instanceFirestoreUpload là không đủ và gây intermittent failure.
// Ảnh sau compress chỉ ~200KB nên không bị ảnh hưởng bởi timeout 30s.
const instanceFirestoreVideoUpload = axios.create({
  timeout: 180000,
  headers: {
    "content-type": "application/octet-stream",
    "x-goog-upload-protocol": "resumable",
    "x-goog-upload-offset": "0",
    "x-goog-upload-command": "upload, finalize",
    "upload-incomplete": "?0",
    "upload-draft-interop-version": "3",
    "user-agent":
      "com.locket.Locket/1.43.1 iPhone/17.3 hw/iPhone15_3 (GTMSUF/1)",
  },
});

module.exports = { instanceFirestore, instanceFirestoreUpload, instanceFirestoreVideoUpload };
