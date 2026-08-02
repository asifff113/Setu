import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { useI18n } from '../i18n';
import { encodeLinkBeamUrl } from '../lib/linkBeam';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import { latestStatusEvents } from '@setu/shared';

interface LifeboatModalProps {
  level: number;
  onDismiss: () => void;
}

export function LifeboatModal({ level, onDismiss }: LifeboatModalProps) {
  const { t } = useI18n();
  const identity = useAppStore((s) => s.identity);
  const events = useEventsStore((s) => s.events);
  const [qrUrl, setQrUrl] = useState('');

  const myStatus = useMemo(() => {
    if (!identity) return undefined;
    return latestStatusEvents(events).find((e) => e.au === identity.author);
  }, [identity, events]);

  const linkBeamUrl = useMemo(() => {
    if (!myStatus) return '';
    try {
      return encodeLinkBeamUrl(myStatus);
    } catch {
      return '';
    }
  }, [myStatus]);

  useEffect(() => {
    if (linkBeamUrl) {
      void QRCode.toDataURL(linkBeamUrl, { width: 512, margin: 2 }).then(setQrUrl);
    }
  }, [linkBeamUrl]);

  function shareLink() {
    if (!linkBeamUrl) return;
    if (typeof navigator.share === 'function') {
      void navigator.share({ url: linkBeamUrl, title: t('lifeboatTitle') });
    } else {
      window.open(`sms:?body=${encodeURIComponent(linkBeamUrl)}`, '_blank');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black p-6 text-white select-none">
      {/* Top Bar */}
      <div className="w-full text-center py-2">
        <span className="inline-block rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
          🔋 {level}% {t('lifeboatTitle')}
        </span>
        <p className="mt-3 text-sm text-white/80 max-w-xs mx-auto leading-relaxed">
          {t('lifeboatBody')}
        </p>
      </div>

      {/* Center QR Code */}
      <div className="flex flex-1 flex-col items-center justify-center my-4 w-full">
        {qrUrl ? (
          <div className="rounded-3xl bg-white p-4 shadow-2xl border-4 border-white">
            <img src={qrUrl} alt="Status Lifeboat QR" className="h-64 w-64 block" />
          </div>
        ) : (
          <p className="text-sm text-white/60">{t('statusNone')}</p>
        )}
        <p className="mt-4 text-xs font-semibold text-white/50 tracking-wide">
          (Set screen brightness to 100%)
        </p>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs flex flex-col gap-3">
        {linkBeamUrl && (
          <button
            type="button"
            onClick={shareLink}
            className="min-h-14 w-full rounded-2xl bg-accent text-base font-bold text-white shadow-lg active:opacity-90"
          >
            🔗 {t('linkBeamShareAction')}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-12 w-full rounded-xl bg-white/15 text-sm font-semibold text-white/80 active:opacity-80"
        >
          {t('lifeboatDismiss')}
        </button>
      </div>
    </div>
  );
}
