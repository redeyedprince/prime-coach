import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.floorcalisthenics.app',
  appName: 'Prime',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
