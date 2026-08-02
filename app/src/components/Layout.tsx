import { Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/appStore';
import { LanguageToggle } from './LanguageToggle';
import { TabBar } from './TabBar';

export function Layout() {
  const { t } = useI18n();
  const location = useLocation();
  const isGuest = useAppStore((s) => s.isGuest);
  const identity = useAppStore((s) => s.identity);
  const exitGuestMode = useAppStore((s) => s.exitGuestMode);

  const guestName = isGuest && identity && 'name' in identity ? identity.name : 'Guest';
  const kiosk = location.pathname === '/board' && new URLSearchParams(location.search).get('kiosk') === '1';
  return (
    <div className="flex h-full flex-col bg-bg">
      {!kiosk && (
        <header className="flex flex-col border-b border-line bg-surface/90 shadow-sm backdrop-blur">
          {isGuest && (
            <div className="flex items-center justify-between bg-amber-600 px-4 py-2 text-xs font-bold text-white">
              <span>👤 {t('guestModeActiveBanner')} {guestName}</span>
              <button
                type="button"
                onClick={() => void exitGuestMode()}
                className="rounded bg-black/20 px-2 py-1 text-white hover:bg-black/30 underline"
              >
                {t('guestModeSwitchBack')}
              </button>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="inline-flex items-center gap-2 text-lg font-bold text-ink">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
                S
              </span>
              <span>{t('appName')}</span>
            </span>
            <LanguageToggle />
          </div>
        </header>
      )}
      <main className={`flex-1 overflow-y-auto ${kiosk ? '' : 'pb-24'}`}>
        <Outlet />
      </main>
      {!kiosk && <TabBar />}
    </div>
  );
}
