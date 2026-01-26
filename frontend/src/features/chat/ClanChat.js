import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, API_BASE_SERVER } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import MobileLayout from '../../components/MobileLayout';
import BottomNav from '../../components/BottomNav';
import GlobalHeader from '../../components/GlobalHeader';
import VoteCreationModal from './VoteCreationModal';
import VoteListModal from './VoteListModal';
import VoteDetailModal from './VoteDetailModal';
import VoteStatusModal from './VoteStatusModal';
import SettlementModal from './SettlementModal';
import '../../components/RoomChat.css';

const ClanChat = ({ user }) => {
  const navigate = useNavigate();
  const { clanId: paramClanId, id: paramId } = useParams();
  const clanId = paramClanId || paramId;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [clanInfo, setClanInfo] = useState(null);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [hasPendingVote, setHasPendingVote] = useState(false);
  const [showVoteList, setShowVoteList] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [showVoteStatus, setShowVoteStatus] = useState(false);
  const [statusVote, setStatusVote] = useState(null);
  const [statusParticipants, setStatusParticipants] = useState({});
  const [statusComments, setStatusComments] = useState([]);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Scroll Helper
  // const messagesEndRef = useRef(null); // Removed to match RoomChat
  const messageListRef = useRef(null);

  const { showAlert } = useAlert();
  const socketRef = useRef(null);
  const inputRef = useRef(null);

  const fetchClanInfo = async () => {
    try {
      const data = await apiGet(`/clans/${clanId}/`);
      setClanInfo(data);
    } catch (err) {
      console.error("클랜 정보 로딩 실패", err);
    }
  };

  const fetchMessages = React.useCallback(async () => {
    try {
      const data = await apiGet(`/clans/${clanId}/chat/`);
      if (Array.isArray(data)) {
        setMessages([...data].reverse());
      } else if (data.results) {
        setMessages([...data.results].reverse());
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("채팅 기록 로딩 실패", err);
    }
  }, [clanId]);

  // Initial Fetch
  useEffect(() => {
    if (clanId) {
      fetchMessages();
      fetchClanInfo();
    }
  }, [clanId, fetchMessages]);

  // WebSocket Connection
  useEffect(() => {
    if (!clanId) return;

    let wsBaseUrl = API_BASE_SERVER.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    if (wsBaseUrl.endsWith('/')) {
      wsBaseUrl = wsBaseUrl.slice(0, -1);
    }
    const wsUrl = `${wsBaseUrl}/ws/clans/${clanId}/chat/`;

    console.log("Connecting to WebSocket:", wsUrl);

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ 클랜 채팅 서버에 연결되었습니다.');
      if (user?.nickname && messages.length > 0) {
        // Re-send read if socket reconnects while messages exist
        socket.send(JSON.stringify({ type: 'read', sender: user.nickname }));
      }
    };

    socket.onmessage = (e) => {
      const data = JSON.parse(e.data);

      if (data.type === 'read_update') {
        const readIds = data.read_ids; // Backend now sends list of IDs
        if (readIds && Array.isArray(readIds)) {
          setMessages(prev => prev.map(msg => {
            if (readIds.includes(msg.id) && (msg.unread_count || 0) > 0) {
              return { ...msg, unread_count: msg.unread_count - 1 };
            }
            return msg;
          }));
        }
        return;
      }

      if (data.message && typeof data.message === 'string' && data.message.startsWith('[[VOTE]]')) {
        if (!user || data.sender !== user.nickname) {
          setHasPendingVote(true);
        }
      }

      // Add new message
      setMessages((prev) => [...prev, {
        sender: data.sender,
        content: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        sender_nickname: data.sender,
        unread_count: data.unread_count
      }]);
    };

    socket.onclose = () => {
      console.log('❌ 채팅 서버 연결이 종료되었습니다.');
    };

    socket.onerror = (err) => {
      // Quietly handle errors or suppress
      // console.warn('채팅 소켓 에러:', err);
    };

    return () => {
      socket.close();
    };
  }, [clanId]);

  // Auto-scroll helper
  const scrollToBottom = () => {
    setTimeout(() => {
      if (messageListRef.current) {
        messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  };

  // Trigger scroll on messages update
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send Read Event when messages change (Initial Load or New Message)
  useEffect(() => {
    if (messages.length > 0 && socketRef.current && socketRef.current.readyState === WebSocket.OPEN && user?.nickname) {
      // Send read event to mark all currently visible messages as read
      socketRef.current.send(JSON.stringify({ type: 'read', sender: user.nickname }));
    }
  }, [messages.length, user]);

  // Logic to track my votes
  const myVotesMap = new Map();
  messages.forEach(m => {
    const c = m.message || m.content;

    // Check for VOTE_CANCEL message
    if (typeof c === 'string' && c.startsWith('[[VOTE_CANCEL]]')) {
      const sender = m.sender_nickname || m.sender;
      const myNick = user?.nickname;

      if (sender && myNick && String(sender).trim().toLowerCase() === String(myNick).trim().toLowerCase()) {
        try {
          const data = JSON.parse(c.substring(15));
          if (data.voteId) myVotesMap.delete(data.voteId);
        } catch (e) { }
      }
    }

    // Check for VOTE_CAST message
    if (typeof c === 'string' && c.startsWith('[[VOTE_CAST]]')) {
      const sender = m.sender_nickname || m.sender;
      const myNick = user?.nickname;

      // Case-insensitive comparison
      if (sender && myNick && String(sender).trim().toLowerCase() === String(myNick).trim().toLowerCase()) {
        try {
          const data = JSON.parse(c.substring(13));
          if (data.voteId !== undefined) {
            myVotesMap.set(data.voteId, data.optionIdx);
          }
        } catch (e) { }
      }
    }
  });

  // Extract all votes from messages for the list
  const allVotes = messages
    .filter(m => {
      const c = m.message || m.content;
      return typeof c === 'string' && c.startsWith('[[VOTE]]');
    })
    .map(m => {
      try {
        const v = JSON.parse((m.message || m.content).substring(8));
        if (v && v.id && myVotesMap.has(v.id)) {
          v.isVoted = true;
          v.myVotedOption = myVotesMap.get(v.id);
        }
        return v;
      } catch (e) { return null; }
    })
    .filter(v => v !== null)
    .reverse();

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (showPlusMenu) setShowPlusMenu(false);

    if (!newMessage.trim() || isSending) return;
    if (!user) {
      showAlert('로그인이 필요합니다.', 'error');
      return;
    }

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      setIsSending(true);
      const messageData = {
        message: newMessage,
        sender: user.nickname
      };

      socketRef.current.send(JSON.stringify(messageData));
      setNewMessage('');

      setTimeout(() => {
        setIsSending(false);
      }, 500);

      // Keep focus
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    } else {
      showAlert('채팅 서버와 연결되어 있지 않습니다.', 'error');
    }
  };

  const togglePlusMenu = () => {
    setShowPlusMenu(!showPlusMenu);
  };

  const handleFileUpload = () => {
    setShowPlusMenu(false);
    showAlert("알림", "파일 업로드 기능은 준비 중입니다.", () => { }, false);
  };

  const handleVoteCreate = () => {
    setShowPlusMenu(false);
    setShowVoteModal(true);
  };

  const handleVoteSubmit = (voteData) => {
    const payloadData = {
      ...voteData,
      id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9)
    };
    const votePayloadContent = "[[VOTE]]" + JSON.stringify(payloadData);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        message: votePayloadContent,
        sender: user.nickname
      };
      socketRef.current.send(JSON.stringify(payload));
    }
    setShowVoteModal(false);
  };

  const handleSettlement = () => {
    setShowPlusMenu(false);
    setShowSettlementModal(true);
  };

  const handleSettlementSubmit = (data) => {
    const settlementPayload = {
      bank: data.bank,
      account: data.account,
      total: data.total,
      participants: data.participants
    };

    const msgString = "[[SETTLEMENT]]" + JSON.stringify(settlementPayload);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        message: msgString,
        sender: user.nickname
      };
      socketRef.current.send(JSON.stringify(payload));
    }

    setShowSettlementModal(false);
  };

  const getClanMembers = () => {
    if (clanInfo && Array.isArray(clanInfo.members)) return clanInfo.members;

    const senders = new Set();
    if (user) senders.add(user.nickname);
    messages.forEach(m => {
      const s = m.sender_nickname || m.sender;
      if (s) senders.add(s);
    });
    return Array.from(senders).map(nick => ({ nickname: nick }));
  };

  const handleVoteClick = () => {
    setHasPendingVote(false);
    setShowVoteList(true);
  };

  const handleOpenVoteDetail = (vote) => {
    setSelectedVote(vote);
    setShowVoteList(false); // Close list if open
  };

  const handleCastVote = (vote, optionIdx) => {
    const castPayload = {
      voteId: vote.id,
      optionIdx: optionIdx
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        message: "[[VOTE_CAST]]" + JSON.stringify(castPayload),
        sender: user.nickname
      };
      socketRef.current.send(JSON.stringify(payload));
    }

    showAlert("완료", "투표 참여가 완료되었습니다.", () => { }, false);
    setSelectedVote(null);
  };

  const getVoteComments = (voteId) => {
    if (!voteId) return [];
    const comments = [];
    const seen = new Set();
    messages.forEach(m => {
      const c = m.message || m.content;
      const sender = m.sender_nickname || m.sender;
      if (typeof c === 'string' && c.startsWith('[[VOTE_COMMENT]]')) {
        try {
          const d = JSON.parse(c.substring(16));
          if (d.voteId == voteId) {
            const time = formatTime(m.timestamp || m.created_at || new Date().toISOString());
            const uniqueKey = `${sender}-${d.text}`;

            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              comments.push({
                sender: sender,
                text: d.text,
                time: time
              });
            }
          }
        } catch (e) { }
      }
    });
    return comments;
  };

  const handleOpenVoteStatus = (vote) => {
    const pMap = {};
    if (vote.options) {
      vote.options.forEach((_, idx) => pMap[idx] = []);
    }

    const userChoiceMap = new Map();

    const voteComments = [];

    messages.forEach(m => {
      const c = m.message || m.content;
      const sender = m.sender_nickname || m.sender;

      if (typeof c === 'string') {
        // Extract Participants
        if (sender) {
          if (c.startsWith('[[VOTE_CAST]]')) {
            try {
              const d = JSON.parse(c.substring(13));
              if (d.voteId === vote.id) {
                userChoiceMap.set(sender, d.optionIdx);
              }
            } catch (e) { }
          } else if (c.startsWith('[[VOTE_CANCEL]]')) {
            try {
              const d = JSON.parse(c.substring(15));
              if (d.voteId === vote.id) {
                userChoiceMap.delete(sender);
              }
            } catch (e) { }
          }
        }

        // Extract Comments
        if (c.startsWith('[[VOTE_COMMENT]]')) {
          try {
            const d = JSON.parse(c.substring(16));
            if (d.voteId === vote.id) {
              voteComments.push({
                sender: sender,
                text: d.text,
                time: formatTime(m.timestamp || m.created_at)
              });
            }
          } catch (e) { }
        }
      }
    });

    userChoiceMap.forEach((optIdx, nickname) => {
      const choices = Array.isArray(optIdx) ? optIdx : [optIdx];
      choices.forEach(idx => {
        if (pMap[idx]) pMap[idx].push({ nickname });
      });
    });

    setStatusParticipants(pMap);
    setStatusVote(vote);
    setStatusComments(voteComments);
    setShowVoteStatus(true);
    setSelectedVote(null);
  };

  const handleVoteComment = (vote, text) => {
    const commentPayload = { voteId: vote.id, text: text };
    const msgString = "[[VOTE_COMMENT]]" + JSON.stringify(commentPayload);

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        message: msgString,
        sender: user.nickname
      };
      socketRef.current.send(JSON.stringify(payload));
    }

    setMessages(prev => [...prev, {
      sender: user.nickname,
      sender_nickname: user.nickname,
      message: msgString,
      timestamp: new Date().toISOString()
    }]);
  };

  const handleCancelVote = (vote) => {
    const cancelPayload = { voteId: vote.id };
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      const payload = {
        message: "[[VOTE_CANCEL]]" + JSON.stringify(cancelPayload),
        sender: user.nickname
      };
      socketRef.current.send(JSON.stringify(payload));
    }
    showAlert("알림", "투표 참여가 취소되었습니다.", () => { }, false);
    setSelectedVote(null);
  };

  const formatDateSeparator = (dateString) => {
    const date = new Date(dateString);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')} (${days[date.getDay()]})`;
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return `${date.getHours().toString().padStart(2, '0')} : ${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const shouldShowDateSeparator = (currentMsg, prevMsg) => {
    if (!prevMsg) return true;
    const currentDate = new Date(currentMsg.timestamp || currentMsg.created_at).toDateString();
    const prevDate = new Date(prevMsg.timestamp || prevMsg.created_at).toDateString();
    return currentDate !== prevDate;
  };

  return (
    <MobileLayout className="chat-layout">
      <GlobalHeader user={user} />
      <div className="room-chat-page" style={{ marginTop: '10px' }}>
        {/* Header */}
        <div className="rc-header">
          <button className="rc-back-btn" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="rc-header-title-box">
            <img
              src={clanInfo?.clan_img || clanInfo?.image || "https://placehold.co/44x44"}
              alt="Clan"
              className="rc-room-img"
            />
            <div className="rc-room-title">
              {clanInfo ? clanInfo.name : "클랜 채팅"}
            </div>
          </div>
          <button className={`rc-vote-btn ${hasPendingVote ? 'blinking' : ''}`} onClick={handleVoteClick}>투표하기</button>
        </div>

        {/* Messages */}
        <div className="rc-message-list" ref={messageListRef}>
          {messages.map((msg, index) => {
            const content = msg.message || msg.content;
            if (typeof content === 'string' && (content.startsWith('[[VOTE_CAST]]') || content.startsWith('[[VOTE_CANCEL]]') || content.startsWith('[[VOTE_COMMENT]]'))) return null;

            const senderName = msg.sender_nickname || msg.sender;
            const isMine = user && (senderName === user.nickname);

            const isVote = typeof content === 'string' && content.startsWith('[[VOTE]]');
            let voteData = null;
            if (isVote) {
              try {
                voteData = JSON.parse(content.substring(8));
                // Attach status from map
                if (voteData && voteData.id && myVotesMap.has(voteData.id)) {
                  voteData.isVoted = true;
                  voteData.myVotedOption = myVotesMap.get(voteData.id);
                }
              } catch (e) { }
            }

            const showProfile = !isMine && (!messages[index - 1] || (messages[index - 1].sender_nickname || messages[index - 1].sender) !== senderName || shouldShowDateSeparator(msg, messages[index - 1]));
            const showDate = shouldShowDateSeparator(msg, messages[index - 1]);

            const formatDeadline = (iso) => {
              if (!iso) return '';
              const d = new Date(iso);
              return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
            };

            return (
              <React.Fragment key={index}>
                {showDate && (
                  <div className="rc-date-separator">
                    <div className="rc-date-line"></div>
                    <div className="rc-date-text">{formatDateSeparator(msg.timestamp)}</div>
                  </div>
                )}

                <div className={`rc-msg-item ${isMine ? 'mine' : ''}`}>
                  {!isMine && (
                    showProfile ? (
                      <img src="https://placehold.co/40x40" alt={senderName} className="rc-profile-img" />
                    ) : (
                      <div style={{ width: '40px', flexShrink: 0 }}></div>
                    )
                  )}

                  <div className="rc-msg-content-wrapper">
                    {!isMine && showProfile && <div className="rc-sender-name">{senderName}</div>}

                    {isVote && voteData ? (
                      <div className="rc-vote-bubble">
                        <div className="rc-vote-bubble-header">
                          <span className="rc-vote-icon">🗳️</span>
                          <div className="rc-vote-bubble-title">{voteData.title}</div>
                        </div>
                        <div className="rc-vote-bubble-info">
                          <span>항목: {voteData.options?.length}개 {voteData.isAnonymous ? '(익명)' : ''}</span>
                          <span>종료: {formatDeadline(voteData.deadline)}</span>
                        </div>
                        <button className="rc-vote-bubble-btn" onClick={() => handleOpenVoteDetail(voteData)}>
                          투표하기
                        </button>
                      </div>
                    ) : typeof content === 'string' && content.startsWith('[[SETTLEMENT]]') ? (
                      (() => {
                        let sData = {};
                        try { sData = JSON.parse(content.substring(14)); } catch (e) { }

                        const parts = sData.participants || [];
                        const excluded = sData.excluded || [];
                        const amounts = parts.map(p => p.amount);
                        const total = sData.total;

                        const isEqual = amounts.length > 0 && amounts.every(a => a === amounts[0]);
                        const perPerson = amounts.length > 0 ? amounts[0] : 0;

                        const handleCopy = (text) => {
                          navigator.clipboard.writeText(text).then(() => {
                            showAlert('알림', '계좌번호가 복사되었습니다.', () => { }, false);
                          });
                        };

                        return (
                          <div className="rc-settlement-bubble">
                            <div className="rc-sett-header">[ @{senderName} 님의 정산 요청 ]</div>
                            <div className="rc-sett-content">
                              <div className="rc-sett-row">총 금액: {Number(total).toLocaleString()}원</div>
                              <div className="rc-sett-row">
                                {isEqual
                                  ? `1인당 금액: ${Number(perPerson).toLocaleString()}원 (${parts.length}명)`
                                  : `개별 정산 (${parts.length}명)`
                                }
                              </div>
                              {excluded.length > 0 && (
                                <div className="rc-sett-row" style={{ color: '#64748B', fontSize: '12px' }}>
                                  제외 멤버: {excluded.map(n => '@' + n).join(', ')}
                                </div>
                              )}
                              <div style={{ borderBottom: '1px dashed #E2E8F0', margin: '4px 0' }}></div>
                              <div className="rc-sett-row" style={{ color: '#0EA5E9' }}>
                                은행 : {sData.bank}
                              </div>
                              <div className="rc-sett-account-row" style={{ color: '#0EA5E9' }}>
                                계좌번호 : <span style={{ textDecoration: 'underline' }}>{sData.account}</span>
                                <button className="rc-sett-copy-btn" onClick={() => handleCopy(sData.account)}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="rc-bubble-row">
                        <div className="rc-bubble">
                          {content}
                        </div>
                        <div className="rc-msg-info">
                          {(msg.unread_count > 0) && <div className="rc-unread-count">{msg.unread_count}</div>}
                          <div className="rc-time">{formatTime(msg.timestamp)}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Input */}
        <div className="rc-input-area">
          {showPlusMenu && (
            <div className="rc-plus-menu">
              <button type="button" className="rc-plus-menu-item" onClick={handleFileUpload}>
                <div className="rc-plus-icon-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </div>
                <span>파일 업로드</span>
              </button>
              <button type="button" className="rc-plus-menu-item" onClick={handleVoteCreate}>
                <div className="rc-plus-icon-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <span>투표 올리기</span>
              </button>
              <button type="button" className="rc-plus-menu-item" onClick={handleSettlement}>
                <div className="rc-plus-icon-box">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
                <span>정산하기</span>
              </button>
            </div>
          )}

          <button type="button" className="rc-input-plus-btn" onClick={togglePlusMenu}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          <textarea
            ref={inputRef}
            className="rc-input-field"
            placeholder="메시지 입력"
            style={{
              resize: 'none',
              height: 'auto',
              minHeight: '40px',
              maxHeight: '100px',
              overflowY: 'auto',
              padding: '10px 0',
              lineHeight: '20px'
            }}
            value={newMessage}
            rows={1}
            onChange={(e) => {
              setNewMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return; // Prevent action during IME composition
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button type="button" className="rc-send-btn" onClick={handleSendMessage}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
      <BottomNav />
      {/* Create Vote Modal */}
      {showVoteModal && (
        <VoteCreationModal
          onClose={() => setShowVoteModal(false)}
          onSubmit={handleVoteSubmit}
        />
      )}

      {/* Vote List Modal */}
      {showVoteList && (
        <VoteListModal
          votes={allVotes}
          onClose={() => setShowVoteList(false)}
          onSelectVote={handleOpenVoteDetail}
          userNickname={user?.nickname}
        />
      )}

      {/* Vote Detail Modal */}
      {selectedVote && (
        <VoteDetailModal
          vote={selectedVote}
          comments={getVoteComments(selectedVote.id)}
          onClose={() => setSelectedVote(null)}
          onSubmitVote={handleCastVote}
          onCancelVote={handleCancelVote}
          onOpenStatus={handleOpenVoteStatus}
          onSubmitComment={handleVoteComment}
          userNickname={user?.nickname}
        />
      )}

      {/* Vote Status Modal */}
      {showVoteStatus && statusVote && (
        <VoteStatusModal
          vote={statusVote}
          participantsMap={statusParticipants}
          comments={getVoteComments(statusVote.id)}
          onClose={() => setShowVoteStatus(false)}
          userNickname={user?.nickname}
          onSubmitComment={handleVoteComment}
        />
      )}

      {/* Settlement Modal */}
      {showSettlementModal && (
        <SettlementModal
          clanMembers={getClanMembers()}
          onClose={() => setShowSettlementModal(false)}
          onSubmit={handleSettlementSubmit}
        />
      )}
    </MobileLayout>
  );
};

export default ClanChat;