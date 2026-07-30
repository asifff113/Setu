/**
 * BeamSender — the "send" half of QR Beam. Packs the device's live events into a
 * gzipped bundle, feeds it to the LT fountain encoder, and renders an endless
 * stream of QR frames (~7 fps) for another phone's camera to drink from. It is
 * one-way and rateless: there's no pairing and no back-channel, so it just loops
 * forever until closed. If the receiving phone struggles, "Slower & smaller"
 * drops to 120 B chunks at 5 fps (denser payload, easier-to-read QR).
 *
 * Zero network: everything here is local CPU + screen.
 */
import {
  canTransportEvent,
  DEFAULT_CHUNK_SIZE,
  FALLBACK_CHUNK_SIZE,
  FountainEncoder,
  type SetuEvent,
} from '@setu/shared';
import QRCode from 'qrcode';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { toBnDigits } from '../../lib/time';
import { encodeBundle } from '../../lib/bundle';

interface BeamSenderProps {
  events: SetuEvent[];
  onClose: () => void;
}

type Speed = 'normal' | 'slow';
const SPEED: Record<Speed, { chunk: number; fps: number }> = {
  normal: { chunk: DEFAULT_CHUNK_SIZE, fps: 7 },
  slow: { chunk: FALLBACK_CHUNK_SIZE, fps: 5 },
};

export function BeamSender({ events, onClose }: BeamSenderProps) {
  const { t, lang } = useI18n();
  // Snapshot events once so a parent re-render can't restart the encoder.
  // Area chatter is intentionally relay/local-node/file only: a 24-hour chat
  // stream can crowd safety records out of a QR beam's tiny budget.
  const [snapshot] = useState(events.filter((event) => canTransportEvent(event, 'qr')));
  const [speed, setSpeed] = useState<Speed>('normal');
  const [phase, setPhase] = useState<'building' | 'ready'>('building');
  const [meta, setMeta] = useState({ k: 0, bytes: 0 });
  const [frameNo, setFrameNo] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const empty = snapshot.length === 0;
  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  useEffect(() => {
    if (empty) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    setPhase('building');
    setFrameNo(0);
    const cfg = SPEED[speed];

    void (async () => {
      const bytes = await encodeBundle(snapshot);
      if (cancelled) return;
      const encoder = new FountainEncoder(bytes, cfg.chunk);
      setMeta({ k: encoder.k, bytes: bytes.length });
      setPhase('ready');

      const width = Math.min(340, Math.floor(window.innerWidth * 0.82));
      let esi = 0;
      const draw = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          void QRCode.toCanvas(canvas, encoder.frameText(esi), {
            errorCorrectionLevel: 'M',
            margin: 2,
            width,
            color: { dark: '#000000', light: '#ffffff' },
          }).catch(() => {
            /* transient draw error; next frame recovers */
          });
        }
        esi++;
        setFrameNo(esi);
      };
      draw();
      timer = setInterval(draw, Math.round(1000 / cfg.fps));
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [snapshot, speed, empty]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden="true">🔦</span>
          {t('beamSendTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
        >
          {t('beamStop')}
        </button>
      </div>

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
          <span className="text-4xl" aria-hidden="true">
            📭
          </span>
          <p className="text-sm leading-relaxed text-white/70">{t('beamEmpty')}</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-between px-6 pb-8">
          <div className="flex flex-1 flex-col items-center justify-center gap-5">
            <div className="rounded-3xl bg-white p-4 shadow-lg">
              {/* Kept mounted across phases so the ref is stable for drawing. */}
              <canvas ref={canvasRef} className={phase === 'ready' ? 'block' : 'hidden'} />
              {phase !== 'ready' && (
                <div className="flex h-64 w-64 items-center justify-center">
                  <span className="text-sm text-black/50">{t('beamBuilding')}</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-white/90">{t('beamAim')}</p>
              <p className="mt-1 text-xs text-white/50">{t('beamDistance')}</p>
            </div>
          </div>

          <div className="flex w-full max-w-sm flex-col items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span>
                {t('beamEventsSending')}: {num(snapshot.length)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t('beamFrame')} {num(frameNo)}
              </span>
              {meta.k > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    {num(meta.k)} {t('beamChunks')}
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setSpeed((s) => (s === 'normal' ? 'slow' : 'normal'))}
              className="w-full rounded-xl bg-white/15 py-3 text-sm font-medium text-white active:opacity-80"
            >
              {speed === 'normal' ? t('beamSlower') : t('beamFaster')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
