import { Product } from '../types';
import { BrowserMultiFormatReader, BarcodeFormat, IScannerControls } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';

export interface BarcodeDebugInfo {
  rawValue: string;
  extractedCode: string;
  normalizedValue: string;
  matchFound: boolean;
  matchedProductId?: string;
  matchedProductName?: string;
  matchedProductBarcode?: string;
  matchedProductNormalizedBarcode?: string;
  matchStrategy?: 'barcodeNormalized' | 'legacyBarcode' | 'productId' | 'none';
  exactSearchTerm?: string;
}

export interface BarcodeAuditReport {
  totalProducts: number;
  missingBarcodes: Product[];
  duplicateBarcodes: { normalizedBarcode: string; products: Product[] }[];
  unnormalizedBarcodes: { product: Product; raw: string; normalized: string }[];
  invalidFormatBarcodes: { product: Product; raw: string; reason: string }[];
  differingBarcodes: { product: Product; raw: string; normalized: string }[];
}

export interface ScannerStartOptions {
  containerId: string;
  useFrontCamera?: boolean;
  onScanSuccess: (scannedText: string) => void;
  onError?: (errorMessage: string) => void;
  debounceMs?: number;
}

export interface ScannerController {
  stop: () => Promise<void>;
  applyZoom: (zoom: number) => Promise<boolean>;
  triggerRefocus: () => Promise<boolean>;
}

/**
 * Single, reusable barcode normalization function.
 * All barcode operations across AI import, creation, editing, mobile scanner,
 * manual input, lookups, POS scanning, and duplicate validation MUST use this.
 *
 * Rules:
 * 1. Converts input to string (never casts or parses to JS numbers, preserving leading zeros).
 * 2. Trims leading/trailing whitespace.
 * 3. Removes invisible control characters, newlines, tabs, zero-width spaces.
 * 4. Removes spaces and hyphens.
 * 5. Converts letters to uppercase for alphanumeric formats (Code 128/QR).
 */
export function normalizeBarcode(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = typeof value === 'string' ? value : String(value);
  str = str.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');
  str = str.trim();
  str = str.replace(/[\s\-]/g, '');
  return str.toUpperCase();
}

/**
 * Barcode Format Validation
 * Supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, and custom QR codes.
 */
export function validateBarcodeFormat(value: unknown): {
  isValid: boolean;
  format: 'EAN-13' | 'EAN-8' | 'UPC-A' | 'UPC-E' | 'CODE-128' | 'CODE-39' | 'QR-CODE' | 'EMPTY' | 'UNKNOWN';
  warning?: string;
} {
  const normalized = normalizeBarcode(value);

  if (!normalized) {
    return { isValid: false, format: 'EMPTY', warning: 'Barcode is missing or empty' };
  }

  // EAN-13: 13 digits
  if (/^\d{13}$/.test(normalized)) {
    return { isValid: true, format: 'EAN-13' };
  }

  // UPC-A: 12 digits
  if (/^\d{12}$/.test(normalized)) {
    return { isValid: true, format: 'UPC-A', warning: '12-digit code detected (UPC-A format)' };
  }

  // EAN-8: 8 digits
  if (/^\d{8}$/.test(normalized)) {
    return { isValid: true, format: 'EAN-8' };
  }

  // UPC-E: 6 digits
  if (/^\d{6}$/.test(normalized)) {
    return { isValid: true, format: 'UPC-E' };
  }

  // Code 128 / Code 39 or Alphanumeric Retail Barcode (3 to 32 alphanumeric chars)
  if (/^[A-Z0-9_\.]{3,32}$/.test(normalized)) {
    return { isValid: true, format: 'CODE-128' };
  }

  // URL or QR code string
  if (normalized.startsWith('HTTP') || normalized.includes('/') || normalized.length > 32) {
    return { isValid: true, format: 'QR-CODE' };
  }

  return {
    isValid: false,
    format: 'UNKNOWN',
    warning: 'Barcode contains unsupported special characters or invalid structure'
  };
}

/**
 * Extracts raw barcode / ID from URLs if scanner reads a full URL path.
 */
export function extractCodeFromScanText(rawText: string): string {
  if (!rawText) return '';
  let trimmed = rawText.trim();

  const indicator = '/pos/product/';
  const index = trimmed.indexOf(indicator);

  if (index !== -1) {
    trimmed = trimmed.substring(index + indicator.length).trim();
    trimmed = trimmed.split('?')[0].split('#')[0].replace(/\/$/, '');
  } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        trimmed = parts[parts.length - 1];
      }
    } catch (e) {
      // ignore URL parse error
    }
  }

  return trimmed;
}

/**
 * Product Lookup Logic
 * 1. Extract and normalize scanned barcode.
 * 2. Search barcodeNormalized first (exact match).
 * 3. Fall back to normalized legacy barcode values (exact match).
 * 4. Search product ID only when appropriate (exact match).
 * 5. Never use loose partial matching for barcodes.
 */
export function findProductByScannedCode(
  products: Product[],
  rawScanText: string
): { product: Product | undefined; debugInfo: BarcodeDebugInfo } {
  const extracted = extractCodeFromScanText(rawScanText);
  const normalized = normalizeBarcode(extracted);

  const debugInfo: BarcodeDebugInfo = {
    rawValue: rawScanText,
    extractedCode: extracted,
    normalizedValue: normalized,
    matchFound: false,
    exactSearchTerm: normalized
  };

  if (!normalized && !extracted) {
    return { product: undefined, debugInfo };
  }

  // 1. Search barcodeNormalized first (Exact Match)
  let matchedProduct = products.find(p => p.barcodeNormalized && p.barcodeNormalized === normalized);
  if (matchedProduct) {
    debugInfo.matchFound = true;
    debugInfo.matchedProductId = matchedProduct.id;
    debugInfo.matchedProductName = matchedProduct.name;
    debugInfo.matchedProductBarcode = matchedProduct.barcode;
    debugInfo.matchedProductNormalizedBarcode = matchedProduct.barcodeNormalized;
    debugInfo.matchStrategy = 'barcodeNormalized';
    return { product: matchedProduct, debugInfo };
  }

  // 2. Fall back to normalized legacy barcode values
  matchedProduct = products.find(p => p.barcode && normalizeBarcode(p.barcode) === normalized);
  if (matchedProduct) {
    debugInfo.matchFound = true;
    debugInfo.matchedProductId = matchedProduct.id;
    debugInfo.matchedProductName = matchedProduct.name;
    debugInfo.matchedProductBarcode = matchedProduct.barcode;
    debugInfo.matchedProductNormalizedBarcode = matchedProduct.barcodeNormalized || normalizeBarcode(matchedProduct.barcode);
    debugInfo.matchStrategy = 'legacyBarcode';
    return { product: matchedProduct, debugInfo };
  }

  // 3. Search product ID only when appropriate (exact match)
  matchedProduct = products.find(p => p.id === extracted || p.id === normalized || p.id.toLowerCase() === extracted.toLowerCase());
  if (matchedProduct) {
    debugInfo.matchFound = true;
    debugInfo.matchedProductId = matchedProduct.id;
    debugInfo.matchedProductName = matchedProduct.name;
    debugInfo.matchedProductBarcode = matchedProduct.barcode;
    debugInfo.matchedProductNormalizedBarcode = matchedProduct.barcodeNormalized || normalizeBarcode(matchedProduct.barcode);
    debugInfo.matchStrategy = 'productId';
    return { product: matchedProduct, debugInfo };
  }

  // No match found
  debugInfo.matchStrategy = 'none';
  return { product: undefined, debugInfo };
}

/**
 * Duplicate Barcode Validation
 * Checks if a normalized barcode already exists on another product.
 */
export function checkDuplicateBarcode(
  products: Product[],
  barcodeToTest: string | null | undefined,
  excludeProductId?: string
): { isDuplicate: boolean; conflictingProduct?: Product } {
  const normalized = normalizeBarcode(barcodeToTest);
  if (!normalized) {
    return { isDuplicate: false };
  }

  const conflict = products.find(p => {
    if (excludeProductId && p.id === excludeProductId) {
      return false;
    }
    const normP = p.barcodeNormalized || normalizeBarcode(p.barcode);
    return normP === normalized;
  });

  if (conflict) {
    return { isDuplicate: true, conflictingProduct: conflict };
  }

  return { isDuplicate: false };
}

/**
 * Barcode Data Audit Tool
 */
export function auditProductsBarcodes(products: Product[]): BarcodeAuditReport {
  const missingBarcodes: Product[] = [];
  const unnormalizedBarcodes: { product: Product; raw: string; normalized: string }[] = [];
  const invalidFormatBarcodes: { product: Product; raw: string; reason: string }[] = [];
  const differingBarcodes: { product: Product; raw: string; normalized: string }[] = [];

  const barcodeMap = new Map<string, Product[]>();

  products.forEach(p => {
    const raw = p.barcode || '';
    const norm = p.barcodeNormalized || normalizeBarcode(raw);

    if (!raw && !norm) {
      missingBarcodes.push(p);
      return;
    }

    if (norm) {
      const existing = barcodeMap.get(norm) || [];
      existing.push(p);
      barcodeMap.set(norm, existing);
    }

    if (raw !== norm) {
      differingBarcodes.push({ product: p, raw, normalized: norm });
    }

    if (raw.trim() !== raw || raw.includes('-') || raw.includes(' ')) {
      unnormalizedBarcodes.push({ product: p, raw, normalized: norm });
    }

    const valResult = validateBarcodeFormat(raw);
    if (!valResult.isValid) {
      invalidFormatBarcodes.push({ product: p, raw, reason: valResult.warning || 'Invalid format' });
    }
  });

  const duplicateBarcodes: { normalizedBarcode: string; products: Product[] }[] = [];
  barcodeMap.forEach((prods, normBarcode) => {
    if (prods.length > 1) {
      duplicateBarcodes.push({ normalizedBarcode: normBarcode, products: prods });
    }
  });

  return {
    totalProducts: products.length,
    missingBarcodes,
    duplicateBarcodes,
    unnormalizedBarcodes,
    invalidFormatBarcodes,
    differingBarcodes
  };
}

/**
 * Helper to create ZXing MultiFormat hints focusing on 1D barcodes and 2D QR codes
 */
function createZXingHints(): Map<DecodeHintType, any> {
  const hints = new Map<DecodeHintType, any>();
  const possibleFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, possibleFormats);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

/**
 * Photo image file barcode scanner powered by ZXing and native BarcodeDetector.
 */
export async function scanBarcodeFromImageFile(file: File): Promise<string | null> {
  if (!file) return null;

  // 1. Native BarcodeDetector API (fastest hardware acceleration)
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix', 'itf', 'codabar']
      });
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = objectUrl;
      });
      const detected = await barcodeDetector.detect(img);
      URL.revokeObjectURL(objectUrl);
      if (detected && detected.length > 0 && detected[0].rawValue) {
        const extracted = extractCodeFromScanText(detected[0].rawValue);
        const norm = normalizeBarcode(extracted);
        if (norm) return norm;
      }
    } catch (err) {
      console.warn("Native BarcodeDetector photo decode error:", err);
    }
  }

  // 2. ZXing BrowserMultiFormatReader decode via Blob Object URL
  try {
    const hints = createZXingHints();
    const reader = new BrowserMultiFormatReader(hints);
    const objectUrl = URL.createObjectURL(file);
    const result = await reader.decodeFromImageUrl(objectUrl);
    URL.revokeObjectURL(objectUrl);
    if (result && result.getText()) {
      const extracted = extractCodeFromScanText(result.getText());
      const norm = normalizeBarcode(extracted);
      if (norm) return norm;
    }
  } catch (err) {
    console.warn("ZXing decodeFromImageUrl error:", err);
  }

  // 3. Fallback: Draw on high-contrast canvas & decode via ZXing
  try {
    const hints = createZXingHints();
    const reader = new BrowserMultiFormatReader(hints);
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(objectUrl);

      // Contrast enhancement for dark/blurry photos
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const v = avg > 115 ? 255 : 0;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
      ctx.putImageData(imageData, 0, 0);

      const result = await reader.decodeFromCanvas(canvas);
      if (result && result.getText()) {
        const extracted = extractCodeFromScanText(result.getText());
        return normalizeBarcode(extracted);
      }
    } else {
      URL.revokeObjectURL(objectUrl);
    }
  } catch (err) {
    console.warn("ZXing canvas enhancement decode error:", err);
  }

  return null;
}

/**
 * Applies hardware zoom and focus constraints to the active video track in a container.
 */
export async function applyCameraTrackConstraints(
  containerId: string, 
  options: { zoom?: number; triggerFocus?: boolean; highRes?: boolean } = {}
): Promise<boolean> {
  try {
    const videoEl = document.querySelector(`#${containerId} video`) as HTMLVideoElement;
    if (!videoEl || !videoEl.srcObject) return false;

    const stream = videoEl.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    if (!track) return false;

    const mainConstraints: any = {};
    const advancedConstraints: any = {};

    if (options.highRes !== false) {
      mainConstraints.width = { ideal: 1920, min: 1280 };
      mainConstraints.height = { ideal: 1080, min: 720 };
    }

    if (track.getCapabilities) {
      const caps = track.getCapabilities() as any;
      if (options.zoom !== undefined && caps.zoom) {
        const targetZoom = Math.min(Math.max(options.zoom, caps.zoom.min || 1), caps.zoom.max || 10);
        advancedConstraints.zoom = targetZoom;
      }
      if (caps.focusMode) {
        if (caps.focusMode.includes('continuous')) {
          advancedConstraints.focusMode = 'continuous';
        } else if (caps.focusMode.includes('single-shot')) {
          advancedConstraints.focusMode = 'single-shot';
        }
      }
    } else {
      advancedConstraints.focusMode = 'continuous';
    }

    const finalConstraints: any = { ...mainConstraints };
    if (Object.keys(advancedConstraints).length > 0) {
      finalConstraints.advanced = [advancedConstraints];
    }

    if (Object.keys(finalConstraints).length > 0) {
      await track.applyConstraints(finalConstraints);

      if (options.triggerFocus && track.getCapabilities) {
        const caps = track.getCapabilities() as any;
        if (caps.focusMode && caps.focusMode.includes('single-shot') && caps.focusMode.includes('continuous')) {
          setTimeout(async () => {
            try {
              await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' }] } as any);
              setTimeout(async () => {
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as any);
              }, 120);
            } catch (e) {
              // quiet fail
            }
          }, 100);
        }
      }
      return true;
    }
  } catch (err) {
    console.warn("Error applying camera track constraints:", err);
  }
  return false;
}

/**
 * Captures a high-resolution, sharp frame directly from the active live video stream.
 */
export async function scanBarcodeFromLiveVideoSnapshot(containerId: string): Promise<string | null> {
  try {
    const videoEl = document.querySelector(`#${containerId} video`) as HTMLVideoElement;
    if (!videoEl || videoEl.readyState < 2) {
      console.warn("Live video not ready for snapshot");
      return null;
    }

    const videoWidth = videoEl.videoWidth || 1280;
    const videoHeight = videoEl.videoHeight || 720;

    // 1. Try Native BarcodeDetector directly on <video> element
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix', 'itf', 'codabar']
        });
        const detected = await barcodeDetector.detect(videoEl);
        if (detected && detected.length > 0 && detected[0].rawValue) {
          const extracted = extractCodeFromScanText(detected[0].rawValue);
          const norm = normalizeBarcode(extracted);
          if (norm) return norm;
        }
      } catch (e) {
        console.warn("Direct video BarcodeDetector error:", e);
      }
    }

    // 2. Draw canvas frame at full resolution & decode via scanBarcodeFromImageFile
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0, videoWidth, videoHeight);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) return null;

    const snapshotFile = new File([blob], `lens_snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
    return await scanBarcodeFromImageFile(snapshotFile);
  } catch (err) {
    console.error("Live video snapshot error:", err);
    return null;
  }
}

/**
 * Start Unified Real-time Camera Barcode Scanner using ZXing + native BarcodeDetector hybrid engine.
 * Includes complete stream lifecycle management, track release, camera switching, and debounce protection.
 */
export async function startUnifiedCameraScanner(options: ScannerStartOptions): Promise<ScannerController> {
  const { containerId, useFrontCamera = false, onScanSuccess, onError, debounceMs = 1200 } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Container element #${containerId} not found`);
  }

  // Clear existing children from container
  container.innerHTML = '';

  // Create video element
  const videoEl = document.createElement('video');
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.style.width = '100%';
  videoEl.style.height = '100%';
  videoEl.style.objectFit = 'cover';
  container.appendChild(videoEl);

  let mediaStream: MediaStream | null = null;
  let isStopped = false;
  let animationFrameId: number | null = null;
  let nativeDetector: any = null;
  let lastScannedCode = '';
  let lastScanTime = 0;

  // Initialize Native BarcodeDetector if available
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      nativeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix', 'itf', 'codabar']
      });
    } catch (e) {
      console.warn("BarcodeDetector init error:", e);
    }
  }

  // Setup ZXing BrowserMultiFormatReader
  const hints = createZXingHints();
  const reader = new BrowserMultiFormatReader(hints);
  let zxingControls: IScannerControls | null = null;

  // Request Camera Stream
  try {
    const targetFacingMode = useFrontCamera ? "user" : "environment";
    const videoConstraints: MediaTrackConstraints = {
      facingMode: { ideal: targetFacingMode },
      width: { ideal: 1920, min: 1280 },
      height: { ideal: 1080, min: 720 }
    };

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    } catch (firstErr: any) {
      console.warn("First camera getUserMedia attempt failed, retrying with basic video constraint:", firstErr);
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: targetFacingMode }, audio: false });
    }

    if (isStopped) {
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
      }
      return {
        stop: async () => {},
        applyZoom: async () => false,
        triggerRefocus: async () => false
      };
    }

    videoEl.srcObject = mediaStream;
    await videoEl.play().catch(() => {});

    // Apply auto-focus & zoom constraints after track starts
    setTimeout(() => {
      if (!isStopped) {
        applyCameraTrackConstraints(containerId, { zoom: 1.5, triggerFocus: true });
      }
    }, 500);

    // Process scan result with debounce
    const processScannedResult = (rawText: string) => {
      if (!rawText || isStopped) return;
      const extracted = extractCodeFromScanText(rawText);
      const norm = normalizeBarcode(extracted);
      if (!norm) return;

      const now = Date.now();
      if (norm === lastScannedCode && (now - lastScanTime) < debounceMs) {
        return; // Skip duplicate scan within debounce window
      }

      lastScannedCode = norm;
      lastScanTime = now;
      onScanSuccess(norm);
    };

    // 1. Hybrid Native Loop (runs on requestAnimationFrame when native BarcodeDetector is available)
    let isDecodingFrame = false;
    const scanNativeFrame = async () => {
      if (isStopped) return;
      if (nativeDetector && videoEl.readyState >= 2 && !isDecodingFrame) {
        isDecodingFrame = true;
        try {
          const detected = await nativeDetector.detect(videoEl);
          if (detected && detected.length > 0 && detected[0].rawValue) {
            processScannedResult(detected[0].rawValue);
          }
        } catch (e) {
          // ignore frame detect errors
        } finally {
          isDecodingFrame = false;
        }
      }
      if (!isStopped) {
        animationFrameId = requestAnimationFrame(scanNativeFrame);
      }
    };

    if (nativeDetector) {
      animationFrameId = requestAnimationFrame(scanNativeFrame);
    }

    // 2. ZXing Continuous Decoder on Video Element
    try {
      zxingControls = await reader.decodeFromVideoElement(videoEl, (result, error) => {
        if (isStopped) return;
        if (result && result.getText()) {
          processScannedResult(result.getText());
        }
      });
    } catch (e) {
      console.warn("ZXing decodeFromVideoElement error:", e);
    }

  } catch (err: any) {
    console.error("Camera scanner startup failed:", err);
    let errMsg = "Unable to access camera.";

    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      errMsg = "Camera access permission was denied. Please allow camera access in browser settings and reload.";
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      errMsg = "No camera hardware detected on this device.";
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      errMsg = "Camera is currently in use by another application or tab. Please close other camera apps and try again.";
    } else if (err.name === 'OverconstrainedError') {
      errMsg = "Requested camera configuration is not supported by your device camera.";
    }

    if (onError) {
      onError(errMsg);
    }
    throw new Error(errMsg);
  }

  // Define stop cleanup function
  const stop = async () => {
    if (isStopped) return;
    isStopped = true;

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    if (zxingControls) {
      try {
        zxingControls.stop();
      } catch (e) {
        // ignore zxing stop error
      }
      zxingControls = null;
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (e) {
          // quiet fail
        }
      });
      mediaStream = null;
    }

    if (videoEl) {
      videoEl.srcObject = null;
    }

    container.innerHTML = '';
  };

  // Visibility change listener to stop tracks if page is hidden
  const handleVisibilityChange = () => {
    if (document.hidden) {
      stop();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    stop: async () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      await stop();
    },
    applyZoom: async (zoom: number) => {
      return await applyCameraTrackConstraints(containerId, { zoom, triggerFocus: true });
    },
    triggerRefocus: async () => {
      return await applyCameraTrackConstraints(containerId, { triggerFocus: true });
    }
  };
}
