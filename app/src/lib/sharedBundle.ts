import { registerPlugin } from '@capacitor/core';
import type { IngestResult } from '../db/events';
import { ingestBundleBytes } from './ingestBundleBytes';
import { isNative } from './platform';

export interface SharedBundlePluginInterface {
  consumePending(): Promise<{ data: string | null }>;
}

const SharedBundlePlugin = registerPlugin<SharedBundlePluginInterface>('SharedBundlePlugin');

export async function checkAndProcessSharedBundle(): Promise<IngestResult | null> {
  if (!isNative()) return null;
  try {
    const res = await SharedBundlePlugin.consumePending();
    if (res && res.data) {
      return await ingestBundleBytes(res.data);
    }
  } catch {
    return null;
  }
  return null;
}
