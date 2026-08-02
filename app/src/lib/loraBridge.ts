import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { isNative } from './platform';

export interface LoRaBridgePluginInterface {
  connectToNode(options: { address: string }): Promise<void>;
  sendFrame(options: { base64: string }): Promise<void>;
  disconnect(): Promise<void>;
  addListener(eventName: 'loraFrameReceived', listenerFunc: (data: { base64: string }) => void): Promise<PluginListenerHandle>;
  addListener(eventName: 'loraStateChanged', listenerFunc: (data: { state: string }) => void): Promise<PluginListenerHandle>;
}

export const LoRaBridgePlugin = registerPlugin<LoRaBridgePluginInterface>('LoRaBridgePlugin');

export async function isLoRaSupported(): Promise<boolean> {
  return isNative();
}
