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
  { icon: '⚠', tint: 'text-yellow-400', descKey: 'infoTrustUnverified' },
  { icon: '📟', tint: 'text-white/80', descKey: 'infoTrustSms' },
];

const REPO_URL = 'https://github.com/asifff113/Setu';

export function InfoScreen() {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 pt-6 pb-8">
      <div className="px-1 text-center">
        <h1 className="text-2xl font-bold text-white">{t('appName')}</h1>
        <p className="mt-1 text-sm text-white/50">{t('appTagline')}</p>
      </div>

      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('infoWhatTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{t('infoWhatBody')}</p>
      </section>

      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('infoLadderTitle')}
        </p>
        <ol className="mt-4 flex flex-col gap-4 border-l border-white/10 pl-4">
          {LADDER.map((step) => (
            <li key={step.titleKey}>
              <p className="font-semibold text-white">{t(step.titleKey)}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-white/60">{t(step.descKey)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('infoSmsTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{t('infoSmsBody')}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {SMS_COMMANDS.map((cmd) => (
            <li key={cmd.example} className="rounded-xl bg-surface-2 px-3 py-2">
              <p className="text-xs text-white/50">{t(cmd.labelKey)}</p>
              <p className="mt-0.5 break-all font-mono text-xs text-white/90">{cmd.example}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-white/40">{t('infoSmsTry')}</p>
      </section>

      <section className="rounded-2xl bg-surface p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('infoTrustTitle')}
        </p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {TRUST_ROWS.map((row) => (
            <li key={row.descKey} className="flex items-start gap-2.5 text-sm text-white/70">
              <span className={`font-semibold ${row.tint}`} aria-hidden="true">
                {row.icon}
              </span>
              <span className="leading-relaxed">{t(row.descKey)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-surface p-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-white/40">
          {t('infoSourceTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-white/80">{t('infoSourceBody')}</p>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block rounded-xl bg-surface-2 px-4 py-2.5 text-sm font-medium text-white active:opacity-80"
        >
          {t('infoSourceLink')}
        </a>
        <p className="mt-3 text-xs text-white/40">{t('infoLicense')}</p>
      </section>

      <p className="px-1 text-center text-xs text-white/30">{t('infoBuiltFor')}</p>
    </div>
  );
}
