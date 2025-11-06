// [전체 코드] src/features/rooms/RoomDetail.js
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { apiGet, apiPost, apiPostForm, apiPut, apiDelete } from "../../api/api";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAlert } from '../../context/AlertContext';
import Linkify from '../../components/Linkify';

const toLocalISOString = (date) => {
    const pad = (num) => (num < 10 ? '0' + num : num);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:00:00`;
};

const RoomScheduler = ({ user, room }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availability, setAvailability] = useState([]);
    const [mySelection, setMySelection] = useState(new Set());
    const [participants, setParticipants] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const pSet = new Set(room.sessions.map(s => s.participant_nickname).filter(Boolean));
        pSet.add(room.manager_nickname);
        setParticipants(Array.from(pSet));
    }, [room]);
    
    const fetchAvailability = useCallback(async () => {
        try {
            const data = await apiGet(`/rooms/${room.id}/availability`);
            setAvailability(data || []);
            const initialSelection = new Set();
            (data || []).forEach(slot => {
                if (slot.voters.some(v => v.nickname === user.nickname)) {
                    initialSelection.add(toLocalISOString(new Date(slot.time)));
                }
            });
            setMySelection(initialSelection);
        } catch (err) {
            console.error("스케줄 로딩 실패", err);
        }
    }, [room.id, user.nickname]);

    useEffect(() => {
        fetchAvailability();
    }, [fetchAvailability]);

    const handleSlotClick = (localISOString) => {
        const newSelection = new Set(mySelection);
        if (newSelection.has(localISOString)) {
            newSelection.delete(localISOString);
        } else {
            newSelection.add(localISOString);
        }
        setMySelection(newSelection);
    };
    
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiPost(
                `/rooms/${room.id}/availability?nickname=${encodeURIComponent(user.nickname)}`, 
                { slots: Array.from(mySelection) }
            );
            alert("가능 시간을 저장했습니다!");
            await fetchAvailability();
        } catch (err) {
            alert("저장 실패: " + (err.response?.data?.detail || "알 수 없는 오류"));
        } finally {
            setIsSaving(false);
        }
    };

    const generateTimeSlots = (selectedDate) => {
        const slots = [];
        const startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        for (let i = 9; i <= 22; i++) {
            const timeSlot = new Date(startDate);
            timeSlot.setHours(i);
            slots.push(timeSlot);
        }
        return slots;
    };

    const getSlotData = (slot) => {
        return availability.find(s => {
            const slotTime = new Date(s.time);
            return slotTime.getTime() === slot.getTime();
        });
    };

    const timeSlots = useMemo(() => generateTimeSlots(selectedDate), [selectedDate]);
    
    const allMembers = participants;
    const perfectSlots = availability.filter(slot => slot.voters.length === allMembers.length);
    const pendingMembers = allMembers.filter(member => {
        return !availability.some(slot => slot.voters.some(voter => voter.nickname === member));
    });

    return (
        <div>
            <h3>합주 일정 조율</h3>
            <div style={{display: 'flex', gap: '20px', marginTop: '20px', flexDirection: window.innerWidth < 768 ? 'column' : 'row'}}>
                <div style={{minWidth: '300px'}}>
                    <Calendar
                        onChange={setSelectedDate}
                        value={selectedDate}
                        locale="ko-KR"
                        formatDay={(locale, date) => date.getDate()}
                        showNeighboringMonth={false}
                    />
                </div>
                
                <div style={{flex: 1}}>
                    <h4>{selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</h4>
                    
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px', marginBottom: '15px'}}>
                        {timeSlots.map(slot => {
                            const localISO = toLocalISOString(slot);
                            const slotData = getSlotData(slot);
                            const isSelected = mySelection.has(localISO);
                            const voterCount = slotData?.voters.length || 0;
                            
                            return (
                                <button
                                    key={localISO}
                                    onClick={() => handleSlotClick(localISO)}
                                    style={{
                                        padding: '8px 4px',
                                        backgroundColor: isSelected ? '#007bff' : (voterCount > 0 ? '#e8f5e8' : '#f8f9fa'),
                                        color: isSelected ? 'white' : (voterCount > 0 ? '#2d5a2d' : '#6c757d'),
                                        border: `1px solid ${isSelected ? '#007bff' : (voterCount > 0 ? '#c3e6c3' : '#dee2e6')}`,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '12px',
                                        textAlign: 'center'
                                    }}
                                >
                                    {slot.getHours()}:00<br/>
                                    {voterCount > 0 && `(${voterCount}명)`}
                                </button>
                            );
                        })}
                    </div>
                    
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving}
                        style={{padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: isSaving ? 'not-allowed' : 'pointer'}}
                    >
                        {isSaving ? '저장 중...' : '내 가능 시간 저장'}
                    </button>
                </div>
            </div>
             
            <div style={{marginTop: 15, padding: 10, borderRadius: 5, background: '#f0f8ff', display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '250px'}}>
                    <h4>✅ 모두가 가능한 시간</h4>
                    {perfectSlots.length > 0 ? (
                        <ul style={{paddingLeft: 20, margin: 0}}>
                            {perfectSlots.map(slot => (
                                <li key={slot.time} style={{marginBottom: 5}}>
                                    {new Date(slot.time).toLocaleString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long', hour: 'numeric', minute: 'numeric' })}
                                </li>
                            ))}
                        </ul>
                    ) : <p style={{fontSize: '0.9em', color: '#666'}}>아직 모든 멤버가 가능한 시간이 없습니다.</p>}
                </div>
                <div style={{flex: 1, minWidth: '250px'}}>
                    <h4>👀 미참여 멤버</h4>
                    {pendingMembers.length > 0 ? (
                        <p style={{fontSize: '0.9em', color: '#666'}}>{pendingMembers.join(', ')}</p>
                    ) : <p style={{fontSize: '0.9em', color: 'green'}}>모든 멤버가 참여했습니다!</p>}
                </div>
            </div>
        </div>
    );
};

const RoomDetail = ({ user }) => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error] = useState(null);
  const { showAlert } = useAlert();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ 
    title: '', 
    song: '', 
    artist: '', 
    description: '',
    sessions: []  // 세션 목록 추가
  });
  const [customSessionInput, setCustomSessionInput] = useState('');  // 커스텀 세션 입력용

  // 🔥 핵심 수정: fetchRoom 함수 최적화
  const fetchRoom = useCallback(async () => {
      try {
        const data = await apiGet(`/rooms/${roomId}`);
        setRoom(data);
        setLoading(false); // ← 이거 추가!
      } catch (err) {
        console.error("방 정보 로딩 실패:", err);
        setLoading(false);
        alert("방 정보를 불러올 수 없습니다.");
        navigate('/rooms');
      }
  }, [roomId, navigate]);

  // 🔥 핵심 수정: useEffect 최적화
  useEffect(() => {
      let mounted = true;
      if (mounted) {
        fetchRoom();
      }
      return () => { mounted = false; };
  }, [roomId]); // fetchRoom 대신 roomId 의존성으로 변경

  useEffect(() => {
      if (!isEditing && room && !loading) {  // loading 조건 추가
        const interval = setInterval(fetchRoom, 10000);
        return () => clearInterval(interval);
      }
  }, [isEditing, room, loading, fetchRoom]);

  useEffect(() => {
      if (room) {
          setEditData({
              title: room.title,
              song: room.song,
              artist: room.artist,
              description: room.description || '',
              sessions: room.sessions.map(s => s.session_name)
          });
      }
  }, [room]);

  const handleConfirmRoom = async () => {
    if (!window.confirm("모든 멤버가 모였습니다. 방을 확정하시겠습니까?")) return;
    try {
      await apiPost(`/rooms/${room.id}/confirm`, null, {params: {manager_nickname: user.nickname}});
      alert("방이 확정되었습니다. 이제 합주를 시작할 수 있습니다.");
      fetchRoom();
    } catch (err) {
      alert(err.response?.data?.detail || "방 확정 실패");
    }
  };

  const handleEndRoom = async () => {
    if (!window.confirm("합주를 종료하고 평가를 시작하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    try {
      const res = await apiPost(`/rooms/${room.id}/end`, null, {params: {manager_nickname: user.nickname}});
      if (res.success) {
        alert("합주 종료! 각자 합주 평가를 진행하게 됩니다.");
        navigate("/");
      }
    } catch (err) {
      alert(err.response?.data?.detail || "합주 종료 중 오류가 발생했습니다.");
    }
  };

  const handleLeaveSession = async (sessionName) => {
    if (!window.confirm(`'${sessionName}' 세션 참여를 취소하시겠습니까?`)) return;
    try {
        const formData = new FormData();
        formData.append('room_id', String(room.id));
        formData.append('session_name', sessionName);
        formData.append('nickname', user.nickname);
        const res = await apiPostForm("/rooms/leave", formData);
        alert(res.message);
        fetchRoom();
    } catch (err) {
        alert(err.response?.data?.detail || "참여 취소 실패");
    }
  };

  const handleKickMember = async (nicknameToKick) => {
      showAlert(
          "멤버 강퇴 확인",
          `정말로 '${nicknameToKick}'님을 강퇴하시겠습니까?\n이 멤버의 모든 예약도 함께 취소됩니다.`,
          async () => {
              try {
                  const encodedNickname = encodeURIComponent(nicknameToKick);
                  const encodedManager = encodeURIComponent(user.nickname);
                  
                  const res = await apiDelete(
                      `/rooms/${roomId}/members/${encodedNickname}?manager_nickname=${encodedManager}`
                  );
                  
                  // message가 있으면 표시, 없으면 기본 메시지
                  alert(res?.message || "강퇴 처리되었습니다.");
                  fetchRoom();
              } catch (err) {
                  console.error("강퇴 에러:", err);
                  alert(err.response?.data?.detail || "강퇴 처리 중 오류가 발생했습니다.");
              }
          }
      );
  };

  const handleEditChange = (e) => {
     const { name, value } = e.target;
     setEditData(prev => ({ ...prev, [name]: value }));
  };

const handleUpdateRoom = async () => {
  try {
      // 참여자가 있는 세션은 유지되도록 백엔드에서 처리
      await apiPut(`/rooms/${roomId}`, { 
        ...editData, 
        nickname: user.nickname,
        sessions: editData.sessions  // 세션 목록 포함
      });
      alert("방 정보가 수정되었습니다.");
      setIsEditing(false);
      setCustomSessionInput('');  // 입력 필드 초기화
      fetchRoom();
  } catch (err) {
      alert(err.response?.data?.detail || "방 정보 수정에 실패했습니다.");
  }
};

// 세션 추가/삭제 헬퍼 함수들
const handleAddSession = (sessionName) => {
  if (sessionName && !editData.sessions.includes(sessionName)) {
    setEditData(prev => ({
      ...prev,
      sessions: [...prev.sessions, sessionName]
    }));
  }
};

  const handleRemoveSession = (sessionName) => {
    // 참여자가 있는 세션은 삭제 불가
    const session = room.sessions.find(s => s.session_name === sessionName);
    if (session && session.participant_nickname) {
      alert(`'${sessionName}' 세션은 참여자가 있어 삭제할 수 없습니다.`);
      return;
    }
    
    setEditData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s !== sessionName)
    }));
  };

  const handleDeleteRoom = async () => {
    showAlert(
        "방 삭제 확인",
        "정말로 이 방을 삭제하시겠습니까?",
        async () => {
            try {
                await apiDelete(`/rooms/${roomId}?nickname=${encodeURIComponent(user.nickname)}`);
                alert("방이 삭제되었습니다.");
                navigate('/rooms');
            } catch (err) {
                alert(err.response?.data?.detail || "방 삭제에 실패했습니다.");
            }
        }
    );
  };

  // 로딩 상태
  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center' }}>로딩중...</div>;
  }

  // 에러 상태
  if (error) {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => navigate('/rooms')} className="btn btn-primary">
          방 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 방 정보가 없는 경우
  if (!room) {
    return <div style={{ padding: 20, textAlign: 'center' }}>방 정보를 찾을 수 없습니다.</div>;
  }

  const isManager = room.manager_nickname === user.nickname;
  const isParticipant = isManager || room.sessions.some(s => s.participant_nickname === user.nickname);

  return (
    <div className="room-detail" style={{maxWidth: '800px', margin: 'auto', padding: '20px'}}>
      <button onClick={() => navigate(-1)} style={{marginBottom: '20px'}}>← 뒤로가기</button>
      
      <div className="room-title-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', marginBottom: '10px' }}>
       {isEditing ? (
          <input
            name="title"
            value={editData.title}
           onChange={handleEditChange}
            style={{ fontSize: '1.5em', fontWeight: 'bold', flexGrow: 1, minWidth: 0, border: '1px solid #ddd', borderRadius: '5px', padding: '5px 10px' }}
          />
        ) : (
         <h2 
           style={{ margin: 0, flexGrow: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
           title={room.title}
          >
             {room.title} {room.is_private ? "🔒" : ""}
          </h2>
        )}

        {isManager && !room.confirmed && !room.ended && (
         <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
            {isEditing ? (
             <>
                <button onClick={handleUpdateRoom} className="btn btn-primary">저장</button>
                <button onClick={() => setIsEditing(false)} className="btn btn-secondary">취소</button>
              </>
            ) : (
              <>
                <button onClick={() => setIsEditing(true)} className="btn btn-secondary">수정</button>
                <button onClick={handleDeleteRoom} className="btn btn-danger">삭제</button>
             </>
            )}
         </div>
        )}
      </div>

      {isEditing ? (
          <div style={{display: 'flex', gap: '10px'}}>
             <input name="song" value={editData.song} onChange={handleEditChange} placeholder="곡 제목" style={{flex: 1}} />
             <input name="artist" value={editData.artist} onChange={handleEditChange} placeholder="아티스트" style={{flex: 1}} />
          </div>
      ) : (
          <h3>{room.song} / {room.artist}</h3>
      )}
      
      {room.clan && (
        <div style={{ marginTop: '10px', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>소속 클랜: </span>
          <Link to={`/clans/${room.clan.id}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 'bold' }}>
            {room.clan.name}
          </Link>
        </div>
      )}      

      <p>방장: {room.manager_nickname}</p>

      <div style={{background: '#f9f9f9', padding: '10px', borderRadius: '5px', marginBottom: '20px'}}>
        <strong>방 설명:</strong>
        {isEditing ? (
            <textarea name="description" value={editData.description} onChange={handleEditChange} style={{width: '100%', minHeight: '60px', marginTop: '5px'}} placeholder="방 설명" />
        ) : (
            <div style={{ margin: '5px 0 0 0' }}>
              <Linkify>{room.description || "설명 없음"}</Linkify>
            </div>
        )}
      </div>

      {room.ended && <p style={{color: 'red', fontWeight: 'bold', fontSize: '1.2em', textAlign: 'center'}}>이 합주는 종료되었습니다.</p>}

      {isEditing && isManager && (
        <div style={{ 
          background: '#f9f9f9', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h4>세션 구성 수정</h4>
          
          {/* 현재 세션 목록 */}
          <div style={{ marginBottom: '15px' }}>
            {editData.sessions.map((sessionName) => {
              const sessionInfo = room.sessions.find(s => s.session_name === sessionName);
              const hasParticipant = sessionInfo && sessionInfo.participant_nickname;
              
              return (
                <div key={sessionName} style={{ 
                  display: 'inline-block', 
                  margin: '5px',
                  padding: '5px 10px',
                  background: hasParticipant ? '#e0e0e0' : 'var(--primary-color)',
                  color: hasParticipant ? '#666' : 'white',
                  borderRadius: '15px'
                }}>
                  {sessionName}
                  {hasParticipant ? 
                    ` (${sessionInfo.participant_nickname})` : 
                    <button 
                      onClick={() => handleRemoveSession(sessionName)}
                      style={{ 
                        marginLeft: '8px', 
                        background: 'transparent', 
                        border: 'none', 
                        color: 'white', 
                        cursor: 'pointer' 
                      }}
                    >
                      ×
                    </button>
                  }
                </div>
              );
            })}
          </div>
          
          {/* 새 세션 추가 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={customSessionInput}
              onChange={(e) => setCustomSessionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSession(customSessionInput);
                  setCustomSessionInput('');
                }
              }}
              placeholder="추가할 세션 이름"
              style={{ flex: 1 }}
            />
            <button 
              type="button"
              onClick={() => {
                handleAddSession(customSessionInput);
                setCustomSessionInput('');
              }}
              className="btn btn-secondary"
            >
              세션 추가
            </button>
          </div>
          
          <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
            * 참여자가 있는 세션은 회색으로 표시되며 삭제할 수 없습니다.
          </small>
        </div>
      )}

      <h3>세션 참가 현황</h3>
      <ul style={{listStyle: 'none', padding: 0}}>
        {room.sessions.map((session) => (
          <li key={session.session_name} style={{marginBottom: '10px', borderBottom: '1px solid #f0f0f0', paddingBottom: '10px'}}>
            <div>
              <strong>{session.session_name}</strong>: 
              {session.participant_nickname ? (
                  <span style={{marginLeft: '8px'}}>
                      <strong>{session.participant_nickname}</strong>

                      {session.participant_nickname === user.nickname && !room.confirmed && (
                          <button onClick={() => handleLeaveSession(session.session_name)} style={{marginLeft: '10px', background: '#ff4d4f', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'}}>
                              참여 취소
                          </button>
                      )}
                      {isManager && session.participant_nickname !== user.nickname && !room.confirmed && (
                          <button onClick={() => handleKickMember(session.participant_nickname)} style={{marginLeft: '10px', background: '#dc3545', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'}}>
                              강퇴
                          </button>
                      )}
                  </span>
              ) : (
                  <span style={{marginLeft: '8px', color: '#888'}}>빈 자리</span>
              )}
            </div>

            {isManager && session.reservations && session.reservations.length > 0 && !room.confirmed && (
              <div style={{ marginLeft: '20px', marginTop: '8px', fontSize: '0.9em', borderLeft: '2px solid #e0e0e0', paddingLeft: '10px' }}>
                <strong style={{ color: '#555' }}>예약자 목록:</strong>
                {session.reservations.map(reservation => (
                  <div key={reservation.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '5px', padding: '2px 0' }}>
                    <span>{reservation.user.nickname}</span>
                    <button 
                      onClick={() => handleKickMember(reservation.user.nickname)}
                      style={{ background: '#c82333', color: 'white', border: 'none', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8em' }}
                    >
                      강퇴
                   </button>
                  </div>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {isManager && !room.confirmed && !room.ended && (
        <button onClick={handleConfirmRoom} style={{width: '100%', padding: '10px', background: 'green', color: 'white', cursor: 'pointer', border: 'none', borderRadius: 5, fontSize: '1.1em', marginTop: '10px'}}>방 확정하기</button>
      )}
      {isManager && room.confirmed && !room.ended && (
        <button onClick={handleEndRoom} style={{width: '100%', padding: '10px', background: 'darkred', color: 'white', cursor: 'pointer', border: 'none', borderRadius: 5, fontSize: '1.1em', marginTop: '10px'}}>합주 종료 및 평가 시작</button>
      )}

      {isParticipant && !room.ended && (
        room.confirmed ? (
          <RoomScheduler user={user} room={room} />
        ) : (
          <div style={{ border: '1px dashed #ccc', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center', color: '#888' }}>
            방이 확정된 후에 일정을 조율할 수 있습니다.
          </div>
        )
      )}

      {isParticipant && !room.ended && room?.id && (
        <div style={{ 
          marginTop: '20px', 
          textAlign: 'center',
          padding: '20px',
          background: '#f9f9f9',
          borderRadius: '12px'
        }}>
          <p style={{ marginBottom: '15px', color: '#666' }}>
            이 방의 멤버들과 채팅하고 싶으신가요?
          </p>
          <Link to={`/chats/group/${room.id}`}>
            <button className="btn btn-primary" style={{ 
              padding: '12px 30px', 
              fontSize: '1.1em' 
            }}>
              단체 채팅
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default RoomDetail;