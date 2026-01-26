import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPost } from "../../api/api";
import RoomChat from "../../components/RoomChat";
import ClanChat from "../chat/ClanChat";
import DirectChat from "./DirectChat";

const ChatHub = ({ user }) => {
  const { type, id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  const isInitialLoad = useRef(true);

  // 방 정보 가져오기 (Group Chat only) - Polling 추가
  useEffect(() => {
    if (type === "group") {
      const fetchRoomInfo = async () => {
        try {
          const data = await apiGet(`/rooms/${id}`);
          setRoomInfo(data);
        } catch (err) {
          console.error("방 정보 로딩 실패:", err);
        }
      };

      fetchRoomInfo();
      const interval = setInterval(fetchRoomInfo, 3000); // 3초마다 갱신
      return () => clearInterval(interval);
    }
  }, [type, id]);

  if (type === "group") {
    return <RoomChat roomId={parseInt(id)} user={user} roomInfo={roomInfo} />;
  }

  if (type === "clan") {
    return <ClanChat clanId={parseInt(id)} user={user} />;
  }

  if (type === "direct") {
    return <DirectChat user={user} friendNickname={id} />;
  }

  return <div>지원하지 않는 채팅 유형입니다.</div>;
};

export default ChatHub;