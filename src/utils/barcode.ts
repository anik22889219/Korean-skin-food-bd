import { Product } from '../types';
import { Html5Qrcode } from 'html5-qrcode';

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

/**
 * STEP 2: Single, reusable barcode normalization function.
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

  // Convert to string safely without losing leading zeros or turning numbers to scientific notation
  let str = typeof value === 'string' ? value : String(value);

  // Remove invisible unicode control characters (e.g., \u200B zero-width space, \uFEFF BOM, \u0000-\u001F)
  str = str.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '');

  // Trim whitespace
  str = str.trim();

  // Remove accidental spaces and hyphens
  str = str.replace(/[\s\-]/g, '');

  // Uppercase for Code 128 / QR codes
  return str.toUpperCase();
}

/**
 * STEP 9: Barcode Format Validation
 * Supports EAN-13, EAN-8, UPC-A, Code 128, and custom alphanumeric QR codes.
 */
export function validateBarcodeFormat(value: unknown): {
  isValid: boolean;
  format: 'EAN-13' | 'EAN-8' | 'UPC-A' | 'CODE-128' | 'QR-CODE' | 'EMPTY' | 'UNKNOWN';
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

  // UPC-A: 12 digits (Common in US/Canada or 12-digit legacy)
  if (/^\d{12}$/.test(normalized)) {
    return { isValid: true, format: 'UPC-A', warning: '12-digit code detected (UPC-A or legacy format)' };
  }

  // EAN-8: 8 digits
  if (/^\d{8}$/.test(normalized)) {
    return { isValid: true, format: 'EAN-8' };
  }

  // Code 128 or Alphanumeric Retail Barcode (3 to 32 alphanumeric chars)
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

  // Handle URLs like /pos/product/{id} or /product/{id} or https://example.com/item/123
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
 * STEP 5: Product Lookup Logic
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
 * STEP 7: Duplicate Barcode Validation
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
 * STEP 8: Barcode Data Audit Tool
 * Generates audit statistics and flags invalid, missing, unnormalized or duplicate barcodes.
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

    // Check if raw barcode differs from normalized
    if (raw !== norm) {
      differingBarcodes.push({ product: p, raw, normalized: norm });
    }

    // Check if raw has leading/trailing spaces or hyphens or unnormalized format
    if (raw.trim() !== raw || raw.includes('-') || raw.includes(' ')) {
      unnormalizedBarcodes.push({ product: p, raw, normalized: norm });
    }

    // Check format validation
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
 * Google Lens style photo barcode scanner.
 * Decodes barcodes directly from high-resolution, focused static photos / uploaded image files.
 * Bypasses video motion blur issues completely!
 */
export async function scanBarcodeFromImageFile(file: File): Promise<string | null> {
  if (!file) return null;

  // 1. Try Html5Qrcode scanFile
  try {
    let element = document.getElementById("temp-photo-scan-node");
    if (!element) {
      element = document.createElement("div");
      element.id = "temp-photo-scan-node";
      element.style.display = "none";
      document.body.appendChild(element);
    }

    const html5QrCode = new Html5Qrcode("temp-photo-scan-node");
    const scannedResult = await html5QrCode.scanFile(file, false);
    if (scannedResult) {
      const extracted = extractCodeFromScanText(scannedResult);
      const norm = normalizeBarcode(extracted);
      if (norm) return norm;
    }
  } catch (err) {
    console.warn("Html5Qrcode.scanFile image decode error:", err);
  }

  // 2. Native BarcodeDetector API fallback
  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
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
        return normalizeBarcode(extracted);
      }
    } catch (err) {
      console.warn("Native BarcodeDetector image decode error:", err);
    }
  }

  return null;
}

/**
 * Applies hardware zoom and focus constraints to the active video track in a container
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

    // 1. High Resolution constraints (1080p ideal) to avoid pixelated/blurry barcodes
    if (options.highRes !== false) {
      mainConstraints.width = { ideal: 1920, min: 1280 };
      mainConstraints.height = { ideal: 1080, min: 720 };
    }

    // 2. Continuous Auto-Focus and Hardware Zoom constraints
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

      // Trigger re-focus calibration if requested
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
 * Google Lens Live Video Snapshot barcode scanner.
 * Captures a high-resolution, sharp frame directly from the active live video stream,
 * eliminating motion blur and decoding instantly without opening any file dialog!
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

    // 1. Try Native BarcodeDetector directly on <video> element (Instant hardware acceleration)
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      try {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code', 'data_matrix']
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

    // 2. Draw canvas frame at full resolution & enhance contrast
    const canvas = document.createElement("canvas");
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(videoEl, 0, 0, videoWidth, videoHeight);

    // Convert canvas to File blob and decode via scanBarcodeFromImageFile
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.95));
    if (!blob) return null;

    const snapshotFile = new File([blob], `lens_snapshot_${Date.now()}.jpg`, { type: 'image/jpeg' });
    return await scanBarcodeFromImageFile(snapshotFile);
  } catch (err) {
    console.error("Live video snapshot error:", err);
    return null;
  }
}
