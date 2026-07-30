import { toBase64url, type SetuAttachment } from '@setu/shared';
import { cacheBlob } from '../db/blobs';
import { db } from '../db/schema';

export interface PreparedMedia {
  att: SetuAttachment;
  blob: Blob;
}

function imageBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('image encoding failed'))),
      'image/webp',
      quality,
    );
  });
}

/** Downscale + WebP re-encode. Canvas output strips source EXIF/GPS metadata. */
export async function prepareImage(file: File): Promise<PreparedMedia> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
  let width = Math.max(1, Math.round(bitmap.width * scale));
  let height = Math.max(1, Math.round(bitmap.height * scale));
  let quality = 0.72;
  let blob: Blob | undefined;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('canvas unavailable');
    context.drawImage(bitmap, 0, 0, width, height);
    blob = await imageBlob(canvas, quality);
    if (blob.size <= 150_000) break;
    if (quality > 0.46) quality -= 0.1;
    else {
      width = Math.max(320, Math.round(width * 0.8));
      height = Math.max(240, Math.round(height * 0.8));
    }
  }
  bitmap.close();
  if (!blob || blob.size > 150_000) throw new Error('image is too large');
  return prepareBlob(blob, 'img', width);
}

export async function prepareAudio(blob: Blob): Promise<PreparedMedia> {
  if (blob.size > 100_000) throw new Error('voice note is too large');
  return prepareBlob(blob, 'aud');
}

async function prepareBlob(
  blob: Blob,
  kind: SetuAttachment['k'],
  width?: number,
): Promise<PreparedMedia> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  const h = toBase64url(new Uint8Array(digest));
  await cacheBlob(h, blob);
  return {
    blob,
    att: { h, k: kind, sz: blob.size, w: width },
  };
}

export function mediaBaseUrl(nodeUrl?: string | null): string {
  if (!nodeUrl) return '';
  try {
    const url = new URL(nodeUrl);
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:';
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export async function uploadMedia(media: PreparedMedia, nodeUrl?: string | null): Promise<boolean> {
  try {
    const response = await fetch(`${mediaBaseUrl(nodeUrl)}/api/blob/${media.att.h}`, {
      method: 'PUT',
      headers: { 'content-type': media.blob.type || 'application/octet-stream' },
      body: media.blob,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Best-effort retry for media created while offline; PUT is idempotent. */
export async function retryMediaUploads(nodeUrl?: string | null): Promise<void> {
  const referenced = new Set(
    (await db.events.toArray()).map((event) => event.att?.h).filter((hash): hash is string => Boolean(hash)),
  );
  const rows = await db.blobs.bulkGet([...referenced]);
  await Promise.all(rows.map(async (row) => {
    if (!row) return;
    try {
      await fetch(`${mediaBaseUrl(nodeUrl)}/api/blob/${row.h}`, {
        method: 'PUT',
        headers: { 'content-type': row.mime },
        body: row.blob,
      });
    } catch {
      // The next reconnect/foreground sync retries.
    }
  }));
}
