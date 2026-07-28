import { findAreaByCode } from '@setu/shared';
import { useState } from 'react';
import { AreaPicker } from '../components/AreaPicker';
import { useI18n, type Lang } from '../i18n';
import { useAppStore } from '../store/appStore';

/** First-run: name + area + language. One screen, skippable. */
export function OnboardingScreen() {
  const { t, lang } = useI18n();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const settings = useAppStore((s) => s.settings);

  const [name, setName] = useState(settings?.name ?? '');
  const [areaCode, setAreaCode] = useState<string | null>(settings?.areaCode ?? null);
  const [submitting, setSubmitting] = useState(false);

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    const area = areaCode ? findAreaByCode(areaCode) : undefined;
    await updateSettings({
      name: name.trim().slice(0, 32),
      areaCode,
      gh: area?.gh ?? '',
      onboarded: true,
    });
  }

  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-8 pt-14">
      <div className="flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">{t('onboardTitle')}</h1>
          <p className="mt-2 text-sm text-white/60">{t('onboardSubtitle')}</p>
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/60">{t('onboardLanguageLabel')}</label>
          <div className="flex gap-2">
            {(['bn', 'en'] satisfies Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => void setLanguage(l)}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-medium ${
                  lang === l ? 'bg-accent text-white' : 'bg-surface-2 text-white/70'
                }`}
              >
                {l === 'bn' ? 'বাংলা' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/60" htmlFor="onboard-name">
            {t('onboardNameLabel')}
          </label>
          <input
            id="onboard-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('onboardNamePlaceholder')}
            maxLength={32}
            className="w-full rounded-xl bg-surface-2 px-4 py-3 text-base text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-white/60">{t('onboardAreaLabel')}</label>
          <AreaPicker value={areaCode} onChange={(area) => setAreaCode(area.code)} />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void finish()}
          className="w-full rounded-2xl bg-accent py-4 text-lg font-semibold text-white active:opacity-90 disabled:opacity-50"
        >
          {t('onboardGetStarted')}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void finish()}
          className="w-full py-2 text-sm text-white/50"
        >
          {t('onboardSkip')}
        </button>
      </div>
    </div>
  );
}
