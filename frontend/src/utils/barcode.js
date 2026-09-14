/**
 * Barcode Scanner Utility for multi-layout keyboards (AZERTY / QWERTY).
 * 
 * Problem:
 * Hardware barcode scanners (such as ZKTeco) send standard USB HID scancodes without Shift.
 * On French / Belgian AZERTY keyboards, unshifted top-row keys produce symbols:
 * & é " ' ( - è _ ç à
 * instead of:
 * 1 2 3 4 5 6 7 8 9 0
 */

export const AZERTY_TO_DIGIT_MAP = {
  '&': '1',
  'é': '2',
  'É': '2',
  '"': '3',
  "'": '4',
  '(': '5',
  '-': '6',
  '§': '6', // Belgian AZERTY layout variant
  'è': '7',
  'È': '7',
  '_': '8',
  'ç': '9',
  'Ç': '9',
  'à': '0',
  'À': '0',
};

/**
 * Checks whether a string contains characters characteristic of an AZERTY-typed numeric barcode.
 * Examples: "('(-ç_'" or "à('(-ç_'" -> true
 */
export const isAzertyBarcode = (input) => {
  if (!input || typeof input !== 'string') return false;
  const trimmed = input.trim();
  if (!trimmed || /^\d+$/.test(trimmed)) return false;

  // Check if it contains at least one AZERTY number-row symbol
  const hasAzertyChar = /[&éÉ"'(\-§èÈ_çÇàÀ]/.test(trimmed);
  if (!hasAzertyChar) return false;

  // When converted, does it become purely numeric?
  const converted = normalizeBarcode(trimmed);
  return /^\d{2,}$/.test(converted);
};

/**
 * Normalizes an AZERTY-encoded barcode string into digits.
 * If the string contains AZERTY digit characters, converts them to digits.
 * Examples:
 *   "('(-ç_'" -> "5456984"
 *   "à('(-ç_'" -> "05456984"
 *   "12345678" -> "12345678"
 */
export const normalizeBarcode = (input) => {
  if (!input || typeof input !== 'string') return '';
  const trimmed = input.trim();
  if (!trimmed) return '';

  let result = '';
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (AZERTY_TO_DIGIT_MAP[ch] !== undefined) {
      result += AZERTY_TO_DIGIT_MAP[ch];
    } else {
      result += ch;
    }
  }
  return result;
};

/**
 * Decodes a KeyboardEvent coming from a barcode scanner.
 * Hardware scancode (`e.code`) is layout-independent:
 *   'Digit1' -> '1', 'Digit2' -> '2', etc.
 * Falls back to AZERTY_TO_DIGIT_MAP if `e.code` is unavailable.
 */
export const decodeScannerKey = (e) => {
  if (!e) return '';

  // 1. Hardware scancode: Digit0 - Digit9 (layout-independent in standard browsers)
  if (e.code && /^Digit([0-9])$/.test(e.code)) {
    return e.code.replace('Digit', '');
  }

  // 2. Hardware scancode: Numpad0 - Numpad9
  if (e.code && /^Numpad([0-9])$/.test(e.code)) {
    return e.code.replace('Numpad', '');
  }

  // 3. Fallback to AZERTY key character mapping
  if (e.key && AZERTY_TO_DIGIT_MAP[e.key] !== undefined) {
    return AZERTY_TO_DIGIT_MAP[e.key];
  }

  // 4. Return standard single character (letters/digits)
  if (e.key && e.key.length === 1) {
    return e.key;
  }

  return '';
};
