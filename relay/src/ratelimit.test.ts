import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter } from './ratelimit.js';

describe('createRateLimiter', () => {
  it('allows up to the limit per window, then blocks', () => {
    const rl = createRateLimiter(3, 60_000);
    expect(rl.allow('a')).toBe(true);
    expect(rl.allow('a')).toBe(true);
    expect(rl.allow('a')).toBe(true);
    expect(rl.allow('a')).toBe(false); // 4th within window
  });

  it('tracks keys independently', () => {
    const rl = createRateLimiter(1, 60_000);
    expect(rl.allow('a')).toBe(true);
    expect(rl.allow('b')).toBe(true); // different client, own budget
    expect(rl.allow('a')).toBe(false);
  });

  it('refills once the window rolls forward', () => {
    vi.useFakeTimers();
    try {
      const rl = createRateLimiter(2, 1000);
      expect(rl.allow('a')).toBe(true);
      expect(rl.allow('a')).toBe(true);
      expect(rl.allow('a')).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(rl.allow('a')).toBe(true); // window elapsed, budget restored
    } finally {
      vi.useRealTimers();
    }
  });
});
