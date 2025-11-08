// [전체 코드] src/App.js

import React, { useState, useEffect, useCallback} from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";

import RoomList from "./features/rooms/RoomList";
import RoomDetail from "./features/rooms/RoomDetail";
import MyRooms from "./features/rooms/MyRooms";
import CreateRoomForm from "./features/rooms/CreateRoomForm";
import Profile from "./features/profile/Profile";
import ChatHub from "./features/chat/ChatHub";
import ChatList from "./features/chat/ChatList";
import LoginForm from "./features/auth/LoginForm";
import SignupForm from "./features/auth/SignupForm";
import Home from "./features/home/Home";
import MannerEval from "./features/evaluation/MannerEval";
import BoardList from "./features/board/BoardList";
import PostDetail from "./features/board/PostDetail";
import CreatePost from "./features/board/CreatePost";
import ScrappedPosts from "./features/board/ScrappedPosts";
import BoardHome from "./features/board/BoardHome";
import ClanHome from "./features/clan/ClanHome";
import ClanDetail from "./features/clan/ClanDetail";
import ClanRoomListPage from "./features/clan/ClanRoomListPage";
import ClanRoomDashboard from "./features/clan/ClanRoomDashboard";
import ClanMemberActivity from "./features/clan/ClanMemberActivity";
import AdminPage from "./features/admin/AdminPage";
import AdminSupportPage from "./features/admin/AdminSupportPage";
import SupportPage from "./features/support/SupportPage";

// --- 👇 [수정] apiPostForm, AlertProvider 임포트 제거 ---
import { apiGet, apiPost } from "./api/api";
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
  const { showAlert } = useAlert();
  const [user, setUser] = useState(null);
  const [notificationCounts, setNotificationCounts] = useState({ chat: 0, profile: 0, etc: 0 });
  const [installPrompt, setInstallPrompt] = useState(null);

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
        const res = await apiGet(`/users/alerts/${encodeURIComponent(currentUser.nickname)}`);
        
        const mannerEvalAlert = res.find(alert => 
            alert.related_url && 
            alert.related_url.includes('/evaluation/') && 
            (location.pathname + location.search) !== alert.related_url
        );

        if (mannerEvalAlert) {
            showAlert(
              "새로운 알림",
              mannerEvalAlert.message,
              async () => {
                try {
                  // [수정] 알림 API 경로 변경
                  await apiPost(`/users/alerts/${mannerEvalAlert.id}/read/`);
                  navigate(mannerEvalAlert.related_url);
                } catch (e) {
                  console.error("Failed to mark alert as read", e);
                  navigate(mannerEvalAlert.related_url);
                }
              },
              false 
            );
        }
      } catch (e) {
        console.debug("alert check error:", e?.message || e);
      }
  }, [navigate, location, showAlert]);
  
  const fetchNotificationCounts = useCallback(async (currentUser) => {
    if (!currentUser?.nickname) return;
    try {
      const counts = await apiGet(`/users/notifications/counts?nickname=${encodeURIComponent(currentUser.nickname)}`);
      setNotificationCounts(counts);
    } catch(e) {
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
        const isPublicPage = window.location.pathname === '/login' || window.location.pathname.startsWith('/signup');
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
    if(!messaging || !user) return;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('메시지 수신 (포그라운드): ', payload);
      fetchNotificationCounts(user);
    });
    
    return () => unsubscribe();
  }, [user, fetchNotificationCounts]);


  return (
    <div className="app-container">
      {!isDashboardPage && (
        <header className="app-header">
        <div className="header-top">
          <Link to="/" className="brand">Bandicon</Link>
          <div className="app-header__right">
            {user ? (
              <span style={{fontWeight: '500'}}>{user.nickname}님</span>
            ) : (
              <div style={{display: 'flex', gap: '16px'}}>
                <Link to="/login">로그인</Link>
                <Link to="/signup">회원가입</Link>
              </div>
            )}
          </div>
        </div>
        {user && (
          <nav className="nav">
            <Link to="/rooms">자유 합주방</Link>
            <Link to="/my-rooms">내 방</Link>
            <Link to="/boards">게시판</Link>
            <Link to="/clans">클랜</Link>
            <Link to="/chats">채팅 {formatCount(notificationCounts.chat)}</Link>
            <Link to="/profile">프로필 {formatCount(notificationCounts.profile)}</Link>
            {user.role === "ADMIN" && <Link to="/admin">운영자</Link>}
          </nav>
        )}
      </header>
    )}
      <main className="app-main">
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<LoginForm onLogin={handleLogin} installPrompt={installPrompt} />} />
              <Route path="/signup" element={<SignupForm />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="*" element={<LoginForm onLogin={handleLogin} installPrompt={installPrompt} />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home user={user} />} />
              <Route path="/profile" element={<Profile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />} />
              <Route path="/profile/:nickname" element={<Profile user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />} />
              <Route path="/rooms" element={<RoomList user={user} />} />
              <Route path="/rooms/:roomId" element={<RoomDetail user={user} />} />
              <Route path="/create-room" element={<CreateRoomForm user={user} />} />
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
              <Route path="/chats/:type/:id" element={<ChatHub user={user} />} />
              <Route path="/clans" element={<ClanHome user={user} />} />
              <Route path="/clans/:clanId" element={<ClanDetail user={user} onUpdateUser={handleUpdateUser} onLogout={handleLogout}/>} />
              <Route path="/clans/:clanId/rooms" element={<ClanRoomListPage user={user} />} />
              <Route path="/clans/:clanId/dashboard" element={<ClanRoomDashboard user={user} />} />
              <Route path="/clans/:clanId/activity" element={<ClanMemberActivity user={user} />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              {user.role === 'ADMIN' && (
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
    </div>
  );
}

// --- 👇 [수정] 'App' 대신 'AppContent'를 export 합니다 ---
export default AppContent;
// --- 👆 [수정] ---