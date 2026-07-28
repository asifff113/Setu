/**
 * Portable base64url (RFC 4648 §5, no padding) codec for raw bytes.
 *
 * Runs identically in the browser (app) and Node (relay) with no Buffer/atob
 * dependency, so the same encoded ids/signatures verify on every device.
 */

const B64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Reverse lookup: char code -> 6-bit value, or -1 for non-alphabet chars.
const B64URL_LOOKUP: Int8Array = (() => {
  const t = new Int8Array(128).fill(-1);
  for (let i = 0; i < B64URL_ALPHABET.length; i++) {
    t[B64URL_ALPHABET.charCodeAt(i)] = i;
  }
  return t;
})();

/** Encode raw bytes to an unpadded base64url string. */
export function toBase64url(bytes: Uint8Array): string {
  // .charAt() always returns a string (never undefined), which keeps this
  // clean under noUncheckedIndexedAccess.
  const a = B64URL_ALPHABET;
  let out = '';
  let i = 0;
  const len = bytes.length;
  for (; i + 2 < len; i += 3) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8) | bytes[i + 2]!;
    out +=
      a.charAt((n >> 18) & 63) +
      a.charAt((n >> 12) & 63) +
      a.charAt((n >> 6) & 63) +
      a.charAt(n & 63);
  }
  const rem = len - i;
  if (rem === 1) {
    const n = bytes[i]! << 16;
    out += a.charAt((n >> 18) & 63) + a.charAt((n >> 12) & 63);
  } else if (rem === 2) {
    const n = (bytes[i]! << 16) | (bytes[i + 1]! << 8);
    out +=
      a.charAt((n >> 18) & 63) +
      a.charAt((n >> 12) & 63) +
      a.charAt((n >> 6) & 63);
  }
  return out;
}

/** Decode an unpadded (or padded) base64url string back to raw bytes. */
export function fromBase64url(str: string): Uint8Array {
  // Collect 6-bit values, tolerating padding + whitespace from copy-paste and
  // rejecting genuinely invalid characters.
  const vals: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c === 61 /* = */ || c === 32 || c === 10 || c === 13 || c === 9) {
      continue;
    }
    const v = c < 128 ? B64URL_LOOKUP[c]! : -1;
    if (v < 0) throw new Error(`invalid base64url char at index ${i}`);
    vals.push(v);
  }

  const out = new Uint8Array(Math.floor((vals.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let o = 0;
  for (const v of vals) {
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (acc >> bits) & 0xff;
    }
  }
  return out;
}
