import { NavLink } from 'react-router-dom';
import { useI18n, type DictKey } from '../i18n';

const TABS: { to: string; icon: string; key: DictKey }[] = [
  { to: '/', icon: '🏠', key: 'tabHome' },
  { to: '/board', icon: '📋', key: 'tabBoard' },
  { to: '/map', icon: '🗺️', key: 'tabMap' },
  { to: '/sync', icon: '🔄', key: 'tabSync' },
  { to: '/info', icon: 'ℹ️', key: 'tabInfo' },
];

export function TabBar() {
  const { t } = useI18n();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-white/10 bg-surface pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs ${
              isActive ? 'text-accent' : 'text-white/60'
            }`
          }
        >
          <span className="text-xl leading-none">{tab.icon}</span>
          <span className="leading-none">{t(tab.key)}</span>
        </NavLink>
      ))}
    </nav>
  );
}
