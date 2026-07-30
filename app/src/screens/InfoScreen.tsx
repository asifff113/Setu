import { DISTRICTS, findAreaByCode } from '@setu/shared';
import { useMemo, useState } from 'react';
import { useI18n, type DictKey } from '../i18n';
import { useAppStore } from '../store/appStore';

const LADDER: { titleKey: DictKey; descKey: DictKey }[] = [
  { titleKey: 'infoLadder1Title', descKey: 'infoLadder1Desc' },
  { titleKey: 'infoLadder2Title', descKey: 'infoLadder2Desc' },
  { titleKey: 'infoLadder3Title', descKey: 'infoLadder3Desc' },
  { titleKey: 'infoLadder4Title', descKey: 'infoLadder4Desc' },
  { titleKey: 'infoLadder5Title', descKey: 'infoLadder5Desc' },
];

const SMS_COMMANDS: { labelKey: DictKey; example: string }[] = [
  { labelKey: 'infoSmsSafe', example: 'SAFE Rahim Mirpur' },
  { labelKey: 'infoSmsHelp', example: 'HELP WATER Rahim Mirpur - need drinking water' },
  { labelKey: 'infoSmsMissing', example: 'MISSING Karim Feni' },
  { labelKey: 'infoSmsFound', example: 'FOUND Karim Feni' },
  { labelKey: 'infoSmsFind', example: 'FIND Karim' },
];

const TRUST_ROWS: { icon: string; tint: string; descKey: DictKey }[] = [
  { icon: '✓', tint: 'text-safe', descKey: 'infoTrustVerified' },
  { icon: '✓', tint: 'text-safe', descKey: 'infoTrustSigned' },
  { icon: '⚠', tint: 'text-warning', descKey: 'infoTrustUnverified' },
  { icon: '📟', tint: 'text-muted', descKey: 'infoTrustSms' },
];

const REPO_URL = 'https://github.com/asifff113/Setu';

export function InfoScreen() {
  const { t, lang } = useI18n();
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState(settings?.name ?? '');
  const [areaCode, setAreaCode] = useState(settings?.areaCode ?? '');
  const [locality, setLocality] = useState(settings?.locality ?? '');
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<'saved' | 'error' | null>(null);

  const currentArea = useMemo(
    () => (settings?.areaCode ? findAreaByCode(settings.areaCode) : undefined),
    [settings?.areaCode],
  );
  const districtOptions = useMemo(
    () =>
      currentArea && !DISTRICTS.some((area) => area.code === currentArea.code)
        ? [currentArea, ...DISTRICTS]
        : DISTRICTS,
    [currentArea],
  );

  function openProfileEditor() {
    setName(settings?.name ?? '');
    setAreaCode(settings?.areaCode ?? '');
    setLocality(settings?.locality ?? '');
    setProfileMessage(null);
    setEditingProfile(true);
  }

  async function saveProfile() {
    if (saving) return;
    setSaving(true);
    setProfileMessage(null);
    try {
      const area = areaCode ? findAreaByCode(areaCode) : undefined;
      await updateSettings({
        name: name.trim().slice(0, 32),
        areaCode: area?.code ?? null,
        gh: area?.gh ?? '',
        locality: locality.trim().slice(0, 64),
      });
      setProfileMessage('saved');
      setEditingProfile(false);
    } catch {
      setProfileMessage('error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <div className="px-1 text-center">
        <h1 className="text-2xl font-bold text-ink">{t('appName')}</h1>
        <p className="mt-1 text-sm text-muted">{t('appTagline')}</p>
      </div>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {t('infoProfileTitle')}
            </p>
            {!editingProfile && (
              <div className="mt-2">
                <p className="font-semibold text-ink">
                  {settings?.name.trim() || t('infoProfileNoName')}
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  {currentArea
                    ? `${lang === 'bn' ? currentArea.bn : currentArea.name}${
                        settings?.locality ? ` · ${settings.locality}` : ''
                      }`
                    : t('infoProfileNoArea')}
                </p>
              </div>
            )}
          </div>
          {!editingProfile && (
            <button
              type="button"
              onClick={openProfileEditor}
              className="shrink-0 rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm font-semibold text-accent active:opacity-80"
            >
              {t('infoProfileEdit')}
            </button>
          )}
        </div>

        {editingProfile && (
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-muted" htmlFor="profile-name">
                {t('onboardNameLabel')}
              </label>
              <input
                id="profile-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={32}
                placeholder={t('onboardNamePlaceholder')}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted" htmlFor="profile-district">
                {t('infoProfileDistrict')}
              </label>
              <select
                id="profile-district"
                value={areaCode}
                onChange={(event) => setAreaCode(event.target.value)}
                className="min-h-12 w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">{t('infoProfileChooseDistrict')}</option>
                {districtOptions.map((area) => (
                  <option key={area.code} value={area.code}>
                    {lang === 'bn' ? `${area.bn} — ${area.name}` : `${area.name} — ${area.bn}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-muted" htmlFor="profile-locality">
                {t('infoProfileLocality')}
              </label>
              <input
                id="profile-locality"
                value={locality}
                onChange={(event) => setLocality(event.target.value)}
                maxLength={64}
                placeholder={t('infoProfileLocalityPlaceholder')}
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{t('infoProfileAreaHint')}</p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={saving}
                onClick={() => setEditingProfile(false)}
                className="min-h-12 flex-1 rounded-xl border border-line bg-surface-2 py-3 text-sm font-semibold text-ink disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveProfile()}
                className="min-h-12 flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? t('infoProfileSaving') : t('save')}
              </button>
            </div>
          </div>
        )}

        {profileMessage && (
          <p className={`mt-3 text-sm font-medium ${profileMessage === 'saved' ? 'text-safe' : 'text-need'}`}>
            {profileMessage === 'saved' ? t('infoProfileSaved') : t('errorGeneric')}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('infoWhatTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{t('infoWhatBody')}</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('infoLadderTitle')}
        </p>
        <ol className="mt-4 flex flex-col gap-4 border-l border-line pl-4">
          {LADDER.map((step) => (
            <li key={step.titleKey}>
              <p className="font-semibold text-ink">{t(step.titleKey)}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted">{t(step.descKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('infoSmsTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{t('infoSmsBody')}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {SMS_COMMANDS.map((cmd) => (
            <li key={cmd.example} className="rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-xs text-muted">{t(cmd.labelKey)}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-ink">{cmd.example}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-muted">{t('infoSmsTry')}</p>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('infoTrustTitle')}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {TRUST_ROWS.map((row) => (
            <li key={row.descKey} className="flex items-start gap-2.5 text-sm text-ink/75">
              <span className={`font-semibold ${row.tint}`} aria-hidden="true">
                {row.icon}
              </span>
              <span className="leading-relaxed">{t(row.descKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('infoSourceTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/80">{t('infoSourceBody')}</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white active:opacity-80"
        >
          {t('infoSourceLink')}
        </a>
        <p className="mt-3 text-xs text-muted">{t('infoLicense')}</p>
      </section>

      <p className="px-1 text-center text-xs text-muted">{t('infoBuiltFor')}</p>
    </div>
  );
}
