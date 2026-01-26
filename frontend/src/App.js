// [전체 코드] src/App.js

import React, { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

// --- 👇 2. [수정] AuthContext.js에서 AuthContext를 import ---
// --- 👇 2. [수정] AuthContext.js에서 AuthContext를 import ---
// import { AuthContext } from './context/AuthContext';
// import { AlertProvider } from './context/AlertContext';
// import { NotificationProvider } from './context/NotificationContext';


import RoomList from "./features/rooms/RoomList";
import RoomDetail from "./features/rooms/RoomDetail";
import RoomSchedule from "./features/rooms/RoomSchedule";
import MyRooms from "./features/rooms/MyRooms";
import CreateRoomForm from "./features/rooms/CreateRoomForm";
import Profile from "./features/profile/Profile";
import OtherUserProfile from "./features/profile/OtherUserProfile";
import ProfileEdit from "./features/profile/ProfileEdit"; // [신규]
import ChatHub from "./features/chat/ChatHub";
import ChatList from "./features/chat/ChatList";
import FriendAdd from "./features/chat/FriendAdd";
import LoginForm from "./features/auth/LoginForm";
import SignupForm from "./features/auth/SignupForm";
import FindIdPage from "./features/auth/FindIdPage";
import FindPasswordPage from "./features/auth/FindPasswordPage";
import Home from "./features/home/Home";
import MannerEval from "./features/evaluation/MannerEval";
import MannerEvalModal from "./features/evaluation/MannerEvalModal"; // [신규] 모달 추가
import BoardList from "./features/board/BoardList";
import PostDetail from "./features/board/PostDetail";
import CreatePost from "./features/board/CreatePost";
import ScrappedPosts from "./features/board/ScrappedPosts";
import BoardHome from "./features/board/BoardHome";
import ClanHome from "./features/clan/ClanHome";
import MyClans from "./features/clan/MyClans"; // [New] My Clan List
import CreateClan from "./features/clan/CreateClan"; // [New]
import ClanDetail from "./features/clan/ClanDetail";
import ClanRoomListPage from "./features/clan/ClanRoomListPage";
import ClanRoomDashboard from "./features/clan/ClanRoomDashboard";
import ClanMemberListPage from "./features/clan/ClanMemberListPage";
import ClanMemberActivity from "./features/clan/ClanMemberActivity";
import ClanAnnouncementList from "./features/clan/ClanAnnouncementList"; // [New]
import ClanBoardList from "./features/clan/ClanBoardList"; // [New]
import ClanCalendarPage from "./features/clan/ClanCalendarPage"; // [New]
import AdminPage from "./features/admin/AdminPage";
import AdminSupportPage from "./features/admin/AdminSupportPage";
import SupportPage from "./features/support/SupportPage";
import CustomerCenter from "./features/support/CustomerCenter"; // [신규]

// --- 👇 [수정] apiPostForm, AlertProvider 임포트 제거 ---
import { apiGet, apiPost, API_BASE_SERVER } from "./api/api";
import { useAlert } from "./context/AlertContext";
// --- 👆 [수정] ---
import "./App.css";
import { requestForToken, messaging } from "./firebase";
import { onMessage } from "firebase/messaging";
import MyPosts from "./features/profile/MyPosts";
import MyComments from "./features/profile/MyComments";
import TermsPage from "./features/legal/TermsPage";
import PrivacyPage from "./features/legal/PrivacyPage";
import PopupAnnouncement from './components/PopupAnnouncement';

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboardPage = location.pathname.includes('/dashboard');

  // [신규] Auth 페이지 및 Profile 페이지에서는 헤더를 숨깁니다 (Profile은 자체 헤더 사용)
  const isAuthPage = ['/login', '/signup', '/find-id', '/find-password', '/profile', '/customer-center', '/my-scraps', '/my-posts', '/my-comments', '/chats', '/rooms', '/create-room', '/clans', '/boards'].some(path => location.pathname.startsWith(path));

  const { showAlert } = useAlert();
  const [user, setUser] = useState(null);
  const [notificationCounts, setNotificationCounts] = useState({ chat: 0, profile: 0, etc: 0 });
  const [installPrompt, setInstallPrompt] = useState(null);

  // [신규] 매너 평가 모달 상태
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [evalRoomId, setEvalRoomId] = useState(null);

  // --- 👇 [신규] PWA 설치 프롬프트 이벤트 리스너 (setInstallPrompt 경고 해결) ---
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      console.log("PWA 설치 프롬프트 준비됨.");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  // --- 👆 [신규] ---

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("bandicon_user");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    navigate("/login");
  }, [navigate]);

  const checkAlerts = useCallback(async (currentUser) => {
    if (!currentUser?.nickname) return;
    try {
      const res = await apiGet(`/users/alerts/?read=false&nickname=${encodeURIComponent(currentUser.nickname)}`);

      // 1. 매너 평가 알림 찾기 (alert_type 우선, 없으면 URL 파싱)
      const mannerEvalAlert = res.find(alert => {
        const isTypeMatch = alert.alert_type === 'EVALUATION_REQUEST';
        const isUrlMatch = alert.related_url && (alert.related_url.includes('/evaluation/') || alert.related_url.includes('/evaluate'));
        return isTypeMatch || isUrlMatch;
      });

      if (mannerEvalAlert) {
        // 모달 띄우기
        // related_id가 있으면 그걸 쓰고, 없으면 URL에서 파싱
        let roomId = mannerEvalAlert.related_id;
        if (!roomId && mannerEvalAlert.related_url) {
          const match = mannerEvalAlert.related_url.match(/\/rooms\/(\d+)\/evaluate/);
          if (match) roomId = match[1];
        }

        if (roomId) {
          setEvalRoomId(roomId);
          setIsEvalModalOpen(true);
        }
      }
      // (다른 알림 처리는 필요 시 여기에 추가)
    } catch (e) {
      console.debug("alert check error:", e?.message || e);
    }
  }, []); // [수정] 의존성 배열 비움 (무한루프 방지) 혹은 필요한 것만 넣음

  const fetchNotificationCounts = useCallback(async (currentUser) => {
    if (!currentUser?.nickname) return;
    try {
      const counts = await apiGet(`/users/notifications/counts?nickname=${encodeURIComponent(currentUser.nickname)}`);
      setNotificationCounts(counts);
    } catch (e) {
      console.debug("count fetch error:", e);
    }
  }, []);

  const formatCount = (count) => {
    if (count <= 0) return '';
    return `(${Math.min(count, 9)})`;
  };

  const handleLogin = async (loginRes) => {
    setUser(loginRes);
    localStorage.setItem("bandicon_user", JSON.stringify(loginRes));

    try {
      console.log("🔔 로그인 후 푸시 알림 설정 시작");
      const token = await requestForToken(loginRes.nickname);
      if (token) {
        localStorage.setItem("fcm_registered_v2", "1");
        console.log("✅ 푸시 알림 설정 완료");
      }
    } catch (error) {
      console.error("❌ 푸시 알림 설정 실패:", error);
    }

    checkAlerts(loginRes);
    fetchNotificationCounts(loginRes);
    navigate("/");
  };

  const handleUpdateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem("bandicon_user", JSON.stringify(updatedUser));
  };

  useEffect(() => {
    const saved = localStorage.getItem("bandicon_user");
    const already = localStorage.getItem("fcm_registered_v1") === "1";
    if (saved) {
      const u = JSON.parse(saved);
      if (Notification.permission === "granted" && !already) {
        requestForToken(u.nickname).then((t) => {
          if (t) localStorage.setItem("fcm_registered_v1", "1");
        });
      }
    }
  }, []);

  useEffect(() => {
    const checkLoginStatus = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          const userData = await apiGet('/users/me/');

          if (userData && userData.id) {
            setUser(userData);
            localStorage.setItem("bandicon_user", JSON.stringify(userData));
          } else {
            throw new Error('Invalid user data');
          }

        } catch (error) {
          console.error("토큰이 유효하지 않습니다. 로그아웃 처리:", error);
          if (window.location.pathname !== '/login') {
            handleLogout();
          }
        }
      } else {
        const path = window.location.pathname;
        const isPublicPage =
          path === '/login' ||
          path.startsWith('/signup') ||
          path.startsWith('/find-id') ||
          path.startsWith('/find-password') ||
          path === '/terms' ||
          path === '/privacy';

        if (!isPublicPage) {
          handleLogout();
        }
      }
    };

    checkLoginStatus();
  }, [handleLogout]);

  useEffect(() => {
    if (user) {
      checkAlerts(user);
      fetchNotificationCounts(user);

      const interval = setInterval(() => {
        fetchNotificationCounts(user);
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user, location, checkAlerts, fetchNotificationCounts]);

  useEffect(() => {
    if (!messaging || !user) return;

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('메시지 수신 (포그라운드): ', payload);
      fetchNotificationCounts(user);
    });

    return () => unsubscribe();
  }, [user, fetchNotificationCounts]);

  return (
    <div className="app-container">
      <main className="app-main">
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<LoginForm onLogin={handleLogin} installPrompt={installPrompt} />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/find-id" element={<FindIdPage />} />
              <Route path="/find-password" element={<FindPasswordPage />} />
              <Route path="/terms" element={<TermsPage />} />

              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="*" element={<LoginForm onLogin={handleLogin} installPrompt={installPrompt} />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />} />
              <Route path="/profile/edit" element={<ProfileEdit user={user} onUpdateUser={handleUpdateUser} />} />
              <Route path="/customer-center" element={<CustomerCenter user={user} />} />
              <Route path="/profile/:nickname" element={<OtherUserProfile user={user} />} />
              <Route path="/rooms" element={<RoomList user={user} />} />
              <Route path="/create-room" element={<CreateRoomForm user={user} />} />
              <Route path="/rooms/:roomId" element={<RoomDetail user={user} />} />
              <Route path="/rooms/:roomId/schedule" element={<RoomSchedule user={user} />} />
              <Route path="/my-rooms" element={<MyRooms user={user} />} />
              <Route path="/evaluation/:roomId" element={<MannerEval user={user} />} />
              <Route path="/boards" element={<BoardHome user={user} />} />
              <Route path="/boards/:boardType" element={<BoardList user={user} />} />
              <Route path="/boards/clan/:boardId" element={<BoardList user={user} />} />
              <Route path="/post/:postId" element={<PostDetail user={user} />} />
              <Route path="/create-post/:boardType" element={<CreatePost user={user} />} />
              <Route path="/create-post/clan/:boardId" element={<CreatePost user={user} />} />
              <Route path="/my-scraps" element={<ScrappedPosts user={user} />} />
              <Route path="/my-posts" element={<MyPosts user={user} />} />
              <Route path="/my-comments" element={<MyComments user={user} />} />
              <Route path="/chats" element={<ChatList user={user} />} />
              <Route path="/chats/friends/add" element={<FriendAdd user={user} />} />
              <Route path="/chats/:type/:id" element={<ChatHub user={user} />} />
              <Route path="/clans" element={<ClanHome user={user} />} />
              <Route path="/clans/create" element={<CreateClan user={user} />} /> {/* [New] Create Clan Page */}
              <Route path="/clans/my" element={<MyClans user={user} />} /> {/* [New] My Clan List */}
              <Route path="/clans/:clanId" element={<ClanDetail user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout} />} />
              <Route path="/clans/:clanId/rooms" element={<ClanRoomListPage user={user} />} />
              <Route path="/clans/:clanId/members" element={<ClanMemberListPage user={user} />} />
              <Route path="/clans/:clanId/dashboard" element={<ClanRoomDashboard user={user} />} />
              <Route path="/clans/:clanId/activity" element={<ClanMemberActivity user={user} />} />
              <Route path="/clans/:clanId/boards" element={<ClanBoardList user={user} />} />
              <Route path="/clans/:clanId/announcements" element={<ClanAnnouncementList user={user} />} />
              <Route path="/clans/:clanId/events" element={<ClanCalendarPage user={user} />} />
              <Route path="/ambassador" element={
                <div style={{ padding: '20px', textAlign: 'center', marginTop: '50px' }}>
                  <h2>엠버서더 화면</h2>
                  <p>준비 중인 페이지입니다.</p>
                </div>
              } />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {user.role === 'OPERATOR' && (
                <>
                  <Route path="/admin" element={<AdminPage user={user} />} />
                  <Route path="/admin/support" element={<AdminSupportPage user={user} />} />
                </>
              )}
              <Route path="/support" element={<SupportPage user={user} />} />
              <Route path="/login" element={<Home user={user} />} />
              <Route path="/signup" element={<Home user={user} />} />
              <Route path="*" element={<Home user={user} />} />
            </>
          )}
        </Routes>
      </main>



      {user && <PopupAnnouncement user={user} />}

      {/* [신규] 매너 평가 모달 */}
      {user && (
        <MannerEvalModal
          isOpen={isEvalModalOpen}
          onClose={() => {
            setIsEvalModalOpen(false);
            setEvalRoomId(null);
            // 닫을 때는 즉시 다시 체크하지 않음 (새로고침 시 다시 뜸)
          }}
          roomId={evalRoomId}
          user={user}
        />
      )}
    </div>
  );
}

// --- 👇 [수정] 'App' 대신 'AppContent'를 export 합니다 ---
export default AppContent;
// --- 👆 [수정] ---