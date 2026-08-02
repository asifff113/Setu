import { describe, expect, it } from 'vitest';
import { checkAndProcessSharedBundle } from './sharedBundle';

describe('sharedBundle', () => {
  it('returns null on non-native platform', async () => {
    const result = await checkAndProcessSharedBundle();
    expect(result).toBeNull();
  });
});
