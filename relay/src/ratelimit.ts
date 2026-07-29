/**
 * Minimal in-memory sliding-window rate limiter (Phase 7 hardening).
 *
 * The SMS webhook (`POST /api/sms/inbound`) is open by design — the /sms-sim
 * page and the real gateway both hit it with no shared secret in the default
 * demo. That leaves two abuse vectors: flooding the board with relay-signed
 * `src:'sms'` events, and (with a real gateway wired) making the relay send SMS
 * replies to attacker-named numbers — toll/spam amplification through the SIM.
 *
 * This limiter blunts both. It's deliberately tiny: the relay is a single
 * process, so there's no external store and no attempt to survive a distributed
 * flood — it just caps how fast any one client can drive the webhook. Buckets
 * are pruned lazily so memory stays bounded on a long-running relay.
 */
export interface RateLimiter {
  /** Record a hit for `key` and return whether it is under the limit. */
  allow(key: string): boolean;
}

/** Allow at most `limit` hits per `windowMs` per key. */
export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error('rate limit must be a positive integer');
  if (!Number.isSafeInteger(windowMs) || windowMs < 1) throw new Error('rate window must be a positive integer');
  const hits = new Map<string, number[]>();

  return {
    allow(key: string): boolean {
      const now = Date.now();
      const cutoff = now - windowMs;
      const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      // Opportunistic sweep so idle keys don't accumulate forever.
      if (hits.size > 5000) {
        for (const [k, times] of hits) {
          if (times.length === 0 || times[times.length - 1]! <= cutoff) hits.delete(k);
        }
        while (hits.size > 5000) hits.delete(hits.keys().next().value!);
      }
      return true;
    },
  };
}
