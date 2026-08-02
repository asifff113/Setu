import { decodeChirpEvent, encodeChirpEvent, fromBase64url, toBase64url, type SetuEvent } from '@setu/shared';

/**
 * Encode a single signed event into a Link Beam URL (`https://<origin>/b#<payload>`).
 */
export function encodeLinkBeamUrl(event: SetuEvent, origin?: string): string {
  const bytes = encodeChirpEvent(event);
  const payload = toBase64url(bytes);
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/b#${payload}`;
}

/**
 * Decode a Link Beam hash or full URL into a verified single SetuEvent.
 */
export function decodeLinkBeamPayload(hashOrUrl: string): SetuEvent {
  const hash = hashOrUrl.includes('#') ? hashOrUrl.split('#')[1] ?? '' : hashOrUrl;
  if (!hash.trim()) {
    throw new Error('empty link beam payload');
  }
  const bytes = fromBase64url(hash.trim());
  return decodeChirpEvent(bytes);
}
