// utils/weatherUtils.js
// Mapping WMO weather code → SF Symbol name, WeatherKit condition string, C→F
// Dùng chung cho imagePostPayloadWeather và videoPostPayloadWeather

/**
 * WMO code → WeatherKit condition string
 * Khớp với giá trị iOS Locket gửi trong overlay.data.payload.wk_condition
 */
const WMO_TO_WK = {
  0:  "clear",
  1:  "mostlyClear",
  2:  "partlyCloudy",
  3:  "mostlyCloudy",
  45: "foggy",
  48: "foggy",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  56: "freezingDrizzle",
  57: "freezingDrizzle",
  61: "rain",
  63: "rain",
  65: "heavyRain",
  66: "freezingRain",
  67: "freezingRain",
  71: "flurries",
  73: "snow",
  75: "heavySnow",
  77: "sleet",
  80: "rain",
  81: "rain",
  82: "heavyRain",
  85: "snow",
  86: "heavySnow",
  95: "thunderstorms",
  96: "thunderstorms",
  99: "thunderstorms",
};

/**
 * WMO code + isDaylight → SF Symbol name
 * Tên file trong web/src/assets/sf-symbols/ (không có đuôi .svg)
 * Dùng làm icon.data khi icon.type = "sf_symbol"
 */
const getSfSymbol = (wmoCode, isDaylight) => {
  const d = isDaylight;
  if (wmoCode <= 1)  return d ? "sun.max.fill"        : "moon.stars.fill";
  if (wmoCode <= 2)  return d ? "cloud.sun.fill"       : "cloud.moon.fill";
  if (wmoCode <= 3)  return "cloud.fill";
  if (wmoCode <= 48) return d ? "cloud.fog.fill"       : "moon.haze.fill";
  if (wmoCode <= 57) return "cloud.drizzle.fill";
  if (wmoCode <= 64) return "cloud.rain.fill";
  if (wmoCode <= 65) return "cloud.heavyrain.fill";
  if (wmoCode <= 67) return "cloud.sleet.fill";
  if (wmoCode <= 75) return "cloud.snow.fill";
  if (wmoCode <= 77) return "snowflake";
  if (wmoCode <= 81) return "cloud.rain.fill";
  if (wmoCode <= 82) return "cloud.heavyrain.fill";
  if (wmoCode <= 86) return "cloud.snow.fill";
  if (wmoCode <= 95) return d ? "cloud.bolt.fill"      : "cloud.moon.bolt.fill";
  return "cloud.bolt.rain.fill"; // 96–99
};

/** WMO code → WeatherKit condition string, fallback "partlyCloudy" */
const getWkCondition = (wmoCode) => WMO_TO_WK[wmoCode] ?? "partlyCloudy";

/** Celsius → Fahrenheit */
const celsiusToFahrenheit = (c) => (c * 9) / 5 + 32;

module.exports = { getSfSymbol, getWkCondition, celsiusToFahrenheit };
