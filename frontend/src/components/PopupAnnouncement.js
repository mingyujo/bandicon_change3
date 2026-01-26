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
        const data = await apiGet(`/support/popup-announcements/unread/?nickname=${encodeURIComponent(user.nickname)}`);

        if (data && data.length > 0) {
          setAnnouncements(data);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.debug('팝업 공지 조회 실패(404는 정상일 수 있음):', error);
      }
    };

    fetchUnreadAnnouncements();
  }, [user]);

  const handleConfirm = async () => {
    const currentAnnouncement = announcements[currentIndex];

    try {
      await apiPost(`/support/popup-announcements/${currentAnnouncement.id}/read/?nickname=${encodeURIComponent(user.nickname)}`);

      if (currentIndex < announcements.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setAnnouncements([]);
      }
    } catch (error) {
      console.error('공지 확인 처리 실패:', error);
      setAnnouncements([]);
    }
  };

  if (!announcements.length || !announcements[currentIndex]) {
    return null;
  }

  const currentAnnouncement = announcements[currentIndex];

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '380px' }}>
        <h3>
          📢 밴디콘 공지사항
        </h3>

        <div style={{
          backgroundColor: '#f9fafb',
          padding: '20px',
          borderRadius: '16px',
          marginBottom: '24px',
          textAlign: 'left',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{
            marginTop: 0,
            marginBottom: '12px',
            color: '#1f2937',
            fontSize: '1.1rem',
            fontWeight: '600'
          }}>
            {currentAnnouncement.title}
          </h4>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            color: '#4b5563',
            fontSize: '0.95rem'
          }}>
            {currentAnnouncement.content}
          </div>
        </div>

        {announcements.length > 1 && (
          <div style={{
            marginBottom: '20px',
            fontSize: '0.9rem',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {currentIndex + 1} / {announcements.length}
          </div>
        )}

        <div className="modal-actions">
          <button
            onClick={handleConfirm}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '1rem', borderRadius: '12px' }}
          >
            확인했습니다
          </button>
        </div>
      </div>
    </div>
  );
};

export default PopupAnnouncement;