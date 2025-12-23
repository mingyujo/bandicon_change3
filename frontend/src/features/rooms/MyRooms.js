import React, { useEffect, useState, useCallback } from "react"; // 👈 useCallback 임포트
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../api/api";

function MyRooms({ user }) {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  // --- 👇 [수정] useCallback으로 함수 감싸기 ---
  const fetchMyRooms = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      // --- 👇 [수정] URL에서 닉네임 제거 (백엔드가 request.user 사용) ---
      const res = await apiGet(`/rooms/my/`);
      setRooms(res);
    } catch (err) {
      console.error("내 방 리스트 불러오기 실패", err);
    }
  }, [user]); // 👈 user가 변경될 때만 함수가 재생성되도록
  // --- 👆 [수정] ---
    
  useEffect(() => {
    fetchMyRooms();
    const interval = setInterval(fetchMyRooms, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, [fetchMyRooms]); // 👈 fetchMyRooms를 의존성 배열에 추가

  return (
    <div>
      <h2 className="page-title" style={{ textAlign: 'left', marginBottom: '20px' }}>내 방 목록</h2>
      {rooms.length > 0 ? (
        // --- 👇 [수정] grid 레이아웃으로 변경 ---
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {rooms.map((room) => (
            <div
              key={room.id}
              className="card" // 👈 [수정] card 클래스 적용
              style={{ 
                cursor: "pointer", 
                backgroundColor: room.ended ? '#f9f9f9' : 'white', 
                opacity: room.ended ? 0.7 : 1,
                borderLeft: room.confirmed && !room.ended ? '4px solid var(--primary-color)' : '4px solid transparent'
              }}
              onClick={() => navigate(`/rooms/${room.id}`)}
            >
              <h3 style={{ margin: '0 0 10px 0' }}>{room.title} {room.ended && "(종료)"}</h3>
              <p style={{ margin: '0 0 5px 0' }}>{room.song} - {room.artist}</p>
              {/* --- 👇 [신규] 방장/참여 세션 표시 --- */}
              <p style={{ fontSize: '0.9em', color: '#555', margin: '10px 0 0 0', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                {room.manager_nickname === user.nickname 
                  ? <strong style={{ color: 'var(--primary-color)' }}>[방장]</strong> 
                  : `[참여: ${room.sessions.find(s => s.participant_nickname === user.nickname)?.session_name || '알 수 없음'}]`
                }
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          <p style={{ margin: 0 }}>참여하고 있는 방이 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default MyRooms;