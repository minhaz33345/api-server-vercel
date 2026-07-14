const sharp = require("sharp");
const heicConvert = require("heic-convert");
const {
  logInfo,
  logSuccess,
  logWarning,
  logError,
  logDebug,
  logPerformance,
  logTable,
} = require("../../utils/logEventUtils");

const CALLER_PREPARE = "prepareImage";
const CALLER_PROCESS = "processImageBuffer";

const toKB  = (bytes) => (bytes / 1024).toFixed(1) + " KB";
const toMB  = (bytes) => (bytes / 1024 / 1024).toFixed(3) + " MB";
const pct   = (after, before) => (((after - before) / before) * 100).toFixed(1) + "%";

const prepareImageForProcessing = async (imageBuffer) => {
  const t0 = Date.now();
  try {
    logInfo(CALLER_PREPARE, "Đọc buffer đầu vào", {
      raw_bytes:  imageBuffer.length,
      raw_size:   toKB(imageBuffer.length),
    });

    let image = sharp(imageBuffer).rotate(); // 🟢 Auto-fix EXIF orientation
    const metadata = await image.metadata();
    const { format, width, height, channels, density, hasAlpha } = metadata;

    logInfo(CALLER_PREPARE, `Phát hiện định dạng: ${format?.toUpperCase()}`, {
      format,
      dimensions:  `${width}x${height}`,
      channels,
      has_alpha:   hasAlpha,
      density_dpi: density || "unknown",
    });

    const unsupportedFormats = ["heif", "heic"];
    if (unsupportedFormats.includes(format?.toLowerCase())) {
      logWarning(CALLER_PREPARE, `Định dạng ${format} không hỗ trợ trực tiếp — chuyển sang JPEG trước`);

      const convertStart = Date.now();
      const jpegBuffer = await heicConvert({
        buffer: imageBuffer,
        format: "JPEG",
        quality: 1,
      });
      logSuccess(CALLER_PREPARE, `✅ Chuyển HEIC→JPEG thành công`, {
        heic_size:  toKB(imageBuffer.length),
        jpeg_size:  toKB(jpegBuffer.length),
        duration_ms: Date.now() - convertStart,
      });

      image = sharp(jpegBuffer).rotate();
    }

    logPerformance(CALLER_PREPARE, "prepareImageForProcessing", t0);
    return image;
  } catch (err) {
    logError(CALLER_PREPARE, `Lỗi chuẩn bị ảnh: ${err.message}`);
    throw new Error("Cannot prepare image format: " + err.message);
  }
};

const processImageBuffer = async ({
  imageBuffer,
  maxSizeMB = 1,
  resolution = 1440, // px cho chiều dài mỗi cạnh
}) => {
  const t0 = Date.now();
  try {
    // ── Bước 0: thông tin đầu vào ──────────────────────────────────────────
    logInfo(CALLER_PROCESS, "═══ BẮT ĐẦU XỬ LÝ ẢNH ═══", {
      input_size:  toKB(imageBuffer.length),
      input_bytes: imageBuffer.length,
      target_resolution: `${resolution}x${resolution}px`,
      max_size_mb: maxSizeMB,
    });

    // ── Bước 1: chuẩn bị & đọc metadata gốc ──────────────────────────────
    let image = await prepareImageForProcessing(imageBuffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    logInfo(CALLER_PROCESS, "📐 Kích thước gốc", {
      width_px:  width,
      height_px: height,
      aspect_ratio: width && height ? (width / height).toFixed(3) : "unknown",
      is_square: width === height ? "✅ Đã vuông" : `⚠️ Không vuông (cần crop)`,
    });

    // ── Bước 2: resize về target resolution ───────────────────────────────
    const t1 = Date.now();
    logInfo(CALLER_PROCESS, `🖼️ Resize: ${width}x${height} → ${resolution}x${resolution}px (fit: cover, crop: center)`);

    image = image.resize(resolution, resolution, {
      fit: "cover",
      position: "center",
    });

    logPerformance(CALLER_PROCESS, `Resize ${resolution}px`, t1);

    // ── Bước 3: nén webp, thử nhiều mức quality ───────────────────────────
    let quality = 90;
    let compressedBuffer;
    let attemptLog = [];

    logInfo(CALLER_PROCESS, `🗜️ Bắt đầu nén WebP (target ≤ ${maxSizeMB}MB)...`);

    while (quality >= 30) {
      const tCompress = Date.now();
      compressedBuffer = await image.webp({ quality }).toBuffer();
      const sizeBytes = compressedBuffer.length;
      const sizeMB    = (sizeBytes / 1024 / 1024).toFixed(3);
      const sizeKB    = (sizeBytes / 1024).toFixed(1);
      const ok        = sizeBytes <= maxSizeMB * 1024 * 1024;

      attemptLog.push({
        quality: `q${quality}`,
        size_kb: sizeKB,
        size_mb: sizeMB,
        result:  ok ? "✅ OK" : "❌ Quá lớn",
        ms:      Date.now() - tCompress,
      });

      logDebug(CALLER_PROCESS, `  quality=${quality} → ${sizeKB} KB (${sizeMB} MB) ${ok ? "✅" : "→ thử tiếp"}`, {
        ms: Date.now() - tCompress,
      });

      if (ok) break;
      quality -= 10;
    }

    // In bảng tổng hợp các lần thử
    logTable(CALLER_PROCESS, attemptLog, "Kết quả nén WebP theo quality");

    // ── Bước 4: fallback resize về 720px nếu vẫn quá lớn ─────────────────
    if (compressedBuffer.length > maxSizeMB * 1024 * 1024) {
      const beforeFallback = compressedBuffer.length;
      logWarning(CALLER_PROCESS, `⚠️ Vẫn quá ${maxSizeMB}MB sau khi giảm quality. Fallback: resize→720px`, {
        current_size: toKB(beforeFallback),
        target_max:   `${maxSizeMB} MB`,
      });

      const tFallback = Date.now();
      image = image.resize(720, 720, { fit: "cover", position: "center" });
      compressedBuffer = await image.webp({ quality: 70 }).toBuffer();

      logWarning(CALLER_PROCESS, `Fallback 720px xong`, {
        before: toKB(beforeFallback),
        after:  toKB(compressedBuffer.length),
        change: pct(compressedBuffer.length, beforeFallback),
        ms:     Date.now() - tFallback,
      });
    }

    // ── Bước 5: kết quả cuối ──────────────────────────────────────────────
    const finalBytes    = compressedBuffer.length;
    const compressionR  = pct(finalBytes, imageBuffer.length);

    logSuccess(CALLER_PROCESS, "✅ XỬ LÝ ẢNH HOÀN TẤT", {
      input_size:       toKB(imageBuffer.length),
      output_size:      toKB(finalBytes),
      output_size_mb:   toMB(finalBytes),
      compression_ratio: compressionR,
      final_quality:    quality,
      final_resolution: quality < 30 ? "720x720 (fallback)" : `${resolution}x${resolution}`,
      total_ms:         Date.now() - t0,
    });

    return compressedBuffer;
  } catch (err) {
    logError(CALLER_PROCESS, `❌ Lỗi xử lý ảnh: ${err.message}`, {
      stack: err.stack?.split("\n").slice(0, 4).join(" | "),
      ms:    Date.now() - t0,
    });
    throw new Error("❌ Lỗi xử lý ảnh: " + err.message);
  }
};

module.exports = {
  processImageBuffer,
};
