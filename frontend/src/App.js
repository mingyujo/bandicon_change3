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

import { apiGet, apiPost } from "./api/api";
import { AlertProvider, useAlert } from "./context/AlertContext";
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
  const [user, setUser] = useState(null)/* => {
    try {
      const saved = localStorage.getItem("bandicon_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });*/

  const [notificationCounts, setNotificationCounts] = useState({ chat: 0, profile: 0, etc: 0 });
  // ===== 아래 코드를 여기에 추가하세요 =====
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
  const checkLoginStatus = async () => {
    const token = localStorage.getItem('accessToken');
    const currentPath = window.location.pathname;
    
    if (token) {
      try {
        const userData = await apiGet('/users/me/');
        
        // 유저 정보가 없으면 문제가 있는 것
        if (!userData || !userData.id) {
          throw new Error('Invalid user data');
        }
        
        setUser(userData);
        localStorage.setItem("bandicon_user", JSON.stringify(userData));
        
      } catch (error) {
        console.error("토큰 검증 실패:", error);
        
        // 로그인/회원가입 페이지가 아닌 경우에만 리다이렉트
        if (currentPath !== '/login' && currentPath !== '/signup') {
          handleLogout();
        }
      }
    } else {
      // 토큰이 없고 보호된 페이지에 있으면 로그인으로
      const isPublicPage = currentPath === '/login' || 
                          currentPath === '/signup' || 
                          currentPath === '/';
      
      if (!isPublicPage) {
        navigate('/login');
      }
    }
  };

  checkLoginStatus();
}, []); // handleLogout을 의존성에서 제거
  // ===== 여기까지 추가 =====
  const checkAlerts = useCallback(async (currentUser) => {
      if (!currentUser?.nickname) return;
      try {
        const res = await apiGet(`/alerts/${encodeURIComponent(currentUser.nickname)}`);
        
        // [수정] 중요 알림(매너평가)이 있는지 모든 미확인 알림을 확인하도록 변경
        const mannerEvalAlert = res.find(alert => 
            alert.related_url && 
            alert.related_url.includes('/manner-eval/') &&
            (location.pathname + location.search) !== alert.related_url
        );

        if (mannerEvalAlert) {
            showAlert(
              "새로운 알림",
              mannerEvalAlert.message,
              async () => {
                try {
                  // 알림을 '읽음'으로 처리
                  await apiPost(`/alerts/${mannerEvalAlert.id}/read?nickname=${encodeURIComponent(currentUser.nickname)}`);
                  // 평가 페이지로 이동
                  navigate(mannerEvalAlert.related_url);
                } catch (e) {
                  console.error("Failed to mark alert as read", e);
                  // API 실패 시에도 페이지는 이동
                  navigate(mannerEvalAlert.related_url);
                }
              },
              // [수정] 네 번째 인자를 alert.id 대신 false로 변경하여 '확인' 버튼만 보이게 함
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
      const counts = await apiGet(`/notifications/counts?nickname=${encodeURIComponent(currentUser.nickname)}`);
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
    
    // 🔥 푸시 알림 등록 (로그인 직후)
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
  
  // 앱 시작/새로고침 시, 이미 로그인된 사용자라면 자동 등록 시도
  useEffect(() => {
    const saved = localStorage.getItem("bandicon_user");
    const already = localStorage.getItem("fcm_registered_v1") === "1";
    if (saved) {
      const u = JSON.parse(saved);
      // 권한이 이미 허용되어 있다면 조용히 재등록(1회만)
      if (Notification.permission === "granted" && !already) {
        requestForToken(u.nickname).then((t) => {
          if (t) localStorage.setItem("fcm_registered_v1", "1");
        });
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    alert("handleLogout 함수 실행! 토큰 삭제 및 /login으로 이동합니다."); // 🚨 이 줄을 추가하세요!
    setUser(null);
    localStorage.removeItem("bandicon_user");
    localStorage.removeItem("accessToken")
    navigate("/login");
  }, [navigate]);

  // 앱이 시작될 때, localStorage에 저장된 유저 정보가 최신 정보인지 서버에 확인하고 갱신합니다.
  // --- 👇👇👇 이 코드로 교체하세요 (새로고침 시 로그인 복원) 👇👇👇 ---
  useEffect(() => {
    // 앱이 처음 로드될 때(새로고침 시) 딱 1번 실행됩니다.
    
    const checkLoginStatus = async () => {
      // 1. 'accessToken'이 있는지 확인합니다. ('bandicon_user'가 아님)
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        // 2. 토큰이 있다면, /users/me/ API로 유저 프로필을 요청합니다.
        //    (api.js의 인터셉터가 토큰을 헤더에 실어줄 것입니다)
        try {
          const userData = await apiGet('/users/me/'); // (LoginForm.js와 동일한 API)
          
          // 3. 성공하면, 'handleLogin' 함수를 호출해 전역 상태와 localStorage를 채웁니다.
          handleLogin(userData);
          
        } catch (error) {
          // (토큰이 만료되었거나 유효하지 않은 경우)
          console.error("토큰이 유효하지 않습니다. 로그아웃 처리:", error);
          alert("401 에러 감지! 강제 로그아웃을 시도합니다.");
          // handleLogout은 navigate('/login')을 실행하므로,
          // 현재 위치가 /login이 아닐 때만 호출해야 무한 루프를 방지할 수 있습니다.
          //if (window.location.pathname !== '/login') {
            handleLogout();
          //}
        }
      } else {
        // 토큰이 아예 없으면 로그아웃 상태로 둡니다.
        // (로그인 페이지가 아닌데 토큰이 없다면 강제 로그아웃)
        const isPublicPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
        if (!isPublicPage) {
          handleLogout();
        }
      }
    };

    checkLoginStatus();
  }, [handleLogout]); // 'handleLogout'을 의존성에 포함 (useCallback으로 감싸져 있으므로 OK)
  // --- -------------------------------------------- ---
  useEffect(() => {
    if (user) {
      // 중요 알림(매너평가 등) 확인
      checkAlerts(user);
      // 페이지 이동 시마다 알림 개수 새로고침
      fetchNotificationCounts(user);

      // 15초마다 백그라운드에서 계속 새로고침
      const interval = setInterval(() => {
        fetchNotificationCounts(user);
      }, 10000);
      
      // 컴포넌트가 사라질 때 인터벌 정리
      return () => clearInterval(interval);
    }
  }, [user, location, checkAlerts, fetchNotificationCounts]);

  // 푸시 알림 수신 리스너 (이 부분은 그대로 유지)
  useEffect(() => {
    if(!messaging || !user) return;
    
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('메시지 수신 (포그라운드): ', payload);
      
      // 알림 카운트만 업데이트 (알림 표시 안함)
      fetchNotificationCounts(user);
    });
    
    return () => unsubscribe();
  }, [user, fetchNotificationCounts]);


  return (
    <div className="app-container">
      {/* ▼▼▼ 이 부분을 수정하세요 ▼▼▼ */}
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
            {user.role === "운영자" && <Link to="/admin">운영자</Link>}
          </nav>
        )}
      </header>
    )}
      <main className="app-main">
        <Routes>
          {!user ? (
            <>
              {/* ===== 여기를 수정하세요 ===== */}
              <Route path="/login" element={<LoginForm onLogin={handleLogin} installPrompt={installPrompt} />} />
              <Route path="/signup" element={<SignupForm onLogin={handleLogin} />} />
              {/* ===== 여기도 수정하세요 ===== */}
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
              <Route path="/manner-eval/:roomId" element={<MannerEval user={user} />} />
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
              {/* ✅ 2. 여기에 약관 페이지 주소를 추가하세요. */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/admin" element={<AdminPage user={user} />} />
              <Route path="/admin/support" element={<AdminSupportPage user={user} />} />
              <Route path="/support" element={<SupportPage user={user} />} />
              <Route path="/login" element={<Home user={user} />} />
              <Route path="/signup" element={<Home user={user} />} />
              <Route path="*" element={<Home user={user} />} />
            </>
          )}
        </Routes>
      </main>
      
      {/* 팝업 공지사항 */}
      {user && <PopupAnnouncement user={user} />}
    </div>
  );
}

const App = () => (
  <AlertProvider>
    <AppContent />
  </AlertProvider>
);

export default App;