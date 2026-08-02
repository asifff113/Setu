import { describe, expect, it } from 'vitest';
import { encodeBundle } from './bundle';
import { ingestBundleBytes } from './ingestBundleBytes';
import type { SetuEvent } from '@setu/shared';

function makeEvent(id: string, ts: number): SetuEvent {
  return {
    v: 1,
    t: 'checkin',
    id,
    ts,
    ttl: 259200,
    gh: '',
    au: 'a_test_author',
    n: 'Test User',
    st: 'safe',
    msg: 'I am safe',
    sig: 'sig_dummy',
  };
}

describe('ingestBundleBytes', () => {
  it('returns null on empty or oversized input', async () => {
    const resEmpty = await ingestBundleBytes(new Uint8Array(0));
    expect(resEmpty).toBeNull();

    const resOversized = await ingestBundleBytes(new Uint8Array(2097153));
    expect(resOversized).toBeNull();
  });

  it('decodes and ingests valid Uint8Array bundle', async () => {
    const bundleBytes = await encodeBundle([makeEvent('e_test_ingest_1', 1700000000)]);
    const res = await ingestBundleBytes(bundleBytes);
    expect(res).not.toBeNull();
  });

  it('decodes and ingests base64 string bundle', async () => {
    const bundleBytes = await encodeBundle([makeEvent('e_test_ingest_2', 1700000001)]);
    let binary = '';
    for (let i = 0; i < bundleBytes.length; i++) {
      binary += String.fromCharCode(bundleBytes[i]!);
    }
    const base64 = btoa(binary);

    const res = await ingestBundleBytes(base64);
    expect(res).not.toBeNull();
  });
});
