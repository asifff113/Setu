import { describe, expect, it } from 'vitest';
import { DEMO_AUTHORS, DEMO_BULLETIN_ID, DEMO_KEYPAIRS, isDemoAuthor } from './demo.js';
import { pubkeyToAuthor } from './crypto.js';

describe('demo key material', () => {
  it('derives 16 distinct, deterministic keypairs', () => {
    expect(DEMO_KEYPAIRS).toHaveLength(16);
    const authors = DEMO_KEYPAIRS.map((kp) => pubkeyToAuthor(kp.publicKey));
    expect(new Set(authors).size).toBe(16);
    // Deterministic: re-deriving from the same module import yields the same set.
    expect(new Set(authors)).toEqual(DEMO_AUTHORS);
  });

  it('isDemoAuthor recognizes pool authors and rejects an arbitrary one', () => {
    const [first] = DEMO_KEYPAIRS;
    expect(isDemoAuthor(pubkeyToAuthor(first!.publicKey))).toBe(true);
    expect(isDemoAuthor('someUnrelatedAuthorKeyBase64url')).toBe(false);
  });

  it('exposes the fixed verified-bulletin id used by both isDemoEvent (app) and the relay reject-list', () => {
    expect(DEMO_BULLETIN_ID).toBe('drNkEdIEOz7mEEvoyLbPEA');
  });
});
