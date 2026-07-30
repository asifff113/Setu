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
  // Demo publisher, generated for this hackathon build, used once to sign the
  // fixed VERIFIED_BULLETIN literal in app/src/lib/demoSeed.ts. Its secret key
  // is not present anywhere in this repo (a *.local.md file was the intended
  // holding place, per the app/src/screens/PublishScreen.tsx "paste a secret"
  // flow, but none is checked in) — treat it as destroyed. In practice this
  // means /publish can verify whether a pasted secret matches a pinned key,
  // but has no way to mint a new ✓-badge bulletin today; add a real secret
  // here (and to your own gitignored holding file) to change that.
  'uxqNicQzfR99CtZR4A1kVcn9bTkQAnuoZMEry0E1AYs',
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
