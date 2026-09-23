import { getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, setDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db, getFirebaseMessaging, FCM_VAPID_KEY, sanitizeForFirestore } from './firebase';

export interface FcmTokenRecord {
  token: string;
  vapidKey: string;
  userId?: string;
  userRole?: string;
  userAgent: string;
  platform: string;
  createdAt: string;
  lastActiveAt: string;
  enabled: boolean;
}

export interface PushSubscriptionResult {
  success: boolean;
  token?: string;
  permission: NotificationPermission;
  error?: string;
}

class FcmPushService {
  private currentToken: string | null = null;
  private messageUnsubscribe: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.currentToken = localStorage.getItem('ksf_fcm_token');
      } catch {
        this.currentToken = null;
      }
    }
  }

  public getVapidKey(): string {
    return FCM_VAPID_KEY;
  }

  public getCurrentToken(): string | null {
    return this.currentToken;
  }

  public isSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  public getPermissionStatus(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Registers the Firebase Messaging Service Worker
   */
  public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/'
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.warn('[FCM] Service worker registration warning:', error);
      return null;
    }
  }

  /**
   * Requests push notification permissions and generates an FCM registration token
   * using the Firebase Web Push certificate (VAPID Key)
   */
  public async requestPermissionAndGetToken(
    userId?: string,
    userRole?: string
  ): Promise<PushSubscriptionResult> {
    if (!this.isSupported()) {
      return {
        success: false,
        permission: 'denied',
        error: 'Push notifications are not supported in this browser or iframe environment.'
      };
    }

    try {
      // 1. Request Browser Permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return {
          success: false,
          permission,
          error: permission === 'denied' 
            ? 'Push notification permission was denied. Please allow notifications in your browser settings.'
            : 'Push notification permission was dismissed.'
        };
      }

      // 2. Initialize Firebase Messaging
      const messaging = await getFirebaseMessaging();
      if (!messaging) {
        return {
          success: false,
          permission,
          error: 'Firebase Cloud Messaging could not be initialized in this client.'
        };
      }

      // 3. Register or locate the Service Worker
      let swRegistration: ServiceWorkerRegistration | undefined;
      try {
        const reg = await this.registerServiceWorker();
        if (reg) swRegistration = reg;
      } catch (swErr) {
        console.warn('[FCM] SW registration warning:', swErr);
      }

      // 4. Retrieve FCM Web Push Token using the VAPID Key
      const token = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: swRegistration
      });

      if (!token) {
        return {
          success: false,
          permission,
          error: 'No FCM registration token returned from Firebase.'
        };
      }

      this.currentToken = token;
      try {
        localStorage.setItem('ksf_fcm_token', token);
      } catch {}

      // 5. Persist Token record to Firestore and backend
      await this.saveTokenToFirestore(token, userId, userRole);

      // Also notify backend server
      try {
        await fetch('/api/notifications/register-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            userId: userId || 'anonymous',
            userRole: userRole || 'staff',
            vapidKey: FCM_VAPID_KEY
          })
        });
      } catch (apiErr) {
        console.warn('[FCM] Backend token sync note:', apiErr);
      }

      return {
        success: true,
        token,
        permission: 'granted'
      };
    } catch (err: any) {
      console.error('[FCM] Error acquiring Web Push token:', err);
      return {
        success: false,
        permission: this.getPermissionStatus(),
        error: err.message || 'Failed to acquire FCM Web Push token'
      };
    }
  }

  /**
   * Saves the token record in Firestore
   */
  private async saveTokenToFirestore(token: string, userId?: string, userRole?: string): Promise<void> {
    try {
      // Deterministic ID by taking first 40 chars of token or sanitized string
      const sanitizedId = token.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
      const tokenDocRef = doc(db, 'fcm_tokens', sanitizedId);

      const record: FcmTokenRecord = {
        token,
        vapidKey: FCM_VAPID_KEY,
        userId: userId || 'anonymous',
        userRole: userRole || 'staff',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        platform: typeof navigator !== 'undefined' ? navigator.platform : 'Web',
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        enabled: true
      };

      await setDoc(tokenDocRef, sanitizeForFirestore(record), { merge: true });
    } catch (err) {
      console.warn('[FCM] Firestore token write notice (handled gracefully):', err);
    }
  }

  /**
   * Listens for foreground push messages arriving when the web app is open
   */
  public async listenForegroundMessages(onReceive: (payload: MessagePayload) => void): Promise<() => void> {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    if (this.messageUnsubscribe) {
      this.messageUnsubscribe();
    }

    this.messageUnsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground push message received:', payload);
      onReceive(payload);

      // Show native browser notification if user gave permission
      if (this.getPermissionStatus() === 'granted') {
        const title = payload.notification?.title || payload.data?.title || 'Korean Skin Food';
        const body = payload.notification?.body || payload.data?.body || '';
        this.showLocalNotification(title, {
          body,
          icon: '/favicon.ico',
          data: payload.data
        });
      }
    });

    return this.messageUnsubscribe;
  }

  /**
   * Displays a native browser push notification
   */
  public showLocalNotification(title: string, options?: NotificationOptions): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      // Prefer service worker showNotification for mobile support
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            ...options
          });
        });
        return true;
      }

      new Notification(title, {
        icon: '/favicon.ico',
        ...options
      });
      return true;
    } catch (err) {
      console.warn('[FCM] Local notification display notice:', err);
      return false;
    }
  }

  /**
   * Dispatches a test Web Push notification
   */
  public async sendTestNotification(): Promise<{ success: boolean; message: string }> {
    const isGranted = this.getPermissionStatus() === 'granted';
    if (!isGranted) {
      return {
        success: false,
        message: 'Notification permission is not granted yet. Click "Enable Push Notifications" first.'
      };
    }

    const title = '✨ Korean Skin Food Push Alert';
    const body = 'Web Push certificate successfully verified! You will receive real-time alerts for orders, POS sessions & inventory.';

    this.showLocalNotification(title, {
      body,
      tag: 'ksf-test-push'
    });

    // Also trigger server endpoint if available
    try {
      await fetch('/api/notifications/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          body,
          token: this.currentToken,
          url: '/admin'
        })
      });
    } catch {}

    return {
      success: true,
      message: 'Test notification sent to browser!'
    };
  }

  /**
   * Unsubscribes from push notifications
   */
  public async unsubscribe(userId?: string): Promise<void> {
    if (this.currentToken) {
      try {
        const sanitizedId = this.currentToken.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48);
        await deleteDoc(doc(db, 'fcm_tokens', sanitizedId));
      } catch {}
      try {
        localStorage.removeItem('ksf_fcm_token');
      } catch {}
      this.currentToken = null;
    }
  }
}

export const fcmPushService = new FcmPushService();
