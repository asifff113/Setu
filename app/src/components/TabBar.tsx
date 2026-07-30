import type { ComponentType, SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { useI18n, type DictKey } from '../i18n';

type IconProps = SVGProps<SVGSVGElement>;

function HomeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function BoardIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 7h6" />
      <path d="M8 11h8" />
      <path d="M8 15h6" />
    </svg>
  );
}

function MapIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="m8 18-5 3V6l5-3 8 3 5-3v15l-5 3-8-3Z" />
      <path d="M8 3v15" />
      <path d="M16 6v15" />
    </svg>
  );
}

function SyncIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M20 11a8 8 0 0 0-14.6-4.5L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.6 4.5L21 15" />
      <path d="M16 15h5v5" />
    </svg>
  );
}

function InfoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6" />
      <path d="M12 7h.01" />
    </svg>
  );
}

const TABS: { to: string; Icon: ComponentType<IconProps>; key: DictKey }[] = [
  { to: '/', Icon: HomeIcon, key: 'tabHome' },
  { to: '/board', Icon: BoardIcon, key: 'tabBoard' },
  { to: '/map', Icon: MapIcon, key: 'tabMap' },
  { to: '/sync', Icon: SyncIcon, key: 'tabSync' },
  { to: '/info', Icon: InfoIcon, key: 'tabInfo' },
];

export function TabBar() {
  const { t } = useI18n();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(20,33,41,0.08)] backdrop-blur">
      {TABS.map(({ Icon, ...tab }) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 px-1 py-2 text-xs font-semibold transition-colors ${
              isActive ? 'text-accent' : 'text-muted hover:text-ink focus-visible:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`flex h-8 w-11 items-center justify-center rounded-full ${
                  isActive ? 'bg-accent/12' : 'bg-transparent'
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="leading-none">{t(tab.key)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
