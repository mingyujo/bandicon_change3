// RoomChat.js - 수정된 버전
import React, { useEffect, useState, useRef, useCallback } from "react";
import { apiGet, apiPostForm } from "../api/api";
import { useAlert } from "../context/AlertContext";

const RoomChat = ({ roomId, roomInfo, user }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messageListRef = useRef(null);
  const isInitialLoad = useRef(true);
  const { showAlert } = useAlert();
  const inputRef = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      // ▼▼▼ [수정] URL 변경 (/chat/group/ -> /rooms/{id}/chat/) ▼▼▼
      // 백엔드 room_app/urls.py에 정의된 주소로 맞춥니다.
      const data = await apiGet(`/rooms/${roomId}/chat/`);
      // 페이지네이션 대응 (data.results가 있으면 사용, 아니면 data 자체가 배열)
      setMessages(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      if (err.response?.status !== 404) console.error("단체 채팅 불러오기 실패:", err);
    }
  }, [roomId]);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // 단체 채팅 읽음 처리
  useEffect(() => {
    const markRoomChatAsRead = async () => {
      if (user?.nickname && roomId) {
        try {
          const formData = new FormData();
          formData.append('nickname', user.nickname);
          formData.append('related_url', `/chats/group/${roomId}`);
          // ▼▼▼ [수정] URL 변경 (/alerts -> /users/alerts) ▼▼▼
          await apiPostForm('/users/alerts/read-by-url/', formData);
          // ▲▲▲ [수정] ▲▲▲console.log("✅ 단체 채팅 읽음 처리 완료");
        } catch (err) {
          console.error("단체 채팅 읽음 처리 실패:", err);
        }
      }
    };

    markRoomChatAsRead();
  }, [user, roomId]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const formData = new FormData();
    formData.append('sender', user.nickname);
    formData.append('room_id', roomId);
    formData.append('message', input.trim());

    try {
      // ▼▼▼ [수정] URL 변경 (/chat/group -> /rooms/{id}/chat/) ▼▼▼
      await apiPostForm(`/rooms/${roomId}/chat/`, formData);
      // ▲▲▲ [수정] ▲▲▲
      setInput("");

      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);

      await fetchMessages();
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    } catch (err) {
      alert(err.response?.data?.detail || "메시지 전송 실패");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  const handleImageUploadClick = () => {
    showAlert("알림", "아직 열리지 않은 기능입니다.", () => { }, false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "오늘";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "어제";
    } else {
      return date.toLocaleDateString('ko-KR', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\./g, '.').replace(/\s/g, '');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "방금";

    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      return "방금";
    }
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentTime = currentMsg.timestamp;
    const prevTime = prevMsg.timestamp;

    if (!currentTime || !prevTime) return false;

    const currentDate = new Date(currentTime).toDateString();
    const prevDate = new Date(prevTime).toDateString();
    return currentDate !== prevDate;
  };

  return (
    <div className="room-chat-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="chat-header" style={{ position: 'relative', height: '45px' }}>
        <button
          className="chat-back-button"
          onClick={() => window.history.back()}
        >
          ←
        </button>
        {roomInfo ? `${roomInfo.song} - ${roomInfo.artist}` : '합주방 채팅'}
      </div>

      <div ref={messageListRef} className="message-list">
        {messages.map((msg, index) => (
          <React.Fragment key={msg.id}>
            {shouldShowDateSeparator(msg, messages[index - 1]) && (
              <div style={{
                textAlign: 'center',
                margin: '20px 0',
                position: 'relative'
              }}>
                <div style={{
                  display: 'inline-block',
                  background: '#f0f0f0',
                  padding: '4px 12px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  {formatDate(msg.timestamp)}
                </div>
              </div>
            )}

            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '4px',
              marginBottom: '12px',
              flexDirection: msg.sender === user.nickname ? 'row-reverse' : 'row'
            }}>
              <div style={{
                maxWidth: '280px',
                padding: '8px 12px',
                borderRadius: '12px',
                background: msg.sender === user.nickname ? 'var(--primary-color, #007bff)' : 'white',
                color: msg.sender === user.nickname ? 'white' : '#333',
                border: msg.sender === user.nickname ? 'none' : '1px solid #e9ecef'
              }}>
                {msg.sender !== user.nickname && (
                  <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '4px' }}>
                    {msg.sender}
                  </div>
                )}
                {msg.message && <div>{msg.message}</div>}
                {msg.image_url && (
                  <img
                    src={msg.image_url}
                    alt="채팅 이미지"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      marginTop: msg.message ? '8px' : '0'
                    }}
                  />
                )}
              </div>

              <div style={{
                fontSize: '10px',
                color: '#999',
                whiteSpace: 'nowrap',
                marginBottom: '2px'
              }}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>

      <form onSubmit={handleFormSubmit} className="message-input-form">
        <button
          type="button"
          onClick={handleImageUploadClick}
          className="attach-button"
        >
          +
        </button>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요"
          rows="1"
        />
        <button type="submit" disabled={!input.trim()}>전송</button>
      </form>
    </div>
  );
};

export default RoomChat;