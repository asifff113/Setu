import { describe, expect, it } from 'vitest';
import { isLoRaSupported } from './loraBridge';

describe('loraBridge', () => {
  it('returns false on non-native platform', async () => {
    const supported = await isLoRaSupported();
    expect(supported).toBe(false);
  });
});
