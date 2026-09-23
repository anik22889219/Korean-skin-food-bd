// Firebase Cloud Messaging Service Worker
// Automatically handles background web push notifications

importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDlayVTwAHZidyTZ1-0hdEhLeQIKBeqRtY",
  authDomain: "gen-lang-client-0633897500.firebaseapp.com",
  projectId: "gen-lang-client-0633897500",
  storageBucket: "gen-lang-client-0633897500.firebasestorage.app",
  messagingSenderId: "857142946228",
  appId: "1:857142946228:web:c2dbf36b14b69098b3eae1"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background push message: ', payload);
    
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Korean Skin Food';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'New operational alert received',
      icon: payload.notification?.icon || payload.data?.icon || '/favicon.ico',
      badge: payload.notification?.badge || payload.data?.badge || '/favicon.ico',
      tag: payload.data?.tag || 'ksf-notification',
      data: {
        url: payload.data?.url || payload.notification?.click_action || '/admin',
        ...payload.data
      },
      vibrate: [200, 100, 200],
      requireInteraction: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (err) {
  console.warn('[firebase-messaging-sw.js] FCM SW Init note:', err);
}

// Handle notification click to navigate to the relevant dashboard view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
