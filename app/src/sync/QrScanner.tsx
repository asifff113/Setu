/**
 * Reusable single-shot QR scanner: fullscreen rear camera + jsQR, calls
 * `onResult` with the first decoded string. Used here to scan a local-node
 * address; the same camera plumbing (getUserMedia + per-frame jsQR) is what the
 * Phase 5 Beam receiver builds on.
 *
 * Platform handling the spec calls out: getUserMedia needs a secure context
 * (https or localhost); we ship the jsQR path (BarcodeDetector is absent on iOS
 * Safari); permission-denied / no-camera get clear, actionable messages.
 */
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';

type ScanError = 'insecure' | 'denied' | 'nocamera' | 'unknown';

interface QrScannerProps {
  onResult: (text: string) => void;
  onClose: () => void;
  title?: string;
  hint?: string;
}

export function QrScanner({ onResult, onClose, title, hint }: QrScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<ScanError | null>(null);

  // Keep callbacks in refs so the camera effect mounts exactly once.
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let done = false;

    const host = window.location.hostname;
    const secure = window.isSecureContext || host === 'localhost' || host === '127.0.0.1';
    if (!secure) {
      setError('insecure');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('nocamera');
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const tick = () => {
      const video = videoRef.current;
      if (done || !video || !ctx) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            done = true;
            stream?.getTracks().forEach((track) => track.stop());
            onResultRef.current(code.data);
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        const video = videoRef.current;
        if (!video) return undefined;
        video.srcObject = s;
        video.setAttribute('playsinline', 'true');
        return video.play();
      })
      .then(() => {
        if (!done) raf = requestAnimationFrame(tick);
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setError('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('nocamera');
        else setError('unknown');
      });

    return () => {
      done = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const errorText = error
    ? t(
        error === 'insecure'
          ? 'scanInsecure'
          : error === 'denied'
            ? 'scanDenied'
            : error === 'nocamera'
              ? 'scanNoCamera'
              : 'scanUnknown',
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-base font-semibold text-white">{title ?? t('scanTitle')}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
        >
          {t('scanCancel')}
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        {errorText ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              📷
            </span>
            <p className="text-sm leading-relaxed text-white/80">{errorText}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
            />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-56 w-56 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          </>
        )}
      </div>

      {!errorText && (
        <p className="px-6 py-4 text-center text-sm text-white/70">{hint ?? t('scanHint')}</p>
      )}
    </div>
  );
}
