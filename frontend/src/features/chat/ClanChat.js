import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet, API_BASE_SERVER } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import './ClanChat.css';

const ClanChat = ({ user }) => {
  const { clanId: paramClanId, id: paramId } = useParams();
  // 라우트 경로에 따라 id가 다를 수 있음 (/clans/:clanId/chat, /chats/clan/:id)
  const clanId = paramClanId || paramId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const { showAlert } = useAlert();

  // 웹소켓 객체를 저장할 Ref
  const socketRef = useRef(null);

  // 1. 기존 메시지 불러오기 (처음 1회만 HTTP 요청)
  const fetchMessages = async () => {
    try {
      const data = await apiGet(`/clans/${clanId}/chat/`);
      setMessages(data);
    } catch (err) {
      console.error("채팅 기록 로딩 실패", err);
    }
  };

  useEffect(() => {
    if (!clanId) return;

    // 처음 접속 시 기존 대화 내용 불러오기
    fetchMessages();

    // 2. 웹소켓 연결 시작
    // API_BASE_SERVER (예: http://localhost:8000)에서 ws/wss 주소로 변환
    let wsBaseUrl = API_BASE_SERVER.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    // 뒤에 슬래시가 붙어있을 경우 제거
    if (wsBaseUrl.endsWith('/')) {
      wsBaseUrl = wsBaseUrl.slice(0, -1);
    }
    const wsUrl = `${wsBaseUrl}/ws/clans/${clanId}/chat/`;

    console.log("Connecting to WebSocket:", wsUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ 클랜 채팅 서버에 연결되었습니다.');
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);
      // 서버에서 온 메시지를 리스트에 추가
      setMessages((prev) => [...prev, {
        sender: data.sender,
        content: data.message, // 서버는 'message', 클라이언트는 'content' 사용 중 (여기서 매핑)
        timestamp: data.timestamp || new Date().toISOString()
      }]);
    };

    socket.onclose = () => {
      console.log('❌ 채팅 서버 연결이 종료되었습니다.');
    };

    socket.onerror = (err) => {
      console.error('채팅 소켓 에러:', err);
    };

    // 컴포넌트 언마운트 시 소켓 연결 해제
    return () => {
      if (socket.readyState === 1) { // OPEN 상태면 닫기
        socket.close();
      }
    };
  }, [clanId]);

  // 3. 스크롤 자동 이동
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. 메시지 전송 (웹소켓 방식)
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      showAlert('로그인이 필요합니다.', 'error');
      return;
    }

    // 소켓이 연결된 상태일 때만 전송
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const messageData = {
        message: newMessage,
        sender: user.nickname // JWT 인증 대신 메시지에 포함해서 보냄 (간편 구현)
      };

      socketRef.current.send(JSON.stringify(messageData));
      setNewMessage(''); // 입력창 비우기
    } else {
      showAlert('채팅 서버와 연결되어 있지 않습니다.', 'error');
    }
  };

  return (
    <div className="clan-chat-container">
      <div className="chat-header">
        <h3 className="chat-title">🛡️ 클랜 채팅</h3>
        <span className="chat-status">● 실시간 연결됨</span>
      </div>

      <div className="chat-body">
        {messages.map((msg, index) => {
          const isMyMessage = user && (msg.sender === user.nickname || msg.sender_nickname === user.nickname);
          // API에서 가져온건 sender_nickname, 소켓은 sender일 수 있음
          const senderName = msg.sender_nickname || msg.sender;
          const content = msg.message || msg.content; // API는 message, 소켓은 content로 매핑함

          return (
            <div key={index} className={`message-wrapper ${isMyMessage ? 'my-message' : 'other-message'}`}>
              <div className="message-bubble">
                {content}
              </div>
              <span className="message-info">
                {isMyMessage ? '' : `${senderName} · `}
                {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="메시지 입력..."
          className="chat-input"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="send-button"
        >
          ➤
        </button>
      </form>
    </div>
  );
};

export default ClanChat;