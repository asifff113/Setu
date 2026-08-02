import { useEffect, useState } from 'react';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number; // 0.0 to 1.0
  onlevelchange: ((this: BatteryManager, ev: Event) => any) | null;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export function useBatteryLifeboat() {
  const [triggeredLevel, setTriggeredLevel] = useState<number | null>(null);
  const [dismissed10, setDismissed10] = useState(false);
  const [dismissed5, setDismissed5] = useState(false);

  useEffect(() => {
    const nav = typeof navigator !== 'undefined' ? (navigator as NavigatorWithBattery) : undefined;
    if (!nav?.getBattery) return;

    let battery: BatteryManager | null = null;

    function checkLevel() {
      if (!battery) return;
      const levelPct = Math.round(battery.level * 100);
      if (!battery.charging) {
        if (levelPct <= 5 && !dismissed5) {
          setTriggeredLevel(5);
        } else if (levelPct <= 10 && !dismissed10) {
          setTriggeredLevel(10);
        }
      }
    }

    nav.getBattery().then((b) => {
      battery = b;
      checkLevel();
      battery.addEventListener('levelchange', checkLevel);
    }).catch(() => {});

    return () => {
      battery?.removeEventListener('levelchange', checkLevel);
    };
  }, [dismissed10, dismissed5]);

  function dismiss() {
    if (triggeredLevel === 5) setDismissed5(true);
    if (triggeredLevel === 10) setDismissed10(true);
    setTriggeredLevel(null);
  }

  return { triggeredLevel, dismiss };
}
