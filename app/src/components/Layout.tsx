import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { LanguageToggle } from './LanguageToggle';
import { TabBar } from './TabBar';

export function Layout() {
  const { t } = useI18n();
  const location = useLocation();
  const kiosk = location.pathname === '/board' && new URLSearchParams(location.search).get('kiosk') === '1';
  return (
    <div className="flex h-full flex-col bg-bg">
      {!kiosk && <header className="flex items-center justify-between border-b border-line bg-surface/90 px-4 py-3 shadow-sm backdrop-blur">
        <span className="inline-flex items-center gap-2 text-lg font-bold text-ink">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            S
          </span>
          <span>{t('appName')}</span>
        </span>
        <LanguageToggle />
      </header>}
      <main className={`flex-1 overflow-y-auto ${kiosk ? '' : 'pb-24'}`}>
        <Outlet />
      </main>
      {!kiosk && <TabBar />}
    </div>
  );
}
