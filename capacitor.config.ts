import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.husan.music',
  appName: 'Husan Music',
  webDir: 'dist',
  // Hot-reload from Lovable sandbox during dev. Remove `server` block before
  // building a production release APK so the app loads bundled assets.
  server: {
    url: 'https://42543468-b30f-436f-9f13-073348971479.lovableproject.com?forceHideBadge=true',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F0F0F',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0F0F0F',
    },
  },
};

export default config;
