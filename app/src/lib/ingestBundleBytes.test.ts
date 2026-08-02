import { describe, expect, it } from 'vitest';
import { encodeBundle } from './bundle';
import { ingestBundleBytes } from './ingestBundleBytes';
import type { SetuEvent } from '@setu/shared';

describe('ingestBundleBytes', () => {
  it('returns null on empty or oversized input', async () => {
    const resEmpty = await ingestBundleBytes(new Uint8Array(0));
    expect(resEmpty).toBeNull();

    const resOversized = await ingestBundleBytes(new Uint8Array(2097153));
    expect(resOversized).toBeNull();
  });

  it('decodes and ingests valid Uint8Array bundle', async () => {
    const dummyEvent: SetuEvent = {
      id: 'e_test_ingest_1',
      author: 'a_test_author',
      created_at: 1700000000,
      kind: 'safe',
      payload: { name: 'Test User', text: 'I am safe' },
      sig: 'sig_dummy',
    };
    const bundleBytes = await encodeBundle([dummyEvent]);
    const res = await ingestBundleBytes(bundleBytes);
    expect(res).not.toBeNull();
  });

  it('decodes and ingests base64 string bundle', async () => {
    const dummyEvent: SetuEvent = {
      id: 'e_test_ingest_2',
      author: 'a_test_author',
      created_at: 1700000001,
      kind: 'safe',
      payload: { name: 'Test User', text: 'I am safe' },
      sig: 'sig_dummy',
    };
    const bundleBytes = await encodeBundle([dummyEvent]);
    let binary = '';
    for (let i = 0; i < bundleBytes.length; i++) {
      binary += String.fromCharCode(bundleBytes[i]);
    }
    const base64 = btoa(binary);

    const res = await ingestBundleBytes(base64);
    expect(res).not.toBeNull();
  });
});
