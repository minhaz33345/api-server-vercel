const { instanceFirestore, instanceFirebaseV2 } = require("../../libs");

/**
 * Lấy thông tin người dùng từ Firebase Auth + Firestore
 */
const getUserInfoV2 = async (idToken, localId) => {
  try {
    console.log("🔍 [getUserInfoV2] Start - localId:", localId);

    // ===== Step 1: Lấy data từ Firebase Auth =====
    let userData;
    try {
      const authResponse = await instanceFirebaseV2.post("getAccountInfo", {
        idToken,
      });
      
      userData = authResponse.data?.users?.[0];
      
      if (!userData) {
        throw new Error("Không tìm thấy user trong Firebase Auth");
      }
      
      console.log("✅ [getUserInfoV2] Firebase Auth OK:", userData.email || userData.localId);
    } catch (authError) {
      console.error("❌ [getUserInfoV2] Firebase Auth error:", authError.response?.data || authError.message);
      throw new Error(`Firebase Auth failed: ${authError.message}`);
    }

    // ===== Step 2: Lấy data từ Firestore =====
    let userDataV2 = null;
    try {
      const firestoreResponse = await instanceFirestore.get(
        `(default)/documents/users/${localId}`,
        {
          meta: { idToken },
        }
      );
      
      userDataV2 = firestoreResponse?.data;
      console.log("✅ [getUserInfoV2] Firestore OK");
    } catch (firestoreError) {
      // ⚠️ Firestore lỗi nhưng vẫn tiếp tục với data Firebase Auth
      console.warn(
        "⚠️ [getUserInfoV2] Firestore error (vẫn trả data Auth):",
        firestoreError.response?.data || firestoreError.message
      );
    }

    // ===== Step 3: Merge data và return =====
    const result = {
      uid: userDataV2?.fields?.uid?.stringValue || userData.localId,
      localId: userData.localId || localId,
      customAuth: userData.customAuth || null,
      phoneNumber: userData.phoneNumber || null,
      displayName: userData.displayName || null,
      email: userData.email || null,
      lastLoginAt: userData.lastLoginAt || null,
      lastRefreshAt: userData.lastRefreshAt || null,
      emailVerified: userData.emailVerified || null,

      username: userDataV2?.fields?.username?.stringValue || null,
      firstName: userDataV2?.fields?.first_name?.stringValue || null,
      lastName: userDataV2?.fields?.last_name?.stringValue || null,
      profilePicture: userDataV2?.fields?.profile_picture_url?.stringValue || null,
      inviteToken: userDataV2?.fields?.invite_token?.stringValue || null,
      migratedAt: userDataV2?.fields?.migrated_at?.timestampValue || null,
      createdAt: userDataV2?.fields?.created_at?.timestampValue || null,
      lastFriendsChange: userDataV2?.fields?.last_friends_change?.timestampValue || null,
      birthday:
        userDataV2?.fields?.birthday?.mapValue?.fields?.encoded_mdd?.integerValue || null,
    };

    console.log("✅ [getUserInfoV2] Success - Returning user data");
    return result;
  } catch (error) {
    console.error(
      "❌ [getUserInfoV2] Fatal error:",
      error.response?.data || error.message
    );
    throw error;
  }
};

module.exports = { getUserInfoV2 };