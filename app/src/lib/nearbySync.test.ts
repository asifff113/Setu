import { describe, expect, it } from 'vitest';
import { isNearbySyncSupported } from './nearbySync';

describe('nearbySync', () => {
  it('returns false on non-native platform', async () => {
    const supported = await isNearbySyncSupported();
    expect(supported).toBe(false);
  });
});
