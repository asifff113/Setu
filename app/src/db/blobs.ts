import { db } from './schema';

export async function cacheBlob(h: string, blob: Blob): Promise<void> {
  await db.blobs.put({
    h,
    blob,
    mime: blob.type || 'application/octet-stream',
    createdAt: Math.floor(Date.now() / 1000),
  });
}

export async function readCachedBlob(h: string): Promise<Blob | undefined> {
  return (await db.blobs.get(h))?.blob;
}

export async function deleteCachedBlob(h: string): Promise<void> {
  await db.blobs.delete(h);
}
