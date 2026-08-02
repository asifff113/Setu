import type { SetuEvent } from '@setu/shared';
import { decodeBundle, encodeBundle } from './bundle';

export const POSTER_PREFIX = 'SETU1:';
export const MAX_POSTER_CHARS = 2900;

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encode a set of events into a printable poster QR payload string (`SETU1:<base64>`).
 * Trims oldest events one by one until the payload fits within MAX_POSTER_CHARS.
 */
export async function encodePosterPayload(
  events: SetuEvent[],
): Promise<{ payload: string; count: number }> {
  // Sort newest first
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  let current = sorted;

  while (current.length > 0) {
    const bundleBytes = await encodeBundle(current);
    const b64 = uint8ArrayToBase64(bundleBytes);
    const payload = `${POSTER_PREFIX}${b64}`;
    if (payload.length <= MAX_POSTER_CHARS) {
      return { payload, count: current.length };
    }
    // Drop oldest event
    current = current.slice(0, current.length - 1);
  }

  return { payload: '', count: 0 };
}

/**
 * Decode a poster QR payload string (`SETU1:<base64>`) back to SetuEvents.
 */
export async function decodePosterPayload(payload: string): Promise<SetuEvent[]> {
  if (!payload.startsWith(POSTER_PREFIX)) {
    throw new Error('invalid poster payload prefix');
  }
  const b64 = payload.slice(POSTER_PREFIX.length);
  const bytes = base64ToUint8Array(b64);
  return decodeBundle(bytes);
}
