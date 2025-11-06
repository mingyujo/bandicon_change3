// [새 파일] src/components/PopupAnnouncement.js
import React, { useState, useEffect } from 'react';
import { apiGet, apiPost } from '../api/api';

const PopupAnnouncement = ({ user }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchUnreadAnnouncements = async () => {
      if (!user?.nickname) return;
      
      try {
        const data = await apiGet(`/popup-announcements/unread?nickname=${encodeURIComponent(user.nickname)}`);
        if (data && data.length > 0) {
          setAnnouncements(data);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('팝업 공지 조회 실패:', error);
      }
    };

    fetchUnreadAnnouncements();
  }, [user]);

  const handleConfirm = async () => {
    const currentAnnouncement = announcements[currentIndex];
    
    try {
      // 현재 공지를 읽음으로 표시
      await apiPost(`/popup-announcements/${currentAnnouncement.id}/read?nickname=${encodeURIComponent(user.nickname)}`);
      
      // 다음 공지가 있으면 표시, 없으면 팝업 닫기
      if (currentIndex < announcements.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('공지 확인 처리 실패:', error);
      // 오류가 있어도 팝업은 닫기
      setAnnouncements([]);
    }
  };

  // 표시할 공지가 없으면 컴포넌트 렌더링 안 함
  if (!announcements.length || !announcements[currentIndex]) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
        <h3 style={{ 
          color: 'var(--primary-color)', 
          margin: '0 0 16px 0',
          fontSize: '1.3em',
          textAlign: 'center'
        }}>
          🎵 밴디콘 공지사항
        </h3>
        
        <div style={{ 
          backgroundColor: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ 
            margin: '0 0 12px 0', 
            color: '#333',
            fontSize: '1.1em'
          }}>
            {currentAnnouncement.title}
          </h4>
          <div style={{ 
            whiteSpace: 'pre-wrap', 
            lineHeight: '1.5',
            color: '#555',
            fontSize: '0.95em'
          }}>
            {currentAnnouncement.content}
          </div>
        </div>

        {announcements.length > 1 && (
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '16px',
            fontSize: '0.85em',
            color: '#666'
          }}>
            {currentIndex + 1} / {announcements.length}
          </div>
        )}
        
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={handleConfirm}
            style={{ 
              backgroundColor: 'var(--primary-color)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '6px', 
              cursor: 'pointer',
              fontSize: '1em',
              fontWeight: 'bold'
            }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupAnnouncement;