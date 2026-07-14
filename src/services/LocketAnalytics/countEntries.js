/**
 * countEntries.js
 * Đếm tổng số entries (moments) của một user trong Firestore
 * bằng cách gọi runAggregationQuery — giống hệt logic trong main.ts gốc
 */

const { instanceFirestore } = require("../../libs");
const { firebase } = require("../../config/app.config");
const { logInfo, logSuccess, logError } = require("../../utils/logEventUtils");

const DB_ID = "locket";

/**
 * Build body cho runAggregationQuery — đếm entries của userId
 * @param {string} projectId  - Firebase project ID (vd: "locket-4252a")
 * @param {string} userId     - UID của user cần đếm
 */
function buildCountBody(projectId, userId) {
  return {
    parent: `projects/${projectId}/databases/${DB_ID}/documents/history/${userId}`,
    structured_aggregation_query: {
      structured_query: {
        from: [{ collection_id: "entries" }],
        where: {
          field_filter: {
            field: { field_path: "user" },
            op: "EQUAL",
            value: { string_value: userId },
          },
        },
        order_by: [
          { direction: "DESCENDING", field: { field_path: "date" } },
          { direction: "DESCENDING", field: { field_path: "__name__" } },
        ],
      },
      aggregations: [{ alias: "count", count: {} }],
    },
  };
}

/**
 * Gọi Firestore runAggregationQuery và trả về số lượng entries
 * @param {string} idToken  - Firebase ID token của user (Bearer)
 * @param {string} userId   - UID của user
 * @returns {Promise<number>}
 */
async function countEntries(idToken, userId) {
  const projectId = firebase.projectId;

  const body = buildCountBody(projectId, userId);

  logInfo(
    "countEntries",
    `📊 Đang đếm entries cho user: ${userId}`
  );

  // instanceFirestore.baseURL = FIREBASE_FIRESTORE_API_BASE
  //   = "https://firestore.googleapis.com/v1/projects/locket-4252a/databases/"
  // → full URL: .../databases/locket/documents/history/{userId}:runAggregationQuery
  const response = await instanceFirestore.post(
    `/locket/documents/history/${userId}:runAggregationQuery`,
    body,
    { meta: { idToken } }
  );

  // Firestore trả về mảng, phần tử đầu chứa kết quả
  const data = response.data;
  const item = Array.isArray(data) ? data[0] : data;

  const aggFields =
    item?.result?.aggregateFields ?? item?.result?.aggregate_fields;

  const countValue =
    aggFields?.count?.integerValue ?? aggFields?.count?.integer_value;

  const total = countValue ? Number(countValue) : 0;

  logSuccess("countEntries", `✅ User ${userId} có ${total} entries`);

  return total;
}

module.exports = { countEntries };
