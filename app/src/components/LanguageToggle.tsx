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
      className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-semibold text-ink active:bg-line"
    >
      {other === 'bn' ? 'বাং' : 'EN'}
    </button>
  );
}
