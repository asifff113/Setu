import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';
import type { SetuCategory } from '@setu/shared';

const CATEGORIES: { cat: SetuCategory; labelKey: string; icon: string }[] = [
  { cat: 'med', labelKey: 'catMed', icon: '🩺' },
  { cat: 'rescue', labelKey: 'catRescue', icon: '🛟' },
  { cat: 'food', labelKey: 'catFood', icon: '🍞' },
  { cat: 'water', labelKey: 'catWater', icon: '💧' },
  { cat: 'shelter', labelKey: 'catShelter', icon: '⛺' },
  { cat: 'other', labelKey: 'catOther', icon: '📦' },
];

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function PanicScreen() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const publish = useEventsStore((s) => s.publish);

  const [activeSubMenu, setActiveSubMenu] = useState<'none' | 'help'>('none');
  const [holdingTarget, setHoldingTarget] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [successState, setSuccessState] = useState<{ bg: string; message: string } | null>(null);

  const holdTimerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  function startHold(targetId: string, onConfirm: () => void) {
    if (holdingTarget) cancelHold();
    setHoldingTarget(targetId);
    setHoldProgress(0);
    startTimeRef.current = Date.now();

    const DURATION = 1200; // 1.2s

    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.floor((elapsed / DURATION) * 100));
      setHoldProgress(pct);

      if (elapsed >= DURATION) {
        clearInterval(interval);
        setHoldingTarget(null);
        setHoldProgress(0);
        onConfirm();
      }
    }, 30);

    holdTimerRef.current = interval;
  }

  function cancelHold() {
    if (holdTimerRef.current !== null) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldingTarget(null);
    setHoldProgress(0);
  }

  useEffect(() => {
    return () => cancelHold();
  }, []);

  async function triggerSafe() {
    if (!settings) return;
    try {
      await publish({
        t: 'checkin',
        ts: nowSeconds(),
        gh: settings.gh,
        st: 'safe',
        n: settings.name.trim() || undefined,
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setSuccessState({ bg: 'bg-safe', message: t('submittedSafe') });
    } catch {
      alert(t('errorGeneric'));
    }
  }

  async function triggerHelpCategory(cat: SetuCategory) {
    if (!settings) return;
    try {
      await publish({
        t: 'help',
        ts: nowSeconds(),
        gh: settings.gh,
        st: 'need',
        cat,
        n: settings.name.trim() || undefined,
        urg: 'critical',
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 50, 150]);
      }
      setSuccessState({ bg: 'bg-need', message: t('submittedHelp') });
    } catch {
      alert(t('errorGeneric'));
    }
  }

  async function triggerMissingPerson() {
    if (!settings) return;
    try {
      await publish({
        t: 'person',
        ts: nowSeconds(),
        gh: settings.gh,
        pst: 'missing',
        pn: t('panicMissing'),
        n: settings.name.trim() || undefined,
      });
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      setSuccessState({ bg: 'bg-warning', message: t('submittedPerson') });
    } catch {
      alert(t('errorGeneric'));
    }
  }

  if (successState) {
    return (
      <div
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-white transition-colors ${successState.bg}`}
      >
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/20 text-7xl font-extrabold animate-bounce">
          ✓
        </div>
        <h1 className="mt-8 text-center text-3xl font-extrabold">{successState.message}</h1>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-12 min-h-16 w-full max-w-xs rounded-2xl bg-white px-6 py-4 text-xl font-bold text-black shadow-2xl"
        >
          {t('close')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div>
          <h1 className="text-xl font-extrabold text-red-500 flex items-center gap-2">
            <span>🚨</span> {t('panicTitle')}
          </h1>
          <p className="text-xs text-white/60">{t('panicSubtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white active:bg-white/20"
        >
          {t('close')}
        </button>
      </div>

      {/* Main Buttons */}
      <div className="flex flex-1 flex-col gap-4 p-4">
        {activeSubMenu === 'none' ? (
          <>
            {/* SAFE BUTTON */}
            <div
              className="relative flex-1 rounded-3xl bg-safe p-6 flex flex-col items-center justify-center overflow-hidden active:scale-95 transition-transform"
              onMouseDown={() => startHold('safe', triggerSafe)}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold('safe', triggerSafe)}
              onTouchEnd={cancelHold}
            >
              {holdingTarget === 'safe' && (
                <div
                  className="absolute inset-0 bg-white/30 transition-all"
                  style={{ width: `${holdProgress}%` }}
                />
              )}
              <span className="text-6xl mb-2">✅</span>
              <span className="text-3xl font-extrabold tracking-wide">{t('panicSafe')}</span>
              <span className="mt-2 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full text-white/90">
                {holdingTarget === 'safe' ? `${holdProgress}%` : t('panicHoldToConfirm')}
              </span>
            </div>

            {/* NEED HELP BUTTON */}
            <div
              className="relative flex-1 rounded-3xl bg-need p-6 flex flex-col items-center justify-center overflow-hidden active:scale-95 transition-transform"
              onClick={() => setActiveSubMenu('help')}
            >
              <span className="text-6xl mb-2">🆘</span>
              <span className="text-3xl font-extrabold tracking-wide">{t('panicHelp')}</span>
              <span className="mt-2 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full text-white/90">
                {t('categoryLabel')} →
              </span>
            </div>

            {/* MISSING PERSON BUTTON */}
            <div
              className="relative flex-1 rounded-3xl bg-amber-600 p-6 flex flex-col items-center justify-center overflow-hidden active:scale-95 transition-transform"
              onMouseDown={() => startHold('missing', triggerMissingPerson)}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={() => startHold('missing', triggerMissingPerson)}
              onTouchEnd={cancelHold}
            >
              {holdingTarget === 'missing' && (
                <div
                  className="absolute inset-0 bg-white/30 transition-all"
                  style={{ width: `${holdProgress}%` }}
                />
              )}
              <span className="text-6xl mb-2">🔍</span>
              <span className="text-3xl font-extrabold tracking-wide">{t('panicMissing')}</span>
              <span className="mt-2 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full text-white/90">
                {holdingTarget === 'missing' ? `${holdProgress}%` : t('panicHoldToConfirm')}
              </span>
            </div>
          </>
        ) : (
          /* Help Sub-menu Categories */
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-lg font-bold">{t('helpSheetTitle')}</span>
              <button
                type="button"
                onClick={() => setActiveSubMenu('none')}
                className="text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-lg"
              >
                ← {t('cancel')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 flex-1">
              {CATEGORIES.map(({ cat, labelKey, icon }) => (
                <div
                  key={cat}
                  className="relative rounded-2xl bg-need/90 p-4 flex flex-col items-center justify-center overflow-hidden active:scale-95 transition-transform"
                  onMouseDown={() => startHold(cat, () => triggerHelpCategory(cat))}
                  onMouseUp={cancelHold}
                  onMouseLeave={cancelHold}
                  onTouchStart={() => startHold(cat, () => triggerHelpCategory(cat))}
                  onTouchEnd={cancelHold}
                >
                  {holdingTarget === cat && (
                    <div
                      className="absolute inset-0 bg-white/40 transition-all"
                      style={{ width: `${holdProgress}%` }}
                    />
                  )}
                  <span className="text-4xl mb-1">{icon}</span>
                  <span className="text-lg font-bold text-center">{t(labelKey as any)}</span>
                  <span className="mt-1 text-[10px] font-medium bg-black/30 px-2 py-0.5 rounded-full">
                    {holdingTarget === cat ? `${holdProgress}%` : t('panicHoldToConfirm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
