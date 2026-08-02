import { describe, expect, it } from 'vitest';
import { isHubModeSupported } from './hubMode';

describe('hubMode', () => {
  it('returns false on non-native platform', async () => {
    const supported = await isHubModeSupported();
    expect(supported).toBe(false);
  });
});
