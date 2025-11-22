import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../../api/api';
import RoomChat from '../../components/RoomChat';
import { useAlert } from '../../context/AlertContext'; 

// --- (2순위 기능) 캘린더 관련 ---
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import 'react-day-picker/dist/style.css'; 

// [수정] user를 props로 받도록 복구 (useAuth 제거)
function RoomDetail({ user }) {
    const { roomId } = useParams(); 
    const navigate = useNavigate();
    
    // [수정] Context 사용 제거 (props.user 사용)
    // const { user } = useAuth(); 

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessions, setSessions] = useState([]);
    const { showAlert } = useAlert(); 

    // [2순위] 합주 일정 조율 상태
    const [availability, setAvailability] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);

    // 1. 방 정보 불러오기
    const fetchRoomDetail = useCallback(async () => {
        try {
            setLoading(true);
            if (!roomId) return;

            const data = await apiGet(`/rooms/${roomId}/`);
            setRoom(data);
            // 세션 데이터가 없으면 빈 배열로 초기화
            setSessions(data.sessions || []);
            setError(null);
        } catch (err) {
            console.error("방 정보 로딩 실패", err);
            setError(err.message || "방 정보를 불러오는 데 실패했습니다.");
            if (err.response && err.response.status === 404) {
                showAlert('방을 찾을 수 없습니다.', 'error');
                navigate('/rooms');
            }
        } finally {
            setLoading(false);
        }
    }, [roomId, navigate, showAlert]);

    // 2. 일정 조율 데이터 불러오기
    const fetchAvailability = useCallback(async () => {
        if (!roomId) return;
        try {
            const data = await apiGet(`/rooms/${roomId}/availability/`);
            setAvailability(data.slots || []);
            
            // 내가 투표한 슬롯 ID 목록 저장
            if (data.slots && user) {
                const myVotedSlots = data.slots
                    .filter(slot => slot.voters && slot.voters.some(voter => voter.id === user.id))
                    .map(slot => slot.id);
                setSelectedSlots(myVotedSlots);
            }
        } catch (err) {
            console.error("일정 조율 정보 로딩 실패", err);
        }
    }, [roomId, user]);

    // 3. 일정 조율 저장
    const handleSaveAvailability = async () => {
        try {
            await apiPost(`/rooms/${roomId}/availability/`, {
                times: [], 
                slot_ids: selectedSlots 
            });
            showAlert('일정 조율 투표를 저장했습니다.', 'success');
            fetchAvailability(); 
        } catch (err) {
            showAlert('일정 조율 저장 실패', 'error');
            console.error(err);
        }
    };

    // 4. 세션 참가/취소/변경
    const handleSessionAction = async (sessionId, action, currentNickname) => {
        if (!user) {
            showAlert('로그인이 필요합니다.', 'error');
            return;
        }

        try {
            await apiPost(`/rooms/${roomId}/sessions/${sessionId}/join/`, {}); 
            fetchRoomDetail();
        } catch (err) {
            showAlert(err.message || '세션 변경에 실패했습니다.', 'error');
            fetchRoomDetail();
        }
    };

    // 방장 기능들
    const confirmRoom = async () => {
        if (window.confirm("방을 확정하시겠습니까?")) {
            try {
                await apiPost(`/rooms/${roomId}/confirm/`, {});
                showAlert('방이 확정되었습니다.', 'success');
                fetchRoomDetail();
            } catch (err) {
                showAlert(err.message, 'error');
            }
        }
    };

    const kickMember = async (nickname) => {
        if (window.confirm(`${nickname} 님을 강퇴하시겠습니까?`)) {
            try {
                await apiPost(`/rooms/${roomId}/kick/`, { nickname });
                showAlert(`${nickname} 님을 강퇴했습니다.`, 'success');
                fetchRoomDetail();
            } catch (err) {
                showAlert(err.message, 'error');
            }
        }
    };
    
    const deleteRoom = async () => {
        if (window.confirm("정말로 이 방을 삭제하시겠습니까?")) {
            try {
                await apiDelete(`/rooms/${roomId}/`);
                showAlert('방이 삭제되었습니다.', 'success');
                navigate('/rooms');
            } catch (err) {
                showAlert(err.message, 'error');
            }
        }
    };

    const leaveRoom = async () => {
        if (window.confirm("정말로 이 방을 나가시겠습니까?")) {
            try {
                await apiPost(`/rooms/${roomId}/leave/`, {});
                showAlert('방을 나갔습니다.', 'success');
                navigate('/rooms');
            } catch (err) {
                showAlert(err.message, 'error');
            }
        }
    };
    
    useEffect(() => {
        if (roomId) {
            fetchRoomDetail();
            fetchAvailability();
        }
    }, [fetchRoomDetail, fetchAvailability, roomId]);

    // 렌더링 전 로딩/에러 처리
    if (loading) return <div className="p-4 text-center">로딩중...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!room) return <div className="p-4 text-center">방을 찾을 수 없습니다.</div>;

    // [중요] 안전장치 (?.) 유지 - user나 room.members가 undefined일 때 보호
    // user가 null일 수 있으므로 user?.nickname 사용
    const isOwner = user && room.manager_nickname === user.nickname;
    
    // room.members가 없으면 빈 배열로 취급
    const members = room.members || []; 
    const isMember = user && members.some(m => m.nickname === user.nickname);

    return (
        <div className="container mx-auto p-4 max-w-6xl">
            <div className="bg-white shadow rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">
                            {room.title} 
                            {room.confirmed && <span className="ml-2 text-sm bg-green-100 text-green-800 px-2 py-1 rounded">확정됨</span>}
                        </h1>
                        <p className="text-gray-600 mb-2">{room.description}</p>
                        <div className="text-sm text-gray-500">
                            방장: <span className="font-medium text-gray-900">{room.manager_nickname}</span>
                        </div>
                        
                        {room.clan && (
                            <p className="mt-2 text-sm text-indigo-600 font-medium">
                                <Link to={`/clans/${room.clan.id}`} className="hover:underline">
                                    🛡️ {room.clan.name} 클랜방
                                </Link>
                            </p>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-2">
                        {isOwner && !room.confirmed && (
                            <>
                                <button onClick={confirmRoom} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                    확정하기
                                </button>
                                <button onClick={deleteRoom} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
                                    삭제하기
                                </button>
                            </>
                        )}
                        {user && isMember && !isOwner && !room.confirmed && (
                             <button onClick={leaveRoom} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 text-sm">
                                나가기
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 좌측: 세션 및 일정 */}
                <div className="lg:col-span-2 space-y-6">
                    
                    {/* 세션 목록 */}
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">
                            세션 현황 <span className="text-sm font-normal text-gray-500">({members.length} / {room.max_members || '-'}명)</span>
                        </h2>
                        <div className="space-y-3">
                            {sessions.map(session => {
                                const isMySession = user && session.participant_nickname === user.nickname;
                                const isOccupied = !!session.participant_nickname;

                                return (
                                    <div key={session.id} className={`flex justify-between items-center p-4 rounded-lg border ${isMySession ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 border-gray-200'}`}>
                                        <span className="font-medium text-gray-800">{session.session_name}</span>
                                        
                                        <div className="flex items-center gap-3">
                                            {session.participant_nickname ? (
                                                <span className={`text-sm font-medium px-3 py-1 rounded-full ${isMySession ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>
                                                    {session.participant_nickname}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">비어있음</span>
                                            )}

                                            {/* 버튼 로직 */}
                                            {isMySession ? (
                                                <button 
                                                    onClick={() => handleSessionAction(session.id, 'cancel', session.participant_nickname)}
                                                    disabled={room.confirmed}
                                                    className="text-sm px-3 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 disabled:opacity-50"
                                                >
                                                    취소
                                                </button>
                                            ) : (
                                                !isOccupied && (
                                                    <button 
                                                        onClick={() => handleSessionAction(session.id, 'join', null)}
                                                        disabled={room.confirmed}
                                                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                                                    >
                                                        참여
                                                    </button>
                                                )
                                            )}
                                            
                                            {isOwner && isOccupied && !isMySession && !room.confirmed && (
                                                <button 
                                                    onClick={() => kickMember(session.participant_nickname)}
                                                    className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 ml-2"
                                                >
                                                    강퇴
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                             {sessions.length === 0 && <p className="text-gray-500 text-center py-4">등록된 세션이 없습니다.</p>}
                        </div>
                    </div>

                    {/* 일정 조율 */}
                    {!room.confirmed && (isMember || isOwner) && (
                        <RoomScheduler 
                            availability={availability}
                            selectedSlots={selectedSlots}
                            setSelectedSlots={setSelectedSlots}
                            onSave={handleSaveAvailability}
                            isOwner={isOwner}
                            user={user}
                        />
                    )}
                </div>

                {/* 우측: 채팅 */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow rounded-lg h-[600px] flex flex-col">
                        <div className="p-4 border-b">
                            <h3 className="font-bold text-gray-800">💬 실시간 채팅</h3>
                        </div>
                        <div className="flex-1 overflow-hidden p-2">
                            <RoomChat roomId={roomId} user={user} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// [2순위] 합주 일정 조율 컴포넌트
function RoomScheduler({ availability, selectedSlots, setSelectedSlots, onSave, isOwner, user }) {
    
    const handleSlotClick = (slotId) => {
        setSelectedSlots(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    // 안전장치 추가
    const safeAvailability = availability || [];

    const getVoterCount = (slotId) => {
        const slot = safeAvailability.find(s => s.id === slotId);
        return slot && slot.voters ? slot.voters.length : 0;
    };
    
    const getVoterNames = (slotId) => {
        const slot = safeAvailability.find(s => s.id === slotId);
        return slot && slot.voters ? slot.voters.map(v => v.nickname).join(', ') : '';
    };

    const calendarEvents = safeAvailability.map(slot => {
        const isSelectedByMe = user && slot.voters && slot.voters.some(voter => voter.id === user.id);
        return {
            id: String(slot.id),
            title: `${getVoterCount(slot.id)}명`,
            start: slot.time,
            backgroundColor: isSelectedByMe ? '#10B981' : '#3B82F6', 
            borderColor: isSelectedByMe ? '#059669' : '#2563EB',
            extendedProps: {
                voterNames: getVoterNames(slot.id)
            }
        };
    });

    const renderEventContent = (eventInfo) => {
        return (
            <div className="p-1 text-xs overflow-hidden cursor-pointer" title={eventInfo.event.extendedProps.voterNames}>
                <div className="font-bold">{eventInfo.timeText}</div>
                <div>{eventInfo.event.title}</div>
            </div>
        );
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">📅 일정 조율</h2>
            <div className="mb-4 text-sm text-gray-600 flex gap-4">
                <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded-full mr-1"></span> 내 투표</span>
                <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span> 타인 투표</span>
            </div>

            <div className="calendar-wrapper">
                <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next',
                        center: 'title',
                        right: 'today'
                    }}
                    events={calendarEvents}
                    eventContent={renderEventContent}
                    selectable={isOwner}
                    eventClick={(clickInfo) => handleSlotClick(Number(clickInfo.event.id))}
                    locale="ko"
                    allDaySlot={false}
                    slotMinTime="09:00:00"
                    slotMaxTime="24:00:00"
                    height="auto"
                    slotDuration="01:00:00"
                />
            </div>
            
            <button onClick={onSave} className="w-full mt-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                투표 저장하기
            </button>
        </div>
    );
}

export default RoomDetail;