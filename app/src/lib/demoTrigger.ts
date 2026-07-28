import { findAreaByCode } from '@setu/shared';
import { useAppStore } from '../store/appStore';
import { useEventsStore } from '../store/eventsStore';

const GUEST_AREA_CODE = 'mirpur';
const GUEST_NAME = 'অতিথি ব্যবহারকারী';

/**
 * Entry point for `?demo=1` and the onboarding "Try the demo" button: loads
 * the seed events and, if this device hasn't onboarded yet, gives it a guest
 * identity so a first-time visitor lands straight on a living board instead
 * of the onboarding form.
 */
export async function tryDemo(): Promise<void> {
  const { settings, updateSettings } = useAppStore.getState();
  if (!settings?.onboarded) {
    const area = findAreaByCode(GUEST_AREA_CODE);
    await updateSettings({
      name: settings?.name || GUEST_NAME,
      areaCode: GUEST_AREA_CODE,
      gh: area?.gh ?? '',
      onboarded: true,
    });
  }
  await useEventsStore.getState().seedDemo();
}
