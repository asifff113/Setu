import { describe, expect, it } from 'vitest';
import { isSmsGatewaySupported } from './smsGateway';

describe('smsGateway', () => {
  it('returns false on non-native platform', async () => {
    const supported = await isSmsGatewaySupported();
    expect(supported).toBe(false);
  });
});
