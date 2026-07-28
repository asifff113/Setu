/**
 * ChirpReceiver — the "listen" half of Chirp. Opens the microphone, feeds every
 * audio buffer to ggwave, and when a full FSK payload decodes, runs it back
 * through the compact Chirp codec into a SetuEvent. That event goes through the
 * exact same verified `ingestEvents` gate every transport uses, so a corrupted
 * or forged transmission is dropped on signature just as it would be over QR or
 * the relay. Foreign/garbled sounds simply fail to decode and listening
 * continues.
 *
 * The mic (like the camera) needs a secure context and a user tap to start.
 */
import { decodeChirpEvent, type SetuEvent } from '@setu/shared';
import { useEffect, useRef, useState } from 'react';
import { ingestEvents, type IngestResult } from '../../db/events';
import { useI18n } from '../../i18n';
import { toBnDigits } from '../../lib/time';
import { useEventsStore } from '../../store/eventsStore';
import { useSyncStore } from '../../store/syncStore';
import { createAudioContext, startListen, type ChirpReception } from './ggwave';

type ListenError = 'insecure' | 'denied' | 'nomic' | 'unknown';
type Phase = 'idle' | 'listening' | 'done' | 'failed';

interface ChirpReceiverProps {
  onClose: () => void;
}

export function ChirpReceiver({ onClose }: ChirpReceiverProps) {
  const { t, lang } = useI18n();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<ListenError | null>(null);
  const [result, setResult] = useState<IngestResult | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const recRef = useRef<ChirpReception | null>(null);
  const doneRef = useRef(false);

  const num = (n: number): string => (lang === 'bn' ? toBnDigits(n) : String(n));

  useEffect(() => {
    const host = window.location.hostname;
    const secure = window.isSecureContext || host === 'localhost' || host === '127.0.0.1';
    if (!secure) setError('insecure');
    return () => {
      recRef.current?.stop();
      recRef.current = null;
      if (ctxRef.current) {
        void ctxRef.current.close();
        ctxRef.current = null;
      }
    };
  }, []);

  function handlePayload(bytes: Uint8Array) {
    if (doneRef.current) return;
    let event: SetuEvent;
    try {
      event = decodeChirpEvent(bytes);
    } catch {
      return; // not a Setu chirp (foreign ggwave / noise) — keep listening
    }
    doneRef.current = true;
    recRef.current?.stop();
    recRef.current = null;
    void (async () => {
      try {
        const res = await ingestEvents([event]);
        if (res.added > 0) {
          await useEventsStore.getState().refresh();
          void useSyncStore.getState().refreshStats();
        }
        setResult(res);
        setPhase('done');
      } catch {
        setPhase('failed');
      }
    })();
  }

  async function startListening() {
    setError(null);
    try {
      if (!ctxRef.current) ctxRef.current = createAudioContext();
      await ctxRef.current.resume();
      recRef.current = await startListen(ctxRef.current, handlePayload);
      setPhase('listening');
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') setError('denied');
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') setError('nomic');
      else setError('unknown');
      setPhase('idle');
    }
  }

  const errorText = error
    ? t(
        error === 'insecure'
          ? 'chirpInsecure'
          : error === 'denied'
            ? 'chirpMicDenied'
            : error === 'nomic'
              ? 'chirpNoMic'
              : 'chirpAudioFailed',
      )
    : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3">
        <span className="flex items-center gap-2 text-base font-semibold text-white">
          <span aria-hidden="true">🎧</span>
          {t('chirpListenTitle')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium text-white"
        >
          {phase === 'done' || phase === 'failed' ? t('close') : t('scanCancel')}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        {errorText ? (
          <>
            <span className="text-4xl" aria-hidden="true">
              🎤
            </span>
            <p className="text-sm leading-relaxed text-white/80">{errorText}</p>
          </>
        ) : phase === 'done' && result ? (
          <>
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
          </>
        ) : phase === 'listening' ? (
          <>
            <div className="relative flex h-40 w-40 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-safe/25" />
              <span className="absolute h-28 w-28 animate-ping rounded-full bg-safe/40 [animation-delay:200ms]" />
              <span
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-safe/90 text-4xl text-white"
                aria-hidden="true"
              >
                🎤
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">{t('chirpListening')}</p>
              <p className="mt-1 text-xs text-white/50">{t('chirpListenHint')}</p>
            </div>
          </>
        ) : (
          // idle
          <>
            <span className="text-5xl" aria-hidden="true">
              🎧
            </span>
            <p className="text-sm leading-relaxed text-white/70">{t('chirpListenHint')}</p>
            <button
              type="button"
              onClick={() => void startListening()}
              className="rounded-xl bg-accent px-8 py-4 text-base font-semibold text-white active:opacity-90"
            >
              {t('chirpListenStart')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
