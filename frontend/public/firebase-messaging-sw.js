// frontend/public/firebase-messaging-sw.js
// 기존 내용을 모두 지우고 아래 내용으로 완전히 교체하세요

console.log('[SW] 🔥 Firebase messaging service worker loaded');

// 강제 즉시 활성화
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] ✅ Activating...');
  event.waitUntil(self.clients.claim());
});

// Firebase CDN 로드
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Firebase 설정 - 메인 앱과 동일해야 함
const firebaseConfig = {
  apiKey: "AIzaSyAdTtitDjQaIFA0U78xHLMbZemMp5Nwi3Q",
  authDomain: "bandicon-final.firebaseapp.com",
  projectId: "bandicon-final",
  storageBucket: "bandicon-final.firebasestorage.app",
  messagingSenderId: "769635544149",
  appId: "1:769635544149:web:4828129c7e2b7f586438dc"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();
  console.log('[SW] ✅ Firebase 초기화 성공');

  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] 📱 Background message received:', payload);
    
    return clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // 포커스된 창이 있으면 알림 표시 안함
      if (clientList.some(client => client.focused)) {
        console.log('[SW] 앱 포커스 상태 - 알림 스킵');
        return;
      }
      
      const notificationTitle = payload.notification?.title || "밴디콘 알림";
      const notificationBody = payload.notification?.body || "새 알림";
      const notificationId = Date.now().toString();
      
      return self.registration.showNotification(notificationTitle, {
        body: notificationBody,
        icon: "/logo192.png",
        badge: "/logo192.png",
        tag: `bandicon-${notificationId}`,
        renotify: false,
        data: {
          url: payload.data?.url || "/"
        }
      });
    });
  });

} catch (error) {
  console.error('[SW] ❌ Firebase 초기화 실패:', error);
}

// 알림 클릭 처리
self.addEventListener("notificationclick", (event) => {
  console.log('[SW] 👆 Notification clicked:', event.action);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = self.location.origin + urlToOpen;
  
  event.waitUntil((async () => {
    try {
      // 기존에 열린 탭 찾기
      const clientsList = await clients.matchAll({ 
        type: "window", 
        includeUncontrolled: true 
      });
      
      // 이미 열린 밴디콘 탭이 있으면 포커스 후 페이지 이동
      for (const client of clientsList) {
        if (client.url.includes(self.location.origin)) {
          console.log('[SW] 🎯 Focusing existing tab and navigating to:', urlToOpen);
          await client.focus();
          
          // 특정 페이지로 이동
          if (urlToOpen !== '/') {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: urlToOpen
            });
          }
          return;
        }
      }
      
      // 열린 탭이 없으면 새 탭 열기
      console.log('[SW] 🆕 Opening new tab:', fullUrl);
      await clients.openWindow(fullUrl);
    } catch (error) {
      console.error('[SW] ❌ Error handling notification click:', error);
    }
  })());
});

// 알림 닫기 처리
self.addEventListener("notificationclose", (event) => {
  console.log('[SW] ❌ Notification closed:', event.notification.tag);
});