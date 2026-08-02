/**
 * ChirpSender — the "send" half of Chirp. Packs the device's own latest
 * check-in into a compact ~110–140 byte frame (see shared/chirp.ts) and plays
 * it out the speaker as looping FSK audio for another phone's microphone. Only
 * a single event fits in one sound transmission, so — unlike QR Beam's whole
 * bundle — this sends just "my status": the minimum that keeps a button-phone
 * or camera-less device in the loop when there's nothing but air between them.
 *
 * The AudioContext is created inside the Play tap (autoplay policy) and owned
 * here; ggwave itself is lazy-loaded on first play.
 */
import {
  encodeChirpEvent,
  latestStatusEvents,
  MAX_CHIRP_BYTES,
  type SetuEvent,
} from '@setu/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { toBnDigits } from '../../lib/time';
import {
  createAudioContext,
  startTransmit,
  type ChirpProtocol,
  type ChirpTransmission,
} from './ggwave';

import { encodeLinkBeamUrl } from '../../lib/linkBeam';

interface ChirpSenderProps {
  events: SetuEvent[];
  author: string | undefined;
  onClose: () => void;
}

type Payload =
  | { kind: 'empty' }
  | { kind: 'toobig'; size: number }
  | { kind: 'ok'; bytes: Uint8Array; size: number };

export function ChirpSender({ events, author, onClose }: ChirpSenderProps) {
  const { t, lang, statusLabel, categoryLabel, categoryIcon } = useI18n();
  // Freeze the event set so a background refresh can't swap what we're sending.
  const [snapshot] = useState(events);

  const mine = useMemo(
    () => (author ? latestStatusEvents(snapshot).find((e) => e.au === author) : undefined),
    [snapshot, author],
  );

  const payload = useMemo<Payload>(() => {
    if (!mine) return { kind: 'empty' };
    try {
      const bytes = encodeChirpEvent(mine);
      if (bytes.length > MAX_CHIRP_BYTES) return { kind: 'toobig', size: bytes.length };
      return { kind: 'ok', bytes, size: bytes.length };
    } catch {
      return { kind: 'toobig', size: 0 };
    }
  }, [mine]);

  const [playing, setPlaying] = useState(false);
  const [protocol, setProtocol] = useState<ChirpProtocol>('fast');
  const [failed, setFailed] = useState(false);
  const ctxRef = useRef<AudioContext | null>(null);
  const txRef = useRef<ChirpTransmission | null>(null);

  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  useEffect(() => {
    // Tear everything down when the overlay closes.
    return () => {
      txRef.current?.stop();
      txRef.current = null;
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  async function start(proto: ChirpProtocol) {
    if (payload.kind !== 'ok') return;
    setFailed(false);
    try {
      // Create synchronously inside the tap so the autoplay policy is satisfied.
      if (!ctxRef.current) ctxRef.current = createAudioContext();
      await ctxRef.current.resume();
      txRef.current?.stop();
      txRef.current = await startTransmit(ctxRef.current, payload.bytes, proto);
      setPlaying(true);
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  function stop() {
    txRef.current?.stop();
    txRef.current = null;
    setPlaying(false);
  }

  function toggleProtocol() {
    const next: ChirpProtocol = protocol === 'fast' ? 'fastest' : 'fast';
    setProtocol(next);
    if (playing) void start(next);
  }

  const statusSummary = mine
    ? `${mine.st ? statusLabel(mine.st) : ''}${
        mine.cat ? ` · ${categoryIcon(mine.cat)} ${categoryLabel(mine.cat)}` : ''
      }`
    : '';

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden="true">🔊</span>
          {t('chirpSendTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
        >
          {t('close')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        {payload.kind === 'empty' ? (
          <>
            <span className="text-4xl" aria-hidden="true">
              📭
            </span>
            <p className="text-sm leading-relaxed text-white/70">{t('chirpEmpty')}</p>
          </>
        ) : payload.kind === 'toobig' ? (
          <>
            <span className="text-4xl" aria-hidden="true">
              ⚠️
            </span>
            <p className="text-sm leading-relaxed text-white/70">{t('chirpTooBig')}</p>
            {payload.size > 0 && (
              <p className="text-xs text-white/40">
                {num(payload.size)} / {num(MAX_CHIRP_BYTES)} {t('chirpBytes')}
              </p>
            )}
          </>
        ) : (
          <>
            {/* Speaker icon; concentric pings while sound is playing. */}
            <div className="relative flex h-40 w-40 items-center justify-center">
              {playing && (
                <>
                  <span className="absolute h-full w-full animate-ping rounded-full bg-accent/30" />
                  <span className="absolute h-28 w-28 animate-ping rounded-full bg-accent/40 [animation-delay:200ms]" />
                </>
              )}
              <span
                className={`relative flex h-24 w-24 items-center justify-center rounded-full text-4xl ${
                  playing ? 'bg-accent text-white' : 'bg-white/15 text-white/80'
                }`}
                aria-hidden="true"
              >
                📢
              </span>
            </div>

            <div>
              <p className="text-sm font-medium text-white/90">
                {playing ? t('chirpPlaying') : statusSummary}
              </p>
              <p className="mt-1 text-xs text-white/50">
                {playing ? t('chirpAim') : t('chirpLoopHint')}
              </p>
            </div>

            {failed && <p className="text-xs text-need">{t('chirpAudioFailed')}</p>}

            <div className="flex w-full max-w-xs flex-col items-center gap-3">
              {playing ? (
                <button
                  type="button"
                  onClick={stop}
                  className="w-full rounded-xl bg-white/15 py-3.5 text-sm font-semibold text-white active:opacity-80"
                >
                  {t('beamStop')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void start(protocol)}
                  className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-white active:opacity-90"
                >
                  {t('chirpStart')}
                </button>
              )}

              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>
                  {num(payload.size)} {t('chirpBytes')}
                </span>
                <button
                  type="button"
                  onClick={toggleProtocol}
                  className="rounded-full bg-white/15 px-3 py-1.5 font-medium text-white/80 active:opacity-80"
                >
                  {protocol === 'fast' ? t('chirpQuicker') : t('chirpReliable')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProtocol('fast');
                    if (!playing) void start('fast');
                  }}
                  className="rounded-full bg-accent/30 px-3 py-1.5 font-medium text-accent-light text-white active:opacity-80"
                >
                  📢 {t('chirpLoudspeakerTitle')}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!mine) return;
                  try {
                    const linkUrl = encodeLinkBeamUrl(mine);
                    if (typeof navigator.share === 'function') {
                      void navigator.share({ url: linkUrl, title: t('linkBeamTitle') });
                    } else {
                      window.open(`sms:?body=${encodeURIComponent(linkUrl)}`, '_blank');
                    }
                  } catch {}
                }}
                className="w-full rounded-xl border border-white/20 bg-white/10 py-3 text-sm font-semibold text-white active:opacity-80"
              >
                🔗 {t('linkBeamShareAction')}
              </button>
              <p className="mt-1 text-xs text-white/60 leading-relaxed max-w-xs">
                {t('chirpLoudspeakerInstruction')}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
