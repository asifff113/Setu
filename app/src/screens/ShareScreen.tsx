import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

export function ShareScreen() {
  const { t } = useI18n();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [shared, setShared] = useState(false);
  const url = typeof window === 'undefined' ? '' : window.location.origin;
  const ios = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = typeof navigator !== 'undefined' &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  useEffect(() => {
    if (!canvas.current || !url) return;
    void QRCode.toCanvas(canvas.current, url, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  }, [url]);

  async function share(): Promise<void> {
    try {
      if (navigator.share) await navigator.share({ title: 'Setu', text: t('shareInstallHint'), url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
    } catch {
      // Closing the native share sheet is not an error worth surfacing.
    }
  }

  return (
    <div className="mx-auto flex min-h-[75vh] max-w-md flex-col items-center justify-center px-5 text-center">
      <h1 className="text-2xl font-bold text-ink">{t('shareTitle')}</h1>
      <p className="mt-2 text-sm text-muted">{t('shareInstallHint')}</p>
      <div className="mt-6 rounded-3xl bg-white p-4 shadow-xl">
        <canvas ref={canvas} className="block max-w-full" />
      </div>
      <p className="mt-4 break-all text-xs text-muted">{url}</p>
      {ios && !standalone && (
        <p className="mt-4 rounded-xl bg-surface px-4 py-3 text-sm leading-relaxed text-ink shadow-sm">
          {t('shareIos')}
        </p>
      )}
      <button type="button" onClick={() => void share()} className="mt-5 min-h-14 w-full rounded-2xl bg-accent text-base font-semibold text-white">
        {shared ? `✓ ${t('shareDone')}` : t('shareButton')}
      </button>
    </div>
  );
}
