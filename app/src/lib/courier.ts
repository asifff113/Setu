import { registerPlugin } from '@capacitor/core';
import { ingestBundleBytes } from './ingestBundleBytes';
import { isNative } from './platform';

export interface CourierPluginInterface {
  startCourier(): Promise<void>;
  stopCourier(): Promise<void>;
  consumeQueue(): Promise<{ bundles: string[] }>;
}

export const CourierPlugin = registerPlugin<CourierPluginInterface>('CourierPlugin');

export async function processCourierQueue(): Promise<number> {
  if (!isNative()) return 0;
  try {
    const { bundles } = await CourierPlugin.consumeQueue();
    let totalAdded = 0;
    for (const base64 of bundles) {
      const res = await ingestBundleBytes(base64);
      if (res && res.added > 0) {
        totalAdded += res.added;
      }
    }
    return totalAdded;
  } catch {
    return 0;
  }
}
