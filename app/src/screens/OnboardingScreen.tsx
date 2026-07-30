import { findAreaByCode } from '@setu/shared';
import { useState } from 'react';
import { AreaPicker } from '../components/AreaPicker';
import { useI18n, type Lang } from '../i18n';
import { tryDemo } from '../lib/demoTrigger';
import { useAppStore } from '../store/appStore';

function BridgeMark() {
  return (
    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-accent/10 text-accent">
      <svg viewBox="0 0 96 96" className="h-16 w-16" fill="none" stroke="currentColor" strokeWidth="5">
        <path d="M18 60h60" />
        <path d="M26 60c4-18 13-28 22-28s18 10 22 28" />
        <path d="M30 48h36" />
        <path d="M24 66h48" />
        <path d="M18 72h60" />
      </svg>
    </div>
  );
}

/** First-run: name + area + language. One screen, skippable. */
export function OnboardingScreen() {
  const { t, lang } = useI18n();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const settings = useAppStore((s) => s.settings);

  const [name, setName] = useState(settings?.name ?? '');
  const [areaCode, setAreaCode] = useState<string | null>(settings?.areaCode ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  async function finish() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const area = areaCode ? findAreaByCode(areaCode) : undefined;
      await updateSettings({
        name: name.trim().slice(0, 32),
        areaCode,
        gh: area?.gh ?? '',
        onboarded: true,
      });
    } catch {
      setError(t('errorGeneric'));
      setSubmitting(false);
    }
  }

  async function startDemo() {
    if (demoLoading) return;
    setDemoLoading(true);
    setError(null);
    try {
      await tryDemo();
    } catch {
      setError(t('errorDemo'));
    } finally {
      setDemoLoading(false);
    }
  }

  if (step < 3) {
    const slides = [
      {
        icon: '✓',
        tone: 'bg-safe',
        title: t('onboardSlide1Title'),
        body: t('onboardSlide1Body'),
      },
      {
        icon: '🆘',
        tone: 'bg-need',
        title: t('onboardSlide2Title'),
        body: t('onboardSlide2Body'),
      },
      {
        icon: '⇄',
        tone: 'bg-accent',
        title: t('onboardSlide3Title'),
        body: t('onboardSlide3Body'),
      },
    ];
    const slide = slides[step]!;
    return (
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-8 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-label={`${step + 1} / 3`}>
            {slides.map((_, index) => (
              <span key={index} className={`h-2 rounded-full ${index === step ? 'w-8 bg-accent' : 'w-2 bg-line'}`} />
            ))}
          </div>
          <button type="button" onClick={() => setStep(3)} className="min-h-10 px-2 text-sm font-semibold text-muted">
            {t('onboardSkip')}
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <div className={`flex h-40 w-40 items-center justify-center rounded-[2.5rem] text-7xl font-bold text-white shadow-xl ${slide.tone}`}>
            {slide.icon}
          </div>
          <h1 className="mt-8 text-3xl font-bold text-ink">{slide.title}</h1>
          <p className="mt-3 max-w-xs text-base leading-relaxed text-muted">{slide.body}</p>
        </div>
        {error && <p className="mb-3 text-center text-sm text-need">{error}</p>}
        <button
          type="button"
          disabled={demoLoading}
          onClick={() => void startDemo()}
          className="mb-3 min-h-12 w-full rounded-xl border border-accent px-4 text-sm font-semibold text-accent"
        >
          {demoLoading ? '…' : t('tryDemo')}
        </button>
        <button type="button" onClick={() => setStep((value) => value + 1)} className="min-h-14 w-full rounded-2xl bg-accent text-lg font-semibold text-white">
          {step === 2 ? t('onboardSetProfile') : t('onboardNext')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-8 pt-10">
      <div className="flex flex-1 flex-col gap-6">
        <div className="text-center">
          <BridgeMark />
          <h1 className="mt-5 text-3xl font-bold text-ink">{t('onboardTitle')}</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('onboardSubtitle')}</p>
          {error && <p className="mt-3 text-sm font-medium text-need">{error}</p>}
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={demoLoading}
            onClick={() => void startDemo()}
            className="min-h-14 w-full rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-white shadow-lg shadow-accent/20 active:opacity-90 disabled:opacity-50"
          >
            {demoLoading ? '...' : t('tryDemo')}
          </button>
          <p className="text-center text-xs leading-relaxed text-muted">{t('tryDemoHint')}</p>
        </div>

        <section className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">{t('onboardLanguageLabel')}</label>
            <div className="flex gap-2 rounded-xl bg-surface-2 p-1">
              {(['bn', 'en'] satisfies Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => void setLanguage(l)}
                  className={`min-h-11 flex-1 rounded-lg px-4 py-2 text-sm font-semibold ${
                    lang === l ? 'bg-accent text-white' : 'text-muted'
                  }`}
                >
                  {l === 'bn' ? 'বাংলা' : 'English'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted" htmlFor="onboard-name">
              {t('onboardNameLabel')}
            </label>
            <input
              id="onboard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('onboardNamePlaceholder')}
              maxLength={32}
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-muted">{t('onboardAreaLabel')}</label>
            <AreaPicker value={areaCode} onChange={(area) => setAreaCode(area?.code ?? null)} />
          </div>
        </section>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          type="button"
          disabled={submitting}
          onClick={() => void finish()}
          className="min-h-14 w-full rounded-2xl bg-accent py-4 text-lg font-semibold text-white shadow-lg shadow-accent/20 active:opacity-90 disabled:opacity-50"
        >
          {t('onboardGetStarted')}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => void finish()}
          className="w-full py-2 text-sm font-medium text-muted"
        >
          {t('onboardSkip')}
        </button>
      </div>
    </div>
  );
}
