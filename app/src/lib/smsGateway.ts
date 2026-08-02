import { registerPlugin } from '@capacitor/core';
import { isNative } from './platform';

export interface SmsGatewayPluginInterface {
  configure(options: { url: string; key?: string }): Promise<void>;
  getStats(): Promise<{ forwarded: number; failed: number }>;
  sendSms(options: { to: string; message: string }): Promise<void>;
}

export const SmsGatewayPlugin = registerPlugin<SmsGatewayPluginInterface>('SmsGatewayPlugin');

export async function isSmsGatewaySupported(): Promise<boolean> {
  return isNative();
}
