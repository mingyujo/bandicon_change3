import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../api/api';

// 인라인 SVG 아이콘
const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
  </svg>
);

// 시간 계산 함수
const timeSince = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "년 전";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "달 전";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "일 전";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "시간 전";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "분 전";
  return Math.floor(seconds) + "초 전";
};

const NotificationBell = ({user}) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. 읽지 않은 알림 개수 가져오기 (30초마다)
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      // (GET /api/v1/users/alerts/?read=false)
      const unreadAlerts = await apiGet('/users/alerts/?read=false');
      setUnreadCount(unreadAlerts.length);
    } catch (error) {
      console.error("Failed to fetch unread alert count:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30초마다 새로고침
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // 2. 드롭다운 열릴 때 전체 알림 목록 가져오기
  const fetchAllAlerts = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // (GET /api/v1/users/alerts/)
      const allAlerts = await apiGet('/users/alerts/');
      setAlerts(allAlerts);
    } catch (error) {
      console.error("Failed to fetch all alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  // 3. 드롭다운 토글 핸들러
  const toggleDropdown = () => {
    if (!isOpen) {
      // 닫혀있었다면, 새로 열면서 알림 목록을 로드
      fetchAllAlerts();
    }
    setIsOpen(!isOpen);
  };

  // 4. 알림 클릭 핸들러 (읽음 처리 + 페이지 이동)
  const handleAlertClick = async (alert) => {
    // 1. 읽음 처리 (아직 안 읽은 경우에만)
    if (!alert.is_read) {
      try {
        // (POST /api/v1/users/alerts/<pk>/read/)
        await apiPost(`/users/alerts/${alert.id}/read/`);
        // 상태 즉시 반영
        setUnreadCount(prev => prev - 1);
        setAlerts(prevAlerts => 
          prevAlerts.map(a => a.id === alert.id ? { ...a, is_read: true } : a)
        );
      } catch (err) {
        console.error("Failed to mark alert as read:", err);
      }
    }

    // 2. 드롭다운 닫기
    setIsOpen(false);

    // 3. 링크가 있으면 페이지 이동
    if (alert.link_url) {
      navigate(alert.link_url);
    }
  };

  if (!user) {
    return null; // 로그인 안 했으면 아무것도 안 보임
  }

  return (
    <div style={{ position: 'relative', marginRight: '20px' }}>
      {/* 알림 벨 아이콘 버튼 */}
      <button onClick={toggleDropdown} style={styles.bellButton}>
        <BellIcon />
        {/* 읽지 않은 알림 배지 */}
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div style={styles.dropdownMenu}>
          <div style={styles.dropdownHeader}>알림 목록</div>
          {loading ? (
            <div style={styles.alertItem}>로딩 중...</div>
          ) : alerts.length === 0 ? (
            <div style={styles.alertItem}>새 알림이 없습니다.</div>
          ) : (
            <div style={styles.alertsContainer}>
              {alerts.map(alert => (
                <div 
                  key={alert.id} 
                  style={{...styles.alertItem, ...(alert.is_read ? styles.alertRead : styles.alertUnread)}}
                  onClick={() => handleAlertClick(alert)}
                >
                  <p style={styles.alertMessage}>{alert.message}</p>
                  <small style={styles.alertTime}>{timeSince(alert.created_at)}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 님의 프로젝트 CSS(card, btn 등)와 겹치지 않도록 인라인 스타일 사용
const styles = {
  bellButton: {
    position: 'relative',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#333', // (App.js 헤더 색상에 맞춰 조정 필요)
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-10px',
    background: 'red',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '40px', // 아이콘 아래
    right: 0,
    width: '350px',
    maxHeight: '400px',
    overflow: 'hidden',
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  dropdownHeader: {
    padding: '12px 16px',
    fontWeight: 'bold',
    fontSize: '16px',
    borderBottom: '1px solid #eee',
  },
  alertsContainer: {
    maxHeight: '340px', // (maxHeight - headerHeight)
    overflowY: 'auto',
  },
  alertItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
  },
  alertUnread: {
    backgroundColor: '#f8f9fa', // 안 읽은 알림 배경색
  },
  alertRead: {
    backgroundColor: 'white',
    color: '#888', // 읽은 알림은 흐리게
  },
  alertMessage: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.4,
  },
  alertTime: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
  }
};

export default NotificationBell;