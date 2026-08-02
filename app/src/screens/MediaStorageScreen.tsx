import { useEffect, useMemo, useState } from 'react';
import { db, type BlobCacheRow } from '../db/schema';
import { useI18n } from '../i18n';

export function MediaStorageScreen() {
  const { t } = useI18n();
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [rows, setRows] = useState<BlobCacheRow[]>([]);
  const total = useMemo(() => rows.reduce((sum, row) => sum + row.blob.size, 0), [rows]);

  async function refresh(): Promise<void> {
    setRows(await db.blobs.orderBy('createdAt').reverse().toArray());
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      const isPersisted = await navigator.storage.persisted().catch(() => false);
      setPersisted(isPersisted);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('mediaStorageTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('mediaStorageHint')}</p>
      </div>
      <div className="rounded-2xl bg-accent p-5 text-white">
        <p className="text-3xl font-bold">{Math.ceil(total / 1024)} KB</p>
        <p className="mt-1 text-sm text-white/75">{rows.length} {t('mediaStorageFiles')}</p>
      </div>
      {persisted !== null && (
        <div className="rounded-xl border border-line bg-surface p-3 text-xs text-muted">
          {persisted ? t('storageProtected') : t('storageBestEffort')}
        </div>
      )}
      {rows.map((row) => (
        <div key={row.h} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <span className="text-xl" aria-hidden="true">{row.mime.startsWith('image/') ? '📷' : '🎙️'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-xs text-ink">{row.h}</p>
            <p className="text-xs text-muted">{Math.ceil(row.blob.size / 1024)} KB</p>
          </div>
          <button type="button" onClick={() => void db.blobs.delete(row.h).then(refresh)} className="rounded-lg px-2 py-2 text-need">
            {t('detailDelete')}
          </button>
        </div>
      ))}
      {rows.length > 0 && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('mediaStorageDeleteConfirm'))) void db.blobs.clear().then(refresh);
          }}
          className="min-h-12 rounded-xl bg-need/10 text-sm font-semibold text-need"
        >
          {t('mediaStorageDeleteAll')}
        </button>
      )}
    </div>
  );
}
