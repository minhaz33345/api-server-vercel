const { instanceFirestore } = require("../../libs/instanceFirestore.js");

const getAllFriends = async (idToken, localId) => {
  let pageToken = null;
  const allFriends = [];

  try {
    do {
      const response = await instanceFirestore.get(
        `(default)/documents/users/${localId}/friends`,
        {
          params: {
            pageSize: 100,
            ...(pageToken && { pageToken }),
          },
          meta: { idToken },
        }
      );

      const documents = response.data.documents || [];

      const parsedFriends = documents.map((doc) => ({
        uid: doc.fields?.user?.stringValue,
        date: doc.createTime,
      }));

      allFriends.push(...parsedFriends);

      pageToken = response.data.nextPageToken || null;

    } while (pageToken);

    return allFriends;

  } catch (error) {
    console.error(
      "❌ Lỗi khi lấy danh sách bạn bè:",
      error.response?.data || error.message
    );
    return [];
  }
};


const getAllFriendRequests = async (idToken, localId, pageToken = null, limit = 10) => {
  try {
    const response = await instanceFirestore.get(
      `(default)/documents/users/${localId}/incoming_friend_requests`,
      {
        params: { pageSize: limit, ...(pageToken && { pageToken }) },
        meta: { idToken },
      }
    );

    const documents = response.data.documents || [];
    const parsedRequests = documents.map((doc) => ({
      uid: doc.fields?.requesting_user?.stringValue || null,
      to: doc.fields?.requested_user?.stringValue || null,
      date: doc.fields?.created_at?.timestampValue || doc.createTime,
      docId: doc.name.split("/").pop(),
    }));

    return { data: parsedRequests, nextPageToken: response.data.nextPageToken || null };
  } catch (error) {
    console.error("❌ Lỗi khi lấy lời mời kết bạn:", error.response?.data || error.message);
    return { data: [], nextPageToken: null };
  }
};

const getOutgoingFriendRequests = async (idToken, localId, pageToken = null, limit = 10) => {
  try {
    const response = await instanceFirestore.get(
      `(default)/documents/users/${localId}/outgoing_friend_requests`,
      {
        params: { pageSize: limit, ...(pageToken && { pageToken }) },
        meta: { idToken },
      }
    );

    const documents = response.data.documents || [];
    const parsedRequests = documents.map((doc) => ({
      uid: doc.fields?.requested_user?.stringValue || null,
      date: doc.fields?.created_at?.timestampValue || doc.createTime,
      docId: doc.name.split("/").pop(),
    }));

    return { data: parsedRequests, nextPageToken: response.data.nextPageToken || null };
  } catch (error) {
    console.error("❌ Lỗi khi lấy yêu cầu đã gửi:", error.response?.data || error.message);
    return { data: [], nextPageToken: null };
  }
};


// Chấp nhận lời mời kết bạn (direction: "incoming")
const acceptFriendRequest = async (idToken, targetUid) => {
  const { instanceLocketV2 } = require("../../libs");
  try {
    const res = await instanceLocketV2.post(
      "acceptFriendRequest",
      {
        data: {
          user_uid: targetUid,
          analytics: {
            platform: "ios",
            ios_version: "2.42.0.1",
            experiments: {
              flag_1:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1401" },
              flag_3:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "600" },
              flag_4:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "43" },
              flag_5:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "400" },
              flag_6:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "2000" },
              flag_7:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "802" },
              flag_10: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "505" },
              flag_14: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "502" },
              flag_16: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "521" },
              flag_17: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "3111" },
              flag_18: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_22: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_25: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "76" },
            },
            amplitude: {
              device_id: "816F1C8C-15EF-4B5B-A398-1516CB68C885",
              session_id: {
                "@type": "type.googleapis.com/google.protobuf.Int64Value",
                value: "1777884470079",
              },
            },
            google_analytics: { app_instance_id: "B8FC3F80EA48495BBC013141F4B0A5B5" },
          },
        },
      },
      { meta: { idToken } }
    );
    return { success: true, data: res.data?.result?.data };
  } catch (error) {
    console.error("❌ acceptFriendRequest:", error.response?.data || error.message);
    const _m = error.response?.data?.error; throw new Error(typeof _m === "object" ? (_m?.message || "Lỗi không xác định") : (_m || error.message || "Lỗi không xác định"));
  }
};

// Từ chối / huỷ lời mời kết bạn
// direction: "incoming" = từ chối lời mời nhận được
// direction: "outgoing" = huỷ lời mời đã gửi
const deleteFriendRequest = async (idToken, targetUid, direction = "incoming") => {
  const { instanceLocketV2 } = require("../../libs");
  try {
    const res = await instanceLocketV2.post(
      "deleteFriendRequest",
      {
        data: {
          user_uid: targetUid,
          direction,
          analytics: {
            platform: "ios",
            ios_version: "2.42.0.1",
            experiments: {
              flag_1:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1401" },
              flag_3:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "600" },
              flag_4:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "43" },
              flag_5:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "400" },
              flag_6:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "2000" },
              flag_7:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "802" },
              flag_10: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "505" },
              flag_14: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "502" },
              flag_16: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "521" },
              flag_17: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "3111" },
              flag_18: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_22: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_25: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "76" },
            },
            amplitude: {
              device_id: "816F1C8C-15EF-4B5B-A398-1516CB68C885",
              session_id: {
                "@type": "type.googleapis.com/google.protobuf.Int64Value",
                value: "1777884470079",
              },
            },
            google_analytics: { app_instance_id: "B8FC3F80EA48495BBC013141F4B0A5B5" },
          },
        },
      },
      { meta: { idToken } }
    );
    return { success: true, data: res.data?.result?.data };
  } catch (error) {
    console.error("❌ deleteFriendRequest:", error.response?.data || error.message);
    const _m = error.response?.data?.error; throw new Error(typeof _m === "object" ? (_m?.message || "Lỗi không xác định") : (_m || error.message || "Lỗi không xác định"));
  }
};

const getUserByUsername = async (idToken, username) => {
  const { instanceLocketV2 } = require("../../libs");

  try {
    const body = {
      data: {
        username: username.toLowerCase().replace("@", ""),
        analytics: {
          ios_version: "2.8.0.1",
          experiments: {
            flag_1:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1401" },
            flag_3:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "600" },
            flag_4:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "43" },
            flag_5:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "400" },
            flag_6:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "2000" },
            flag_7:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "802" },
            flag_10: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "505" },
            flag_14: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "502" },
            flag_16: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "521" },
            flag_17: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "3111" },
            flag_18: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
            flag_22: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
            flag_25: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "76" },
          },
          amplitude: {
            device_id: "816F1C8C-15EF-4B5B-A398-1516CB68C885",
            session_id: {
              "@type": "type.googleapis.com/google.protobuf.Int64Value",
              value: "1777861801742",
            },
          },
          google_analytics: {
            app_instance_id: "B8FC3F80EA48495BBC013141F4B0A5B5",
          },
          ios_version: "2.42.0.1",
          platform: "ios",
        },
      },
    };

    const res = await instanceLocketV2.post("getUserByUsername", body, {
      meta: { idToken },
    });

    // Response thực tế: { result: { data: { uid, first_name, ... }, status: 200 } }
    const result = res.data?.result?.data;
    if (!result) return null;

    return {
      uid:                 result.uid,
      username:            result.username,
      first_name:          result.first_name,
      last_name:           result.last_name,
      profile_picture_url: result.profile_picture_url,
      badge:               result.badge || null,
      celebrity:           result.celebrity || false,
      celebrity_data:      result.celebrity_data || null,
      friendship_status:   result.friendship_status || null,
    };
  } catch (error) {
    console.error("❌ getUserByUsername:", error.response?.data || error.message);
    return null;
  }
};

// Tìm user qua invite token — gọi thẳng Locket API (fetchUserForInviteToken)
const getUserByInviteToken = async (idToken, inviteToken) => {
  const { instanceLocketV2 } = require("../../libs");

  try {
    const res = await instanceLocketV2.post(
      "fetchUserForInviteToken",
      {
        data: {
          invite_token: inviteToken, // field đúng là invite_token, không phải token
          analytics: { ios_version: "2.42.0.1", platform: "ios" },
        },
      },
      { meta: { idToken } }
    );

    // Response: result.data.user (khác với fetchUserV2 là result.data)
    const user = res.data?.result?.data?.user;
    if (!user) return null;

    return {
      uid:              user.uid,
      firstName:        user.first_name,
      lastName:         user.last_name,
      username:         user.username || null,
      profilePicture:   user.profile_picture_url || null,
      badge:            user.badge || null,
      temp:             user.temp || false,
      friendshipStatus: user.friendship_status || "none",
    };
  } catch (error) {
    console.error("❌ getUserByInviteToken:", error.response?.data || error.message);
    return null;
  }
};

// Lấy thông tin user theo uid qua Locket API (fetchUserV2)
// skipAppCheck=true khi gọi từ background push watcher (không cần AppCheck cho fetch nhẹ)
const fetchUserV2 = async (idToken, targetUid, { skipAppCheck = false } = {}) => {
  const { instanceLocketV2 } = require("../../libs");

  try {
    const res = await instanceLocketV2.post(
      "fetchUserV2",
      {
        data: {
          user_uid: targetUid,
          analytics: {
            ios_version: "2.42.0.1",
            platform: "ios",
          },
        },
      },
      { meta: { idToken, skipAppCheck } }
    );

    const user = res.data?.result?.data;
    if (!user) return null;

    return {
      uid:            user.uid,
      firstName:      user.first_name,
      lastName:       user.last_name,
      username:       user.username || null,
      profilePicture: user.profile_picture_url || null,
      badge:          user.badge || null,
      temp:           user.temp || false,
    };
  } catch (error) {
    console.error("❌ fetchUserV2:", error.response?.data || error.message);
    return null;
  }
};

// Gửi lời mời kết bạn qua Locket API
const sendFriendRequest = async (idToken, targetUid) => {
  const { instanceLocketV2 } = require("../../libs");
  const { getAppCheckToken } = require("../LocketAppCheck");

  try {
    const appCheckToken = await getAppCheckToken();

    const res = await instanceLocketV2.post(
      "sendFriendRequest",
      {
        data: {
          user_uid: targetUid,
          messenger: "Messages",
          platform: "iOS",
          get_reengagement_status: false,
          create_ofr_for_temp_users: false,
          share_history_eligible: true,
          rollcall: false,
          prompted_reengagement: false,
          invite_variant: {
            "@type": "type.googleapis.com/google.protobuf.Int64Value",
            value: "1002",
          },
          analytics: {
            platform: "ios",
            experiments: {
              flag_1:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1400" },
              flag_10: { value: "505",  "@type": "type.googleapis.com/google.protobuf.Int64Value" },
              flag_5:  { value: "400",  "@type": "type.googleapis.com/google.protobuf.Int64Value" },
              flag_6:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "2000" },
              flag_3:  { value: "600",  "@type": "type.googleapis.com/google.protobuf.Int64Value" },
              flag_4:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "43" },
              flag_18: { value: "1203", "@type": "type.googleapis.com/google.protobuf.Int64Value" },
              flag_7:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "800" },
              flag_16: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "521" },
              flag_22: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_14: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "502" },
            },
            amplitude: {
              device_id: "816F1C8C-15EF-4B5B-A398-1516CB68C885",
              session_id: {
                "@type": "type.googleapis.com/google.protobuf.Int64Value",
                value: "1777911468323",
              },
            },
            google_analytics: {
              app_instance_id: "BC5E49C48C9F4391B8742D6527F46699",
            },
            ios_version: "2.8.0.1",
          },
        },
      },
      { meta: { idToken, appCheckToken } }
    );

    const result = res.data?.result?.data;
    return {
      success: true,
      status: result?.status || "sent",
      userUid: result?.user_uid,
    };
  } catch (error) {
    const errData = error.response?.data;
    // Locket trả về { error: { message, status } } hoặc { error: "string" }
    const locketErr = errData?.error;
    const msg =
      (typeof locketErr === "object" ? locketErr?.message : locketErr) ||
      error.message ||
      "Gửi lời mời thất bại";

    // UNAUTHENTICATED → trả 401 để frontend tự refresh token
    const locketStatus = typeof locketErr === "object" ? locketErr?.status : null;
    if (locketStatus === "UNAUTHENTICATED") {
      const err = new Error("Token hết hạn, vui lòng đăng nhập lại");
      err.status = 401;
      throw err;
    }

    console.error("❌ sendFriendRequest:", msg);
    throw new Error(typeof msg === "string" ? msg : "Gửi lời mời thất bại");
  }
};

const sendCelebrityRequest = async (idToken, targetUid, intent = "add-friend") => {
  const { instanceLocketV2 } = require("../../libs");
  const { getAppCheckToken } = require("../LocketAppCheck");

  const VALID_INTENTS = ["add-friend", "notify-me"];
  const resolvedIntent = VALID_INTENTS.includes(intent) ? intent : "add-friend";

  try {
    const appCheckToken = await getAppCheckToken();

    const res = await instanceLocketV2.post(
      "sendFollowRequest",
      {
        data: {
          intent: resolvedIntent,
          celebrity_uid: targetUid,
          analytics: {
            ios_version: "2.8.0.1",
            experiments: {
              flag_4:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "43" },
              flag_10: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "505" },
              flag_5:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "400" },
              flag_6:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "2000" },
              flag_3:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "600" },
              flag_22: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_18: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "1203" },
              flag_7:  { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "800" },
              flag_16: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "521" },
              flag_14: { "@type": "type.googleapis.com/google.protobuf.Int64Value", value: "502" },
            },
            amplitude: {
              device_id: "816F1C8C-15EF-4B5B-A398-1516CB68C885",
              session_id: {
                "@type": "type.googleapis.com/google.protobuf.Int64Value",
                value: "1777911468323",
              },
            },
            google_analytics: {
              app_instance_id: "BC5E49C48C9F4391B8742D6527F46699",
            },
            platform: "ios",
          },
        },
      },
      { meta: { idToken, appCheckToken } }
    );

    const status = res.data?.result?.status;
    return { success: true, status: status || 200, intent: resolvedIntent };
  } catch (error) {
    const errData = error.response?.data;
    const locketErr = errData?.error;
    const msg =
      (typeof locketErr === "object" ? locketErr?.message : locketErr) ||
      error.message ||
      "Gửi lời mời thất bại";

    const locketStatus = typeof locketErr === "object" ? locketErr?.status : null;
    if (locketStatus === "UNAUTHENTICATED") {
      const err = new Error("Token hết hạn, vui lòng đăng nhập lại");
      err.status = 401;
      throw err;
    }

    console.error("❌ sendCelebrityRequest:", msg);
    throw new Error(typeof msg === "string" ? msg : "Gửi lời mời thất bại");
  }
};

module.exports = {
  getAllFriends,
  getAllFriendRequests,
  getOutgoingFriendRequests,
  getUserByUsername,
  getUserByInviteToken,
  fetchUserV2,
  sendFriendRequest,
  sendCelebrityRequest,
  acceptFriendRequest,
  deleteFriendRequest,
};
