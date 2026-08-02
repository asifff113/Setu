import { useI18n, type DictKey } from '../i18n';

const SECTIONS: { icon: string; titleKey: DictKey; bodyKey: DictKey }[] = [
  { icon: '✅', titleKey: 'manualStartTitle', bodyKey: 'manualStartBody' },
  { icon: '📋', titleKey: 'manualBoardTitle', bodyKey: 'manualBoardBody' },
  { icon: '💬', titleKey: 'manualChatTitle', bodyKey: 'manualChatBody' },
  { icon: '📣', titleKey: 'manualAlertsTitle', bodyKey: 'manualAlertsBody' },
  { icon: '⇄', titleKey: 'manualSyncTitle', bodyKey: 'manualSyncBody' },
  { icon: '🚶‍♂️', titleKey: 'manualCourierTitle', bodyKey: 'manualCourierBody' },
  { icon: '📡', titleKey: 'manualNoInternetTitle', bodyKey: 'manualNoInternetBody' },
  { icon: '📢', titleKey: 'manualLoudspeakerTitle', bodyKey: 'manualLoudspeakerBody' },
  { icon: '👨‍👩‍👧', titleKey: 'manualCircleTitle', bodyKey: 'manualCircleBody' },
  { icon: '🕘', titleKey: 'manualHistoryTitle', bodyKey: 'manualHistoryBody' },
  { icon: '📦', titleKey: 'manualMediaTitle', bodyKey: 'manualMediaBody' },
  { icon: '📲', titleKey: 'manualShareTitle', bodyKey: 'manualShareBody' },
  { icon: '⚙️', titleKey: 'manualSettingsTitle', bodyKey: 'manualSettingsBody' },
];

export function ManualScreen() {
  const { t } = useI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-5">
      <div className="rounded-3xl bg-accent px-5 py-6 text-white">
        <p className="text-4xl" aria-hidden="true">📘</p>
        <h1 className="mt-3 text-2xl font-bold">{t('manualTitle')}</h1>
        <p className="mt-2 text-sm text-white/80">{t('manualIntro')}</p>
      </div>

      {SECTIONS.map(({ icon, titleKey, bodyKey }, index) => (
        <details key={titleKey} className="rounded-2xl border border-line bg-surface p-4 shadow-sm" open={index === 0}>
          <summary className="cursor-pointer font-semibold text-ink">
            <span aria-hidden="true">{icon}</span> {t(titleKey)}
          </summary>
          <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted marker:text-accent">
            {t(bodyKey)
              .split('\n')
              .map((step) => (
                <li key={step}>{step}</li>
              ))}
          </ol>
        </details>
      ))}

      <p className="rounded-xl bg-accent/10 px-4 py-3 text-xs leading-relaxed text-accent">
        {t('manualMoreHint')}
      </p>
      <p className="px-1 text-center text-xs text-muted">{t('manualOffline')}</p>
    </div>
  );
}
