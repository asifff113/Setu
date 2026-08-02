import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => {
  return Capacitor.isNativePlatform();
};
