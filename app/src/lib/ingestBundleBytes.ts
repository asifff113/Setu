import { ingestEvents, type IngestResult } from '../db/events';
import { decodeBundle, MAX_COMPRESSED_BUNDLE_BYTES } from './bundle';

function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function ingestBundleBytes(
  input: Uint8Array | string,
): Promise<IngestResult | null> {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    try {
      bytes = base64ToBytes(input);
    } catch {
      return null;
    }
  } else {
    bytes = input;
  }

  if (!bytes || bytes.length === 0 || bytes.length > MAX_COMPRESSED_BUNDLE_BYTES) {
    return null;
  }

  try {
    const events = await decodeBundle(bytes);
    if (events.length === 0) return null;
    return await ingestEvents(events);
  } catch {
    return null;
  }
}
