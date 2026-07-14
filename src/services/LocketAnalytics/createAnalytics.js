// Giá trị lấy trực tiếp từ traffic thực của Locket iOS app

const I64 = (value) => ({
  "@type": "type.googleapis.com/google.protobuf.Int64Value",
  value:   value.toString(),
});

// device_id cố định per server process (giống real app dùng 1 UUID suốt session)
const DEVICE_ID = "9E43DF0E-F780-44D5-A692-64A8D5EDDBE9";

const createAnalytics = () => ({
  platform:    "ios",
  ios_version: "2.50.0.1",

  amplitude: {
    device_id:  DEVICE_ID,
    session_id: I64(Date.now()),
  },

  google_analytics: {
    app_instance_id: "EBD387CC32CA450EAF208550DB7466EB",
  },

  // Experiments — lấy từ real app traffic (tất cả đều đúng)
  experiments: {
    flag_3:  I64(600),
    flag_4:  I64(43),
    flag_5:  I64(400),
    flag_6:  I64(2000),
    flag_7:  I64(802),
    flag_9:  I64(20),
    flag_10: I64(505),
    flag_11: I64(1002),
    flag_13: I64(901),
    flag_14: I64(502),
    flag_16: I64(501),
    flag_18: I64(1203),
    flag_22: I64(1203),
    flag_25: I64(76),
  },
});

module.exports = { createAnalytics };
