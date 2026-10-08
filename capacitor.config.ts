import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'site.universeacademy.app',
  appName: 'Universe Academy',
  webDir: 'out',
  server: {
    // Remote Native Container: Loads the live production web app over HTTPS
    url: 'https://universeacademy.site',
    cleartext: false, // Strictly enforce HTTPS for iOS ATS compliance
    allowNavigation: [
      'universeacademy.site',
      '*.universeacademy.site',
      '*.run.app',
      '*.firebaseapp.com',
      '*.googleapis.com',
      'accounts.google.com'
    ]
  },
  backgroundColor: '#09090b',
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'UniverseAcademy',
    allowsLinkPreview: false,
    scrollEnabled: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#09090b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerColor: '#22c55e',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK', // White text on dark status bar (compatible with dark theme)
      backgroundColor: '#09090b'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
