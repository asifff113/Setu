import { toBase64url, type SetuAttachment } from '@setu/shared';
import { useEffect, useState } from 'react';
import { cacheBlob, readCachedBlob } from '../db/blobs';
import { useAppStore } from '../store/appStore';
import { useSyncStore } from '../store/syncStore';
import { mediaBaseUrl } from '../lib/media';

function sizeLabel(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.ceil(bytes / 1024)} KB`;
}

export function MediaAttachment({ att }: { att: SetuAttachment }) {
  const auto = useAppStore((state) => state.settings?.autoDownloadMedia ?? false);
  const nodeUrl = useSyncStore((state) => state.nodeUrl);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  async function load(download: boolean): Promise<void> {
    if (loading || url) return;
    setLoading(true);
    try {
      let blob = await readCachedBlob(att.h);
      if (!blob && download) {
        const response = await fetch(`${mediaBaseUrl(nodeUrl)}/api/blob/${att.h}`);
        if (!response.ok) throw new Error('unavailable');
        blob = await response.blob();
        if (blob.size !== att.sz) throw new Error('size mismatch');
        const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
        if (toBase64url(new Uint8Array(digest)) !== att.h) throw new Error('hash mismatch');
        await cacheBlob(att.h, blob);
      }
      if (blob) setUrl(URL.createObjectURL(blob));
      else setUnavailable(true);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(auto);
    // URL is intentionally managed when `att.h` changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [att.h, auto]);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  if (url && att.k === 'img') {
    return <img src={url} alt="" className="mt-3 max-h-72 w-full rounded-xl object-cover" />;
  }
  if (url && att.k === 'aud') {
    return <audio src={url} controls preload="metadata" className="mt-3 w-full" />;
  }
  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => void load(true)}
      className="mt-3 flex min-h-20 w-full items-center justify-center rounded-xl border border-dashed border-line bg-surface-2 px-4 text-sm font-semibold text-muted"
    >
      {loading
        ? '…'
        : unavailable
          ? `${att.k === 'img' ? '📷' : '🎙️'} Available when connected · ${sizeLabel(att.sz)}`
          : `${att.k === 'img' ? '📷 Tap to download' : '🎙️ Tap to play'} · ${sizeLabel(att.sz)}`}
    </button>
  );
}
