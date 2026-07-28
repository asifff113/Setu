/**
 * Trusted bulletin publishers.
 *
 * A bulletin (`t: 'bulletin'`) earns the ✓ verified badge only when its author
 * key is in this pinned list AND its signature verifies. Any other signed
 * bulletin renders as ⚠ "unverified" — still shown, never trusted.
 *
 * Add your own demo publisher key here (base64url of the 32-byte public key).
 * The matching secret is pasted into the hidden /publish composer at demo time;
 * it is never bundled into the app.
 */
import { verifyEvent } from './codec.js';
import type { SetuEvent } from './types.js';

export const PINNED_PUBLISHERS: readonly string[] = [
  // TODO(demo): replace with your publisher public key, e.g.
  // 'sTgUeZ0m0oQ1wX2yq3r4s5t6u7v8w9x0y1z2A3B4C5D6',
];

/** True if `author` (base64url pubkey) is a pinned trusted publisher. */
export function isPinnedPublisher(author: string): boolean {
  return PINNED_PUBLISHERS.includes(author);
}

/** Trust level for a bulletin card badge. */
export type BulletinTrust = 'verified' | 'unverified' | 'invalid';

/**
 * Classify a bulletin for display:
 *   - 'invalid'     signature/id do not verify (drop or hide)
 *   - 'verified'    signature valid AND author is pinned  → ✓
 *   - 'unverified'  signature valid but author not pinned → ⚠
 */
export function bulletinTrust(event: SetuEvent): BulletinTrust {
  if (!verifyEvent(event)) return 'invalid';
  return isPinnedPublisher(event.au) ? 'verified' : 'unverified';
}
