import { ingestEvents, type IngestResult } from '../db/events';
import { decodeBundle, MAX_COMPRESSED_BUNDLE_BYTES } from './bundle';

const SHARE_INBOX = 'share-inbox';
const SHARE_KEY = '/share-inbox/bundle';

/**
 * Process a shared bundle stashed by the ServiceWorker's fetch handler.
 * Accepts an optional custom `bytesGetter` for unit tests where CacheStorage is unavailable.
 */
export async function processSharedBundle(
  bytesGetter?: () => Promise<Uint8Array | null>,
): Promise<IngestResult | null> {
  let bytes: Uint8Array | null = null;

  if (bytesGetter) {
    bytes = await bytesGetter();
  } else if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(SHARE_INBOX);
      const res = await cache.match(SHARE_KEY);
      if (res) {
        const ab = await res.arrayBuffer();
        bytes = new Uint8Array(ab);
        await cache.delete(SHARE_KEY);
      }
    } catch {
      bytes = null;
    }
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
