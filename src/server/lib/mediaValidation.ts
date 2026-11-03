/**
 * Media Upload Validation for Diagram Labeling (C2 — Visual Mastery Lab)
 * Strict magic-byte detection. Supported types: PNG, JPEG, WebP. Max 2 MB.
 * SVG (script/XSS risk) and GIF are explicitly rejected.
 */

export interface ImageUploadPayload {
  mimeType: string;
  bytes: Uint8Array;
  fileName?: string;
  maxBytes?: number;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

function detectMimeType(bytes: Uint8Array): string | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // WebP: RIFF (bytes 0-3) .... WEBP (bytes 8-11)
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50   // P
  ) {
    return 'image/webp';
  }

  // GIF: GIF87a or GIF89a
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38 &&
    (bytes[4] === 0x37 || bytes[4] === 0x39) &&
    bytes[5] === 0x61
  ) {
    return 'image/gif';
  }

  // Check for SVG text
  try {
    const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 512))).trim().toLowerCase();
    if (head.includes('<svg') || (head.includes('<?xml') && head.includes('svg'))) {
      return 'image/svg+xml';
    }
  } catch {
    // Not text
  }

  return null;
}

export function validateImageUpload(payload: ImageUploadPayload): ImageValidationResult {
  const { mimeType, bytes, maxBytes = 2 * 1024 * 1024 } = payload;

  if (!bytes || bytes.length === 0) {
    return { valid: false, error: 'File is empty' };
  }

  if (bytes.length > maxBytes) {
    return { valid: false, error: `File size (${bytes.length} bytes) exceeds maximum allowed size of ${maxBytes} bytes` };
  }

  const detected = detectMimeType(bytes);

  if (detected === 'image/svg+xml') {
    return { valid: false, error: 'SVG uploads are rejected due to script execution risks' };
  }

  if (detected === 'image/gif') {
    return { valid: false, error: 'GIF images are not supported for diagram labeling' };
  }

  if (!detected || !['image/png', 'image/jpeg', 'image/webp'].includes(detected)) {
    return { valid: false, error: 'Unsupported or unidentifiable image format. Allowed: PNG, JPEG, WebP' };
  }

  // Normalize declared mime (e.g. image/jpg -> image/jpeg)
  const normDeclared = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType;
  if (normDeclared !== detected) {
    return { valid: false, error: `Declared MIME type (${mimeType}) does not match detected image format (${detected})` };
  }

  return { valid: true, detectedMime: detected };
}
