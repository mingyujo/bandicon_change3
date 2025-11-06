import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet } from "../../api/api";

function MyRooms({ user }) {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMyRooms = async () => {
      if (!user?.nickname) return;
      try {
        const res = await apiGet(`/rooms/my/${user.nickname}`);
        setRooms(res);
      } catch (err) {
        console.error("내 방 리스트 불러오기 실패", err);
      }
    };
    
    fetchMyRooms();
    const interval = setInterval(fetchMyRooms, 5000); // 5초마다 갱신
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div>
      <h2>참여한 방 리스트</h2>
      {rooms.length > 0 ? (
        rooms.map((room) => (
          <div
            key={room.id}
            style={{ border: "1px solid #ccc", margin: "10px 0", padding: "10px", cursor: "pointer", borderRadius: '8px',  backgroundColor: room.ended ? '#f1f1f1' : 'white', opacity: room.ended ? 0.6 : 1 }}
            onClick={() => navigate(`/rooms/${room.id}`)}
          >
            <h4>{room.title} {room.ended && "(종료)"}</h4>
            <p>{room.song} - {room.artist}</p>
          </div>
        ))
      ) : (
        <p>참여하고 있는 방이 없습니다.</p>
      )}
    </div>
  );
}

export default MyRooms;