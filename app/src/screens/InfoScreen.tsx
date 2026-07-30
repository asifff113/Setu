import { useI18n, type DictKey } from '../i18n';

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
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <div className="px-1 text-center">
        <h1 className="text-2xl font-bold text-ink">{t('appName')}</h1>
        <p className="mt-1 text-sm text-muted">{t('appTagline')}</p>
      </div>

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
