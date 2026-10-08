'use client';

/**
 * Native Capacitor Bridge for Universe Academy
 * Safely wraps native iOS/Android features with zero crashes on desktop browsers.
 */

export const isCapacitorNative = (): boolean => {
  if (typeof window === 'undefined') return false;
  const cap = (window as any).Capacitor;
  return Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
};

/**
 * Configure the native iOS Status Bar and Splash Screen on startup.
 */
export async function initNativeEnvironment(): Promise<void> {
  if (!isCapacitorNative()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#09090b' });
  } catch (e) {
    console.warn('[Capacitor] StatusBar configuration skipped:', e);
  }

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (e) {
    console.warn('[Capacitor] SplashScreen hide skipped:', e);
  }
}

/**
 * Register for APNs / FCM Push Notifications on native iOS devices.
 * Passes the received device token back to your callback (e.g. to save to Firestore).
 */
export async function registerNativePush(
  onTokenReceived?: (token: string) => void,
  onNotificationReceived?: (notification: any) => void
): Promise<string | null> {
  if (!isCapacitorNative()) return null;

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    // Request permissions
    let permStatus = await PushNotifications.checkPermissions();
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      console.warn('[Capacitor] Push notification permissions were denied.');
      return null;
    }

    return new Promise((resolve) => {
      PushNotifications.addListener('registration', (token) => {
        console.log('[Capacitor] Push Token registered:', token.value);
        if (onTokenReceived) {
          onTokenReceived(token.value);
        }
        resolve(token.value);
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[Capacitor] Push registration failed:', err);
        resolve(null);
      });

      if (onNotificationReceived) {
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          onNotificationReceived(notification);
        });
      }

      // Trigger native APNs registration
      PushNotifications.register();
    });
  } catch (err) {
    console.error('[Capacitor] Error setting up Push Notifications:', err);
    return null;
  }
}

/**
 * Monitor native device network status transitions (online/offline).
 */
export async function setupNativeNetworkListener(
  onStatusChange: (isOnline: boolean) => void
): Promise<() => void> {
  if (!isCapacitorNative()) return () => {};

  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    onStatusChange(status.connected);

    const handler = await Network.addListener('networkStatusChange', (s) => {
      onStatusChange(s.connected);
    });

    return () => {
      handler.remove();
    };
  } catch (e) {
    console.warn('[Capacitor] Network listener not available:', e);
    return () => {};
  }
}

/**
 * Capture a photo using native iOS Camera dialog.
 */
export async function takeNativePhoto(): Promise<string | null> {
  if (!isCapacitorNative()) return null;

  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const image = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt,
    });
    return image.dataUrl || null;
  } catch (e) {
    console.warn('[Capacitor] Camera action cancelled or failed:', e);
    return null;
  }
}
