import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.setu.app',
  appName: 'Setu',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
