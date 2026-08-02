import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNative } from './platform';

export interface HubStartResult {
  ssid: string;
  passphrase: string;
  url: string;
  warning?: string;
}

export interface HubModePluginInterface {
  startHub(): Promise<HubStartResult>;
  stopHub(): Promise<void>;
  updateHubBundle(data: { base64: string }): Promise<void>;
  addListener(eventName: 'hubBundleReceived', listenerFunc: (data: { base64: string }) => void): Promise<PluginListenerHandle>;
}

export const HubModePlugin = registerPlugin<HubModePluginInterface>('HubModePlugin');

export async function isHubModeSupported(): Promise<boolean> {
  return isNative();
}
