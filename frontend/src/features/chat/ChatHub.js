import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { apiGet, apiPostForm, apiPost } from "../../api/api";
import RoomChat from "../../components/RoomChat";
import ClanChat from "../chat/ClanChat";

const ChatHub = ({ user }) => {
  const { type, id } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [roomInfo, setRoomInfo] = useState(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  const isInitialLoad = useRef(true);

  const fetchMessages = useCallback(async () => {
    if (type === "direct") {
      try {
        const encodedOther = encodeURIComponent(id);
        // [수정] 백엔드 경로: /users/chat/direct/<nickname>/
        const data = await apiGet(`/users/chat/direct/${encodedOther}/`);
        setMessages(data || []);
        setOtherUser(id);

        // Alert 기반 읽음 처리
        try {
          // [수정] URL 기반 읽음 처리 (POST /users/alerts/read-by-url/)
          // body: { "url": "/chats/direct/<other_nickname>" }
          await apiPost('/users/alerts/read-by-url/', { url: `/chats/direct/${id}` });
        } catch (readErr) {
          console.error("읽음 처리 실패:", readErr);
        }
      } catch (err) {
        console.error("1:1 채팅 불러오기 실패:", err);
      }
    }
  }, [type, id, user.nickname]);

  useEffect(() => {
    if (type === "direct") {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchMessages, type]);

  // 방 정보 가져오기
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
    }
  }, [type, id]);

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      // [수정] 1:1 채팅 전송 (POST /users/chat/direct/)
      // Body: { receiver: 'nickname', message: 'text' }
      await apiPost('/users/chat/direct/', {
        receiver: otherUser,
        message: input.trim()
      });

      setInput("");

      // 키패드 유지를 위한 포커스 복원
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);

      // 메시지 다시 가져오기
      await fetchMessages();

      // 스크롤 아래로
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTo({
            top: messageListRef.current.scrollHeight,
            behavior: 'smooth'
          });
        }
      }, 100);

    } catch (err) {
      console.error("메시지 전송 오류:", err);
      alert(err.response?.data?.detail || "메시지 전송에 실패했습니다.");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
  };

  // 날짜/시간 포맷팅 함수들
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

  const formatTime = (msg) => {
    const timeField = msg.timestamp || msg.created_at || msg.date || msg.time;

    if (!timeField) return "방금";

    try {
      const date = new Date(timeField);
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
    const currentTime = currentMsg.timestamp || currentMsg.created_at || currentMsg.date || currentMsg.time;
    const prevTime = prevMsg.timestamp || prevMsg.created_at || prevMsg.date || prevMsg.time;

    if (!currentTime || !prevTime) return false;

    const currentDate = new Date(currentTime).toDateString();
    const prevDate = new Date(prevTime).toDateString();
    return currentDate !== prevDate;
  };

  if (type === "group") {
    return <RoomChat roomId={parseInt(id)} user={user} roomInfo={roomInfo} />;
  }

  if (type === "clan") {
    return <ClanChat clanId={parseInt(id)} user={user} />;
  }

  if (type === "direct") {
    return (
      <div className="chat-page-container">
        <div className="chat-header">
          <button
            className="chat-back-button"
            onClick={() => window.history.back()}
          >
            ←
          </button>
          {otherUser}님과의 채팅
        </div>
        <div ref={messageListRef} className="message-list">
          {Array.isArray(messages) && messages.map((msg, index) => (
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
                    {formatDate(msg.timestamp || msg.created_at || msg.date || msg.time)}
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
                  {formatTime(msg)}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        <div className="chat-input">
          <form onSubmit={handleFormSubmit} className="message-input-form">
            <button
              type="button"
              onClick={() => alert("아직 열리지 않은 기능입니다.")}
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
            <button type="submit" disabled={!input.trim()}>
              전송
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <div>지원하지 않는 채팅 유형입니다.</div>;
};

export default ChatHub;