const { instanceLocketV2 } = require("../../libs");
const { logInfo, logError } = require("../../utils/logEventUtils");
const { createAnalytics } = require("../LocketAnalytics");

/**
 * Lấy danh sách filter AI có sẵn (filters) và filter bạn bè đã dùng
 * (friend_filters) cho user hiện tại.
 *
 * @param {Object} params
 * @param {string} params.idToken
 * @returns {Promise<{ filters: Array, friend_filters: Array }>}
 */
const getFilters = async ({ idToken }) => {
  try {
    logInfo("getFilters", "Start");

    const postData = {
      data: {
        analytics: createAnalytics(),
      },
    };

    const response = await instanceLocketV2.post("getFilters", postData, {
      meta: { idToken },
    });

    const result = response.data?.result?.data ?? { filters: [], friend_filters: [] };

    logInfo("getFilters", "End");
    return result;
  } catch (error) {
    const message =
      error.response?.data?.error || error.response?.statusText || error.message;
    logError("getFilters", message);
    throw new Error(message);
  }
};

module.exports = { getFilters };
