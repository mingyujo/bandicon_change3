import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { apiGet } from '../../api/api'; // apiPost는 이제 안 씁니다 (소켓으로 전송)
import { useAlert } from '../../context/AlertContext';

const ClanChat = ({ user }) => {
  const { id } = useParams(); 
  const clanId = id; 

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
    // ws://127.0.0.1:8000/ws/clans/<id>/chat/
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//127.0.0.1:8000/ws/clans/${clanId}/chat/`;
    
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
        content: data.message,
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
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-sm">
        <div className="p-4 border-b bg-indigo-50 rounded-t-lg flex justify-between items-center">
            <h3 className="font-bold text-indigo-900">🛡️ 클랜 채팅</h3>
            <span className="text-xs text-green-600 font-medium px-2 py-1 bg-green-100 rounded-full">● 실시간 연결됨</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 h-96">
            {messages.map((msg, index) => {
                const isMyMessage = user && msg.sender === user.nickname;
                return (
                    <div key={index} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm shadow-sm ${
                            isMyMessage 
                            ? 'bg-indigo-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                        }`}>
                            {msg.content}
                        </div>
                        <span className="text-xs text-gray-400 mt-1 px-1">
                            {isMyMessage ? '' : `${msg.sender} · `}
                            {msg.timestamp && new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 bg-white border-t flex gap-2 rounded-b-lg">
            <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="메시지 입력..."
                className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button 
                type="submit" 
                disabled={!newMessage.trim()}
                className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-indigo-700 disabled:bg-gray-300"
            >
                ➤
            </button>
        </form>
    </div>
  );
};

export default ClanChat;