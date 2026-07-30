/**
 * /publish — hidden bulletin composer for the demo's trusted publisher.
 *
 * Not linked from anywhere in the tab bar; reached only by typing the URL.
 * The pasted secret key lives in component state alone (never IndexedDB or
 * localStorage) and signs one bulletin at a time with `createEvent`, exactly
 * like every other event — the only difference is the keypair comes from a
 * pasted secret rather than the device identity in appStore.
 */
import {
  createEvent,
  findAreaByCode,
  fromBase64url,
  isPinnedPublisher,
  publicKeyFromSecret,
  pubkeyToAuthor,
  type SetuEvent,
  type SetuAttachment,
  type SetuSeverity,
} from '@setu/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AreaPicker } from '../components/AreaPicker';
import { LanguageToggle } from '../components/LanguageToggle';
import { useI18n } from '../i18n';
import { ingestEvents } from '../db/events';
import { useEventsStore } from '../store/eventsStore';
import { useSyncStore } from '../store/syncStore';
import { AttachmentComposer } from '../components/AttachmentComposer';

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

interface DerivedPublisher {
  secretKey: Uint8Array;
  publicKey: Uint8Array;
  author: string;
  pinned: boolean;
}

/** Derives the keypair + pin status from a pasted secret, or null if it doesn't decode to 32 bytes. */
function deriveFromSecret(secretInput: string): DerivedPublisher | null {
  try {
    const secretKey = fromBase64url(secretInput.trim());
    if (secretKey.length !== 32) return null;
    const publicKey = publicKeyFromSecret(secretKey);
    const author = pubkeyToAuthor(publicKey);
    return { secretKey, publicKey, author, pinned: isPinnedPublisher(author) };
  } catch {
    return null;
  }
}

export function PublishScreen() {
  const { t } = useI18n();
  const [secretInput, setSecretInput] = useState('');
  const [areaCode, setAreaCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<SetuSeverity>('info');
  const [attachment, setAttachment] = useState<SetuAttachment>();
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState<SetuEvent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const derived = useMemo(() => (secretInput.trim() ? deriveFromSecret(secretInput) : null), [secretInput]);
  const secretLooksInvalid = secretInput.trim().length > 0 && derived === null;
  const canSubmit = derived !== null && message.trim().length > 0 && !busy;

  async function submit() {
    if (!derived || !message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const area = areaCode ? findAreaByCode(areaCode) : undefined;
      const event = createEvent(
        {
          t: 'bulletin',
          ts: nowSeconds(),
          gh: area?.gh ?? '',
          msg: message.trim().slice(0, 280),
          sev: severity,
          att: attachment,
        },
        { secretKey: derived.secretKey, publicKey: derived.publicKey },
      );
      await ingestEvents([event]);
      await useEventsStore.getState().refresh();
      useSyncStore.getState().push([event]);
      setPublished(event);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessage('');
    setAttachment(undefined);
    setPublished(null);
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 shadow-sm">
        <Link to="/" className="text-sm font-medium text-muted">
          {t('publishBack')}
        </Link>
        <LanguageToggle />
      </header>

      <main className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
        <h1 className="text-xl font-bold text-ink">{t('publishTitle')}</h1>
        <p className="mt-1 text-xs text-muted">{t('publishHiddenNote')}</p>

        {published ? (
          <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm">
            <p className="text-base font-semibold text-safe">{t('publishSuccess')}</p>
            <p className="text-sm leading-relaxed text-ink/80">{published.msg}</p>
            <div className="flex gap-3">
              <Link
                to="/board"
                className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-center text-sm font-semibold text-white"
              >
                {t('publishViewBoard')}
              </Link>
              <button
                type="button"
                onClick={reset}
                className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink"
              >
                {t('publishAnother')}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 text-left">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted" htmlFor="publish-secret">
                {t('publishSecretLabel')}
              </label>
              <input
                id="publish-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder={t('publishSecretPlaceholder')}
                className={`w-full rounded-xl border border-line bg-surface px-4 py-3 font-mono text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 ${
                  secretLooksInvalid ? 'ring-2 ring-need' : 'focus:ring-accent'
                }`}
              />
              <p className="mt-1.5 text-xs text-muted">{t('publishSecretHint')}</p>
              {secretLooksInvalid && <p className="mt-1.5 text-xs text-need">{t('publishSecretInvalid')}</p>}
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted">{t('publishSeverity')}</p>
              <div className="grid grid-cols-3 gap-2">
                {(['info', 'warning', 'danger'] as SetuSeverity[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSeverity(value)}
                    className={`min-h-11 rounded-xl border text-xs font-semibold ${
                      severity === value ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-muted'
                    }`}
                  >
                    {value === 'info' ? t('publishSeverityInfo') : value === 'warning' ? t('publishSeverityWarning') : t('publishSeverityDanger')}
                  </button>
                ))}
              </div>
            </div>

            <AttachmentComposer value={attachment} onChange={setAttachment} />

            {derived && (
              <div className="rounded-xl border border-line bg-surface-2 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-muted">{t('publishDerivedPublic')}</p>
                <p className="mt-1 break-all font-mono text-xs text-ink">{derived.author}</p>
                <p className={`mt-2 text-xs ${derived.pinned ? 'text-safe' : 'text-warning'}`}>
                  {derived.pinned ? t('publishPinnedYes') : t('publishPinnedNo')}
                </p>
              </div>
            )}

            <div>
              <p className="mb-2 text-sm font-medium text-muted">{t('publishAreaLabel')}</p>
              <AreaPicker value={areaCode} onChange={(area) => setAreaCode(area?.code ?? null)} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted" htmlFor="publish-message">
                {t('publishMessageLabel')}
              </label>
              <textarea
                id="publish-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('publishMessagePlaceholder')}
                maxLength={280}
                rows={4}
                className="w-full resize-none rounded-xl border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {error && <p className="text-xs text-need">{error}</p>}

            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => void submit()}
              className="min-h-12 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {t('publishSubmit')}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
