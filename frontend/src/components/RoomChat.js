import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPostForm, API_BASE_SERVER } from "../api/api";
import { useAlert } from "../context/AlertContext";
import MobileLayout from '../components/MobileLayout';
import BottomNav from '../components/BottomNav';
import GlobalHeader from '../components/GlobalHeader';
import VoteCreationModal from '../features/chat/VoteCreationModal';
import VoteListModal from '../features/chat/VoteListModal';
import VoteDetailModal from '../features/chat/VoteDetailModal';
import VoteStatusModal from '../features/chat/VoteStatusModal';
import SettlementModal from '../features/chat/SettlementModal';
import './RoomChat.css';

const RoomChat = ({ roomId, roomInfo, user }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messageListRef = useRef(null);
  const isInitialLoad = useRef(true);
  const { showAlert } = useAlert();
  const inputRef = useRef(null);

  // New State for Features
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

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiGet(`/rooms/${roomId}/chat/`);
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

  useEffect(() => {
    if (messages.length > 0 && isInitialLoad.current && messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
      isInitialLoad.current = false;
    }
  }, [messages]);

  // Logic to track my votes
  const myVotesMap = new Map();
  messages.forEach(m => {
    const c = m.message;
    // Check for VOTE_CANCEL message
    if (typeof c === 'string' && c.startsWith('[[VOTE_CANCEL]]')) {
      const sender = m.sender;
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
      const sender = m.sender;
      const myNick = user?.nickname;
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

  // Extract all votes
  const allVotes = messages
    .filter(m => typeof m.message === 'string' && m.message.startsWith('[[VOTE]]'))
    .map(m => {
      try {
        const v = JSON.parse(m.message.substring(8));
        if (v && v.id && myVotesMap.has(v.id)) {
          v.isVoted = true;
          v.myVotedOption = myVotesMap.get(v.id);
        }
        return v;
      } catch (e) { return null; }
    })
    .filter(v => v !== null)
    .reverse();

  // Check pending votes
  useEffect(() => {
    const hasNewVote = messages.some(m => {
      if (typeof m.message === 'string' && m.message.startsWith('[[VOTE]]')) {
        return m.sender !== user?.nickname; // Simple check: vote from others
        // Ideally we check if I haven't voted yet, but strict "pending" logic is complex
        // Here we just flag if there is ANY vote message from others
      }
      return false;
    });
    // setHasPendingVote(hasNewVote); // Optional: Enable if we want blinking on any vote
  }, [messages, user]);

  const handleSend = async (msgText = null) => {
    const textToSend = msgText || input.trim();
    if (!textToSend) return;

    if (!msgText && showPlusMenu) setShowPlusMenu(false); // Close menu if sending text

    const formData = new FormData();
    formData.append('sender', user.nickname);
    formData.append('room_id', roomId);
    formData.append('message', textToSend);

    try {
      await apiPostForm(`/rooms/${roomId}/chat/`, formData);
      if (!msgText) setInput("");

      await fetchMessages();
      setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTo({ top: messageListRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);

      if (!msgText) {
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 50);
      }

    } catch (err) {
      alert(err.response?.data?.detail || "메시지 전송 실패");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSend();
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
    handleSend(votePayloadContent);
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
    handleSend(msgString);
    setShowSettlementModal(false);
  };

  const handleVoteClick = () => {
    setHasPendingVote(false);
    setShowVoteList(true);
  };

  const handleOpenVoteDetail = (vote) => {
    setSelectedVote(vote);
    setShowVoteList(false);
  };

  const handleCastVote = (vote, optionIdx) => {
    const castPayload = { userId: user.nickname, voteId: vote.id, optionIdx: optionIdx };
    // Note: ClanChat used userId undefined in castPayload? No, backend needs it? 
    // ClanChat: { voteId, optionIdx }. Sender comes from socket message.
    // Here: Sender comes from formData. So consistent.
    const payload = "[[VOTE_CAST]]" + JSON.stringify(castPayload);
    handleSend(payload);
    showAlert("완료", "투표 참여가 완료되었습니다.", () => { }, false);
    setSelectedVote(null);
  };

  const handleCancelVote = (vote) => {
    const cancelPayload = { voteId: vote.id };
    const payload = "[[VOTE_CANCEL]]" + JSON.stringify(cancelPayload);
    handleSend(payload);
    showAlert("알림", "투표 참여가 취소되었습니다.", () => { }, false);
    setSelectedVote(null);
  };

  const handleVoteComment = (vote, text) => {
    const commentPayload = { voteId: vote.id, text: text };
    const msgString = "[[VOTE_COMMENT]]" + JSON.stringify(commentPayload);
    handleSend(msgString);
  }

  // Vote Status Logic
  const getVoteComments = (voteId) => {
    if (!voteId) return [];
    const comments = [];
    const seen = new Set();
    messages.forEach(m => {
      const c = m.message || m.content;
      const sender = m.sender || m.participant_nickname;
      if (typeof c === 'string' && c.startsWith('[[VOTE_COMMENT]]')) {
        try {
          const d = JSON.parse(c.substring(16));
          if (d.voteId == voteId) {
            const time = formatTime(m.timestamp || m.created_at || new Date().toISOString());
            const uniqueKey = `${sender}-${d.text}`;
            if (!seen.has(uniqueKey)) {
              seen.add(uniqueKey);
              comments.push({ sender, text: d.text, time });
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

    messages.forEach(m => {
      const c = m.message;
      const sender = m.sender;
      if (typeof c === 'string') {
        if (sender) {
          if (c.startsWith('[[VOTE_CAST]]')) {
            try {
              const d = JSON.parse(c.substring(13));
              if (d.voteId === vote.id) userChoiceMap.set(sender, d.optionIdx);
            } catch (e) { }
          } else if (c.startsWith('[[VOTE_CANCEL]]')) {
            try {
              const d = JSON.parse(c.substring(15));
              if (d.voteId === vote.id) userChoiceMap.delete(sender);
            } catch (e) { }
          }
        }
      }
    });
    userChoiceMap.forEach((optIdx, nickname) => {
      if (pMap[optIdx]) pMap[optIdx].push({ nickname });
    });

    setStatusParticipants(pMap);
    setStatusVote(vote);
    setStatusComments(getVoteComments(vote.id));
    setShowVoteStatus(true);
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

  const formatDeadline = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  // Calculate settlement participants derived from room info and messages
  const settlementParticipants = (() => {
    const participants = [];
    const seen = new Set();

    // 1. Session Participants (if available)
    if (roomInfo?.sessions) {
      roomInfo.sessions.forEach(session => {
        if (session.participant_nickname) {
          if (!seen.has(session.participant_nickname)) {
            seen.add(session.participant_nickname);
            participants.push({
              id: session.participant_nickname,
              username: session.participant_nickname,
              nickname: session.participant_nickname,
              profile_image: session.participant_profile_image || null
            });
          }
        }
      });
    }

    // 2. Active Chatters Fallback
    // Always run this, regardless of roomInfo state
    messages.forEach(m => {
      if (m.sender && !seen.has(m.sender)) {
        seen.add(m.sender);
        participants.push({
          id: m.sender,
          username: m.sender,
          nickname: m.sender,
          profile_image: null
        });
      }
    });

    // 3. User (Self) Fallback
    // Ensure I am always in the list if I'm authenticated
    if (user?.nickname && !seen.has(user.nickname)) {
      seen.add(user.nickname);
      participants.push({
        id: user.nickname,
        username: user.nickname,
        nickname: user.nickname,
        profile_image: user.profile_image || null
      });
    }

    return participants;
  })();

  return (
    <MobileLayout className="chat-layout">
      <GlobalHeader user={user} />
      <div className="room-chat-page">
        {/* Header */}
        <div className="rc-header">
          <button className="rc-back-btn" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="rc-header-title-box">
            <img src="https://placehold.co/44x44" alt="Room" className="rc-room-img" />
            <div className="rc-room-title">
              {roomInfo?.title
                ? `${roomInfo.title} [${roomInfo.song || '?'} - ${roomInfo.artist || '?'}]`
                : '합주방 채팅'
              }
            </div>
          </div>
          <button className={`rc-vote-btn ${hasPendingVote ? 'blinking' : ''}`} onClick={handleVoteClick}>투표하기</button>
        </div>

        {/* Messages */}
        <div className="rc-message-list" ref={messageListRef}>
          {messages.map((msg, index) => {
            const content = msg.message;
            if (typeof content === 'string' && (content.startsWith('[[VOTE_CAST]]') || content.startsWith('[[VOTE_CANCEL]]') || content.startsWith('[[VOTE_COMMENT]]'))) return null;

            const isMine = msg.sender === user.nickname;
            const showProfile = !isMine && (!messages[index - 1] || messages[index - 1].sender !== msg.sender || shouldShowDateSeparator(msg, messages[index - 1]));
            const showDate = shouldShowDateSeparator(msg, messages[index - 1]);

            // Vote Parsing
            const isVote = typeof content === 'string' && content.startsWith('[[VOTE]]');
            let voteData = null;
            if (isVote) {
              try {
                voteData = JSON.parse(content.substring(8));
                if (voteData && voteData.id && myVotesMap.has(voteData.id)) {
                  voteData.isVoted = true;
                  voteData.myVotedOption = myVotesMap.get(voteData.id);
                }
              } catch (e) { }
            }

            return (
              <React.Fragment key={msg.id || index}>
                {showDate && (
                  <div className="rc-date-separator">
                    <div className="rc-date-line"></div>
                    <div className="rc-date-text">{formatDateSeparator(msg.timestamp || msg.created_at)}</div>
                  </div>
                )}

                <div className={`rc-msg-item ${isMine ? 'mine' : ''}`}>
                  {!isMine && (
                    showProfile ? (
                      <img src="https://placehold.co/40x40" alt={msg.sender} className="rc-profile-img" />
                    ) : (
                      <div style={{ width: '40px', flexShrink: 0 }}></div>
                    )
                  )}

                  <div className="rc-msg-content-wrapper">
                    {!isMine && showProfile && <div className="rc-sender-name">{msg.sender}</div>}

                    <div className="rc-bubble-row">
                      {/* Message Content */}
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
                              <div className="rc-sett-header">[ @{msg.sender} 님의 정산 요청 ]</div>
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
                        <div className="rc-bubble">
                          {msg.message}
                          {msg.image_url && <img src={msg.image_url} alt="attachment" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '4px' }} />}
                        </div>
                      )}

                      {/* Info (Time, Unread) */}
                      <div className="rc-msg-info">
                        {!isMine && (msg.unread_count > 0) && <div className="rc-unread-count">{msg.unread_count}</div>}
                        {isMine && (msg.unread_count > 0) && <div className="rc-unread-count">{msg.unread_count}</div>}
                        <div className="rc-time">{formatTime(msg.timestamp || msg.created_at)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Input ... (omitted, will be preserved by replace_file_content if I target correctly) */}
        {/* WARNING: I am replacing a huge chunk. I need to be careful. */}
        {/* Actually, the tool asks for StartLine/EndLine. I should just target the return block and the logic above it. */}
        {/* I'll use a smaller chunk replacement for safety. */}



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
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
            }}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(); // Send logic handles input.trim()
              }
            }}
            style={{
              resize: 'none',
              height: 'auto',
              minHeight: '40px',
              maxHeight: '100px',
              overflowY: 'auto',
              padding: '10px 0',
              lineHeight: '20px'
            }}
          />
          <button type="button" className="rc-send-btn" onClick={() => handleSend()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </div>
      <BottomNav />

      {/* Modals */}
      {showVoteModal && (
        <VoteCreationModal onClose={() => setShowVoteModal(false)} onSubmit={handleVoteSubmit} />
      )}
      {showVoteList && (
        <VoteListModal votes={allVotes} onClose={() => setShowVoteList(false)} onSelectVote={handleOpenVoteDetail} userNickname={user?.nickname} />
      )}
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
      {showVoteStatus && statusVote && (
        <VoteStatusModal
          vote={statusVote}
          participantsMap={statusParticipants}
          comments={statusComments}
          onClose={() => setShowVoteStatus(false)}
          userNickname={user?.nickname}
          onSubmitComment={handleVoteComment}
        />
      )}
      {showSettlementModal && (
        <SettlementModal
          key={settlementParticipants.map(p => p.nickname).join(',')} // Force re-render on change
          clanMembers={settlementParticipants}
          onClose={() => setShowSettlementModal(false)}
          onSubmit={handleSettlementSubmit}
        />
      )}
    </MobileLayout>
  );
};

export default RoomChat;