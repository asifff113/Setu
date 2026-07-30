/**
 * BeamReceiver — the "scan" half of QR Beam. Runs the rear camera, reads every
 * QR frame with jsQR (the universal path; BarcodeDetector is absent on iOS
 * Safari), and feeds each into the LT fountain decoder. When enough frames land
 * to peel the whole payload, it gunzips + CBOR-decodes the bundle and pushes the
 * events through the same verified `ingestEvents` gate every transport uses — so
 * bad signatures are rejected here just as they are over the relay.
 *
 * Camera plumbing mirrors QrScanner (secure-context + permission handling); the
 * difference is it keeps scanning and tracks recovered/k progress instead of
 * stopping at the first code.
 */
import { FountainDecoder } from '@setu/shared';
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { ingestEvents, type IngestResult } from '../../db/events';
import { useI18n } from '../../i18n';
import { decodeBundle } from '../../lib/bundle';
import { toBnDigits } from '../../lib/time';
import { useEventsStore } from '../../store/eventsStore';
import { useSyncStore } from '../../store/syncStore';

type ScanError = 'insecure' | 'denied' | 'nocamera' | 'unknown';

interface BeamReceiverProps {
  onClose: () => void;
}

export function BeamReceiver({ onClose }: BeamReceiverProps) {
  const { t, lang } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<ScanError | null>(null);
  // Live progress, mirrored from the decoder for the progress bar.
  const [k, setK] = useState<number | null>(null);
  const [recovered, setRecovered] = useState(0);
  const [frames, setFrames] = useState(0);
  const [phase, setPhase] = useState<'scanning' | 'decoding' | 'done' | 'failed'>('scanning');
  const [result, setResult] = useState<IngestResult | null>(null);

  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const decoder = new FountainDecoder();

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

    const stopCamera = () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };

    const finish = async () => {
      stopCamera();
      setPhase('decoding');
      const bytes = decoder.result();
      if (!bytes) {
        setPhase('failed');
        return;
      }
      try {
        const events = await decodeBundle(bytes);
        const res = await ingestEvents(events);
        if (res.added > 0) {
          await useEventsStore.getState().refresh();
          void useSyncStore.getState().refreshStats();
        }
        setResult(res);
        setPhase('done');
      } catch {
        setPhase('failed');
      }
    };

    const onText = (text: string) => {
      if (!decoder.addFrameText(text)) return; // not one of our frames / duplicate
      setK(decoder.k);
      setRecovered(decoder.recovered);
      setFrames(decoder.framesSeen);
      if (decoder.done) void finish();
    };

    const tick = () => {
      const video = videoRef.current;
      if (stopped || !video || !ctx) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (w && h) {
          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(video, 0, 0, w, h);
          const img = ctx.getImageData(0, 0, w, h);
          const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
          if (code && code.data) onText(code.data);
        }
      }
      if (!stopped) raf = requestAnimationFrame(tick);
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
        if (!stopped) raf = requestAnimationFrame(tick);
      })
      .catch((err: unknown) => {
        const name = err instanceof DOMException ? err.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') setError('denied');
        else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('nocamera');
        else setError('unknown');
      });

    return () => {
      stopCamera();
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

  const pct = k && k > 0 ? Math.round((recovered / k) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden="true">📷</span>
          {t('beamScanTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
        >
          {phase === 'done' || phase === 'failed' ? t('close') : t('scanCancel')}
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
        ) : phase === 'done' && result ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
            <span className="text-5xl" aria-hidden="true">
              ✅
            </span>
            <p className="text-lg font-semibold text-white">{t('beamDoneTitle')}</p>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span>
                <span className="font-semibold text-safe">{num(result.added)}</span> {t('beamNew')}
              </span>
              <span>
                <span className="font-semibold text-white/90">{num(result.known)}</span>{' '}
                {t('beamKnown')}
              </span>
              {result.rejected > 0 && (
                <span>
                  <span className="font-semibold text-need">{num(result.rejected)}</span>{' '}
                  {t('beamRejected')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white active:opacity-90"
            >
              {t('close')}
            </button>
          </div>
        ) : phase === 'failed' ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <span className="text-4xl" aria-hidden="true">
              ⚠️
            </span>
            <p className="text-sm leading-relaxed text-white/80">{t('beamFailed')}</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-xl bg-white/15 px-8 py-3 text-sm font-medium text-white"
            >
              {t('close')}
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-60 w-60 rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
            </div>
          </>
        )}
      </div>

      {!errorText && (phase === 'scanning' || phase === 'decoding') && (
        <div className="px-6 py-4">
          {k === null ? (
            <p className="text-center text-sm text-white/70">{t('beamSearching')}</p>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>
                  {num(recovered)} / {num(k)} {t('beamChunks')}
                </span>
                <span>
                  {num(frames)} {t('beamFramesSeen')}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-safe transition-[width] duration-150"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-center text-xs text-white/50">{t('beamHoldSteady')}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
