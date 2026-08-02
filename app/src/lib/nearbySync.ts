import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNative } from './platform';

export interface PeerInfo {
  id: string;
  name: string;
}

export interface NearbySyncPluginInterface {
  start(options: { endpointName: string }): Promise<void>;
  stop(): Promise<void>;
  sendBundle(data: { base64: string }): Promise<void>;
  addListener(eventName: 'peerFound', listenerFunc: (peer: PeerInfo) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'peerLost', listenerFunc: (data: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'connected', listenerFunc: (peer: PeerInfo) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'disconnected', listenerFunc: (data: { id: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'bundleReceived', listenerFunc: (data: { base64: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'transferProgress', listenerFunc: (data: { id: string; pct: number }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'error', listenerFunc: (data: { code: string; message: string }) => void): Promise<PluginListenerHandle>;
}

export const NearbySyncPlugin = registerPlugin<NearbySyncPluginInterface>('NearbySyncPlugin');

export async function isNearbySyncSupported(): Promise<boolean> {
  return isNative();
}
