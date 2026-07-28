import { Outlet } from 'react-router-dom';
import { useI18n } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { TabBar } from './TabBar';

export function Layout() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <span className="text-lg font-bold text-white">{t('appName')}</span>
        <LanguageToggle />
      </header>
      <main className="flex-1 overflow-y-auto pb-24">
        <Outlet />
      </main>
      <TabBar />
    </div>
  );
}
