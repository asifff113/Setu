import { useI18n, type Lang } from '../i18n';
import { useAppStore } from '../store/appStore';

/** Shows the *other* language's label — tapping switches to it. */
export function LanguageToggle() {
  const { lang } = useI18n();
  const setLanguage = useAppStore((s) => s.setLanguage);
  const other: Lang = lang === 'bn' ? 'en' : 'bn';

  return (
    <button
      type="button"
      onClick={() => void setLanguage(other)}
      aria-label="Toggle language"
      className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold text-white/80 active:bg-white/10"
    >
      {other === 'bn' ? 'বাং' : 'EN'}
    </button>
  );
}
