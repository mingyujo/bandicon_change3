import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, API_BASE_SERVER } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './MyRooms.css'; // Using the new CSS

function MyRooms({ user }) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMyRooms = async () => {
      try {
        setLoading(true);
        // Fetch from /rooms/my/
        const data = await apiGet('/rooms/my/');
        setRooms(data);
      } catch (err) {
        setError(err.message || '방 목록을 불러오는 데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchMyRooms();
    }
  }, [user]);

  const getMyStatus = (room) => {
    if (!user) return null;

    // 1. Check Participation
    const participatingSession = room.sessions.find(s => s.participant_nickname === user.nickname);
    if (participatingSession) {
      return {
        type: 'participating',
        label: participatingSession.session_name,
        colorClass: 'text-gray'
      };
    }

    // 2. Check Reservation (Application)
    for (const session of room.sessions) {
      if (session.reservations && session.reservations.some(r => r.user.nickname === user.nickname)) {
        return {
          type: 'reserved',
          label: session.session_name,
          colorClass: 'text-orange'
        };
      }
    }

    // 3. Manager but not in session?
    if (room.manager_nickname === user.nickname) {
      return {
        type: 'manager',
        label: '방장',
        colorClass: 'text-gray'
      };
    }

    return null;
  };

  if (loading) return <div className="p-4 text-center">로딩중...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;

  return (
    <MobileLayout>
      <GlobalHeader user={user} />


      {/* Fixed Page Header */}
      <div className="my-room-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 1L2 10L11 19" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="header-title">내 합주</div>
      </div>

      {/* Scrollable List Container */}
      <div className="my-room-scroll-container">
        <div className="my-room-list">
          {rooms.length === 0 ? (
            <div className="empty-state">참여 중인 합주가 없습니다.</div>
          ) : (
            rooms.map(room => {
              const status = getMyStatus(room);
              const roomImg = room.image
                ? (room.image.startsWith('http') ? room.image : API_BASE_SERVER + room.image) + `?v=${Date.now()}`
                : "https://placehold.co/67x67";

              return (
                <div key={room.id} className="my-room-card" onClick={() => navigate(`/rooms/${room.id}`)}>
                  <div className="room-img-wrapper">
                    <img src={roomImg} alt="Room" className="room-img" style={{ borderRadius: '50%', objectFit: 'cover' }} />
                  </div>
                  <div className="room-info">
                    <div className="room-title">{room.title}</div>
                    <div className="room-song">{room.song}</div>
                    <div className="room-artist">: {room.artist}</div>
                  </div>
                  <div className="room-status-col">
                    {status && (
                      <div className={`session-badge ${status.colorClass}`}>
                        {status.label}
                      </div>
                    )}
                    {room.ended && (
                      <div className="ended-badge">합주 종료</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <BottomNav />
    </MobileLayout >
  );
}

export default MyRooms;