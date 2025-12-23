// frontend/src/firebase.js
// 기존 내용을 모두 지우고 아래 내용으로 완전히 교체하세요

import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { apiPostForm } from "./api/api";

const firebaseConfig = {
  apiKey: "AIzaSyAdTtitDjQaIFA0U78xHLMbZemMp5Nwi3Q",
  authDomain: "bandicon-final.firebaseapp.com",
  projectId: "bandicon-final",
  storageBucket: "bandicon-final.firebasestorage.app",
  messagingSenderId: "769635544149",
  appId: "1:769635544149:web:4828129c7e2b7f586438dc"
};

export const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// VAPID 키 - Firebase 콘솔에서 확인 후 정확히 입력해주세요
const VAPID_KEY = "BOWGrbXEHh5BwBlGLRls0yBrz03KG2-piLj2phBUknGkRXDnfizoTkPy7nawz8CecfjOZeK0cW_9VNqCB0mteNk";

export const requestForToken = async (nickname) => {
  try {
    console.log("🔔 푸시 알림 권한 요청 시작");
    
    // 1. 권한 확인
    if (Notification.permission === "denied") {
      console.log("❌ 알림 권한이 차단됨");
      alert("알림 권한이 차단되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.");
      return;
    }

    // 2. 권한 요청
    const permission = await Notification.requestPermission();
    console.log("🔐 알림 권한:", permission);
    
    if (permission !== "granted") {
      console.log("❌ 알림 권한이 거부됨");
      return;
    }

    // 3. Service Worker 등록 확인
    let registration;
    try {
      registration = await navigator.serviceWorker.getRegistration('/');
      if (!registration) {
        console.log("📝 Service Worker 새로 등록");
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
      } else {
        console.log("✅ 기존 Service Worker 사용");
      }
      
      // 강제 업데이트
      await registration.update();
      
      // SW 활성화 대기
      if (registration.installing) {
        await new Promise((resolve) => {
          registration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') {
              resolve();
            }
          });
        });
      }
    } catch (swError) {
      console.error("❌ Service Worker 등록 실패:", swError);
      return;
    }

    // 4. FCM 토큰 발급
    console.log("🎫 FCM 토큰 발급 시도");
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (currentToken) {
      console.log("✅ FCM 토큰 발급 성공:", currentToken.substring(0, 20) + "...");
      
      // 5. 서버에 토큰 등록
      try {
        const formData = new FormData();
        formData.append("token", currentToken);
        formData.append("nickname", nickname);
        
        const response = await apiPostForm("/register-device", formData);
        console.log("✅ 서버 토큰 등록 성공:", response);
        
        return currentToken;
      } catch (apiError) {
        console.error("❌ 서버 토큰 등록 실패:", apiError);
      }
    } else {
      console.log("❌ FCM 토큰 발급 실패");
    }
  } catch (err) {
    console.error("❌ FCM 초기화 중 오류:", err);
  }
};

// 디버깅용 함수들
export const checkFirebaseStatus = () => {
  console.log("🔍 Firebase 상태 체크:");
  console.log("- 앱 초기화:", !!app);
  console.log("- 메시징 초기화:", !!messaging);
  console.log("- 알림 권한:", Notification.permission);
  console.log("- Service Worker 지원:", 'serviceWorker' in navigator);
  console.log("- HTTPS 환경:", window.location.protocol === 'https:');
};