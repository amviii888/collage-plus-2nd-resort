import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mol5saty.app',
  appName: 'Mol5saty',
  webDir: 'out',
  server: {
    // Remote Native Container: Loads the live production web app over HTTPS
    url: 'https://collage-plus-2nd-resort.vercel.app/',
    cleartext: false, // Strictly enforce HTTPS for iOS ATS compliance
    allowNavigation: [
      'collage-plus-2nd-resort.vercel.app',
      '*.vercel.app',
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
    scheme: 'Mol5saty',
    allowsLinkPreview: false,
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Disables Chrome Remote DevTools inspection on APK
    backgroundColor: '#09090b',
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
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
    },
    PrivacyScreen: {
      enable: true,
      iosBlur: 'dark',
      image: 'splash',
      protected: true
    }
  }
};

export default config;
