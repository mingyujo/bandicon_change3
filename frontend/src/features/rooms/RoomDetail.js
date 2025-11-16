// frontend/src/features/rooms/RoomDetail.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost, apiPostForm, apiDelete } from '../../api/api';
import { useAuth } from '../../context/AuthContext'; 
import RoomChat from '../../components/RoomChat';
import { format } from 'date-fns';
import { useAlert } from '../../context/AlertContext'; 

// --- (2순위 기능) 캘린더 관련 ---
import FullCalendar from '@fullcalendar/react';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import 'react-day-picker/dist/style.css'; // DayPicker CSS

// (중략...)

function RoomDetail() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth(); 
    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessions, setSessions] = useState([]);
    const { alert } = useAlert(); 

    // --- 👇 [오류 수정] 'fetchRoomDetail' 함수의 정의가 누락되어 추가합니다. ---
    const fetchRoomDetail = useCallback(async () => {
        try {
            setLoading(true); // 로딩 시작
            const data = await apiGet(`/rooms/${roomId}/`);
            setRoom(data);
            setSessions(data.sessions || []);
            setError(null); // 기존 에러 초기화
        } catch (err) {
            console.error("방 정보 로딩 실패", err);
            setError(err.message || "방 정보를 불러오는 데 실패했습니다.");
            if (err.status === 404) {
                alert('방을 찾을 수 없습니다.', 'error');
                navigate('/rooms');
            }
        } finally {
            setLoading(false); // 로딩 종료
        }
    }, [roomId, navigate, alert]);
    // --- 👆 [오류 수정] ---

    // [2순위] 합주 일정 조율 (RoomScheduler)
    // ------------------------------------------------
    const [availability, setAvailability] = useState([]);
    const [selectedSlots, setSelectedSlots] = useState([]);
    
    // (중략...)

    const fetchAvailability = useCallback(async () => {
        // (GET) /api/v1/rooms/<room_id>/availability/
        try {
            const data = await apiGet(`/rooms/${roomId}/availability/`);
            setAvailability(data.slots || []);
            
            // 내가 투표한 슬롯 ID 목록을 selectedSlots state에 저장
            if (data.slots && user) { // user가 로드된 후에만 실행
                const myVotedSlots = data.slots
                    .filter(slot => slot.voters.some(voter => voter.id === user.id))
                    .map(slot => slot.id);
                setSelectedSlots(myVotedSlots);
            }

        } catch (err) {
            console.error("일정 조율 정보 로딩 실패", err);
        }
    }, [roomId, user]); // user를 의존성에 추가

    const handleSaveAvailability = async () => {
        // (POST) /api/v1/rooms/<room_id>/availability/
        // { "slot_ids": [1, 3, 5] }
        try {
            await apiPost(`/rooms/${roomId}/availability/`, {
                slot_ids: selectedSlots
            });
            alert('일정 조율 투표를 저장했습니다.');
            fetchAvailability(); // 저장 후 데이터 새로고침
        } catch (err) {
            alert('일정 조율 저장 실패', 'error');
            console.error(err);
        }
    };

    // (중략...)

    // [1순위] 세션 참가/취소/변경 (handleSessionAction)
    // ------------------------------------------------
    const handleSessionAction = async (sessionId, action, currentNickname) => {
        
        if (!user) {
            alert('로그인이 필요합니다.', 'error');
            return;
        }

        // 방장은 방 나가기(leave)는 불가능하지만, 세션 참가/취소/변경은 가능해야 함.
        // 'cancel' 액션도 'join'과 동일한 API를 호출하도록 수정 (백엔드가 토글 처리)
        let url = `/rooms/${roomId}/sessions/${sessionId}/join/`;

        try {
            const response = await apiPost(url, {}); // 닉네임 쿼리 제거
            
            // --- 👇 [오류 수정] 'newNickname' 변수의 정의가 누락되어 추가합니다. ---
            // 'join' 액션이면 유저 닉네임을, 'cancel' 액션이면 null을 할당합니다.
            const newNickname = (action === 'join') ? user.nickname : null;
            // --- 👆 [오류 수정] ---

            // optimistic update (서버 응답 전에 UI 즉시 업데이트)
            setSessions(prevSessions =>
                prevSessions.map(session => {
                    // 1. 내가 방금 클릭한 세션
                    if (session.id === sessionId) {
                        // 'newNickname' 변수를 사용합니다.
                        return { ...session, nickname: newNickname }; 
                    }
                    // 2. (변경) 내가 이전에 참여했던 세션
                    if (session.nickname === user.nickname) {
                        return { ...session, nickname: null };
                    }
                    // 3. 나머지
                    return session;
                })
            );
            
            // (중략...)
        } catch (err) {
            alert(err.message || '세션 변경에 실패했습니다.', 'error');
            // (만약의 경우) 실패 시 UI를 서버 데이터로 되돌리기
            fetchRoomDetail();
        }
    };

    // (이하 나머지 코드는 동일)
    // ------------------------------------------------

    // 방장용 기능 (방 확정, 강퇴, 방 삭제)
    const confirmRoom = async () => {
        if (window.confirm("방을 확정하시겠습니까? 더 이상 멤버를 받거나 세션을 변경할 수 없습니다.")) {
            try {
                await apiPost(`/rooms/${roomId}/confirm/`, {});
                alert('방이 확정되었습니다.');
                fetchRoomDetail(); // 새로고침
            } catch (err) {
                alert(err.message, 'error');
            }
        }
    };

    const kickMember = async (nickname) => {
        if (window.confirm(`${nickname} 님을 강퇴하시겠습니까?`)) {
            try {
                await apiDelete(`/rooms/${roomId}/kick/${nickname}/`, {});
                alert(`${nickname} 님을 강퇴했습니다.`);
                fetchRoomDetail(); // 새로고침
            } catch (err) {
                alert(err.message, 'error');
            }
        }
    };
    
    const deleteRoom = async () => {
        if (window.confirm("정말로 이 방을 삭제하시겠습니까?")) {
            try {
                await apiDelete(`/rooms/${roomId}/`);
                alert('방이 삭제되었습니다.');
                navigate('/rooms');
            } catch (err) {
                alert(err.message, 'error');
            }
        }
    };

    // 비방장용 기능 (방 나가기)
    const leaveRoom = async () => {
        if (window.confirm("정말로 이 방을 나가시겠습니까?")) {
            try {
                await apiPost(`/rooms/${roomId}/leave/`, {});
                alert('방을 나갔습니다.');
                navigate('/rooms');
            } catch (err) {
                alert(err.message, 'error');
            }
        }
    };
    
    useEffect(() => {
        fetchRoomDetail();
        fetchAvailability(); // [2순위] 일정 조율 정보 로드
    }, [fetchRoomDetail, fetchAvailability]);

    if (loading) return <div>로딩중...</div>;
    if (error) return <div>{error}</div>;
    if (!room) return <div>방을 찾을 수 없습니다.</div>;

    const isOwner = user && user.nickname === room.manager_nickname;
    const isMember = user && room.members.some(m => m.nickname === user.nickname);
    
    // [수정] user가 로드되기 전(null)에 user.nickname을 참조하려는 오류 방지
    const isSessionOccupied = user && room.members.some(m => m.nickname === user.nickname);

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-4">{room.title} (방장: {room.manager_nickname})</h1>
            <p className="mb-4">{room.description}</p>
            
            {room.clan && (
                <p className="mb-4 text-sm text-blue-600">
                    <Link to={`/clans/${room.clan.id}`}>[{room.clan.name} 클랜방]</Link>
                </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 세션 참가 현황 */}
                <div className="md:col-span-2">
                    <h2 className="text-2xl font-semibold mb-2">세션 참가 현황 ({room.members.length} / {room.max_members}명)</h2>
                    <div className="space-y-2">
                        {sessions.map(session => (
                            <div key={session.id} className="flex justify-between items-center p-3 bg-gray-100 rounded-lg">
                                <span className="font-medium">{session.name}</span>
                                {session.nickname ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600">{session.nickname}</span>
                                        {user && user.nickname === session.nickname ? (
                                            <button
                                                onClick={() => handleSessionAction(session.id, 'cancel', session.nickname)}
                                                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                                disabled={room.is_confirmed}
                                            >
                                                참여 취소
                                            </button>
                                        ) : (
                                            isOwner && !room.is_confirmed && (
                                                <button
                                                    onClick={() => kickMember(session.nickname)}
                                                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                                                >
                                                    강퇴
                                                </button>
                                            )
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleSessionAction(session.id, 'join', null)}
                                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                        disabled={room.is_confirmed || (isSessionOccupied)}
                                    >
                                        참여
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    
                    {/* [2순위] 합주 일정 조율 컴포넌트 */}
                    {!room.is_confirmed && isMember && (
                        <RoomScheduler 
                            availability={availability}
                            selectedSlots={selectedSlots}
                            setSelectedSlots={setSelectedSlots}
                            onSave={handleSaveAvailability}
                            isOwner={isOwner}
                            user={user} // user prop 전달
                        />
                    )}

                </div>

                {/* 방 정보 및 채팅 */}
                <div className="space-y-4">
                    {/* 방 관리 버튼 */}
                    {isOwner && !room.is_confirmed && (
                        <div className="bg-white p-4 rounded-lg shadow">
                            <h3 className="text-xl font-semibold mb-3">방 관리</h3>
                            <div className="flex flex-col space-y-2">
                                <button
                                    onClick={confirmRoom}
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    방 확정하기
                                </button>
                                <button
                                    onClick={deleteRoom}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    방 삭제하기
                                </button>
                            </div>
                        </div>
                    )}
                    {/* 방 나가기 버튼 */}
                    {user && isMember && !isOwner && !room.is_confirmed && (
                         <div className="bg-white p-4 rounded-lg shadow">
                            <button
                                onClick={leaveRoom}
                                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                                방 나가기
                            </button>
                        </div>
                    )}

                    {/* 채팅창 */}
                    <div className="bg-white p-4 rounded-lg shadow h-96">
                        <RoomChat roomId={roomId} user={user} />
                    </div>
                </div>
            </div>
        </div>
    );
}

// [2순위] 합주 일정 조율 (RoomScheduler) 컴포넌트
// ------------------------------------------------

function RoomScheduler({ availability, selectedSlots, setSelectedSlots, onSave, isOwner, user }) { // user prop 받기
    
    const handleSlotClick = (slotId) => {
        setSelectedSlots(prev =>
            prev.includes(slotId)
                ? prev.filter(id => id !== slotId)
                : [...prev, slotId]
        );
    };

    const getVoterCount = (slotId) => {
        const slot = availability.find(s => s.id === slotId);
        return slot ? slot.voters.length : 0;
    };
    
    const getVoterNames = (slotId) => {
        const slot = availability.find(s => s.id === slotId);
        return slot ? slot.voters.map(v => v.nickname).join(', ') : '';
    };

    // FullCalendar용 이벤트 데이터로 변환
    const calendarEvents = availability.map(slot => {
        const isSelectedByMe = user && slot.voters.some(voter => voter.id === user.id);
        return {
            id: slot.id,
            title: `${getVoterCount(slot.id)}명`,
            start: slot.start_time,
            end: slot.end_time,
            backgroundColor: isSelectedByMe ? '#34D399' : '#60A5FA', // 내가 선택O: green, 내가 선택X: blue
            borderColor: isSelectedByMe ? '#069564' : '#2563EB',
            extendedProps: {
                voterNames: getVoterNames(slot.id)
            }
        };
    });

    // 이벤트 렌더링 함수
    const renderEventContent = (eventInfo) => {
        return (
            <div className="p-1 overflow-hidden" title={eventInfo.event.extendedProps.voterNames}>
                <b>{eventInfo.timeText}</b>
                <p>{eventInfo.event.title}</p>
                <i className="text-xs truncate">{eventInfo.event.extendedProps.voterNames}</i>
            </div>
        );
    };

    // 캘린더에서 빈 시간 클릭 시
    const handleSelect = (selectInfo) => {
        // TODO: 방장일 경우 새 슬롯 생성 모달 띄우기 (3순위)
        if (!isOwner) return;
        
        // (임시) 방장만 새 슬롯 생성 가능 (현재는 미구현)
        // console.log('Selected area:', selectInfo.startStr, selectInfo.endStr);
        // alert('방장만 새 슬롯을 생성할 수 있습니다. (미구현)');
    };

    return (
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">합주 일정 조율</h2>
            
            <div className="mb-4 text-sm text-gray-600">
                <p>참여 가능한 시간에 투표해 주세요. (캘린더의 파란/초록 슬롯을 클릭)</p>
                <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center"><span className="w-4 h-4 bg-green-400 mr-2 rounded"></span> 내가 선택</span>
                    <span className="flex items-center"><span className="w-4 h-4 bg-blue-400 mr-2 rounded"></span> 선택 안함</span>
                </div>
            </div>

            {/* FullCalendar 캘린더 */}
            <div className="calendar-container">
                <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: '' // 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    events={calendarEvents}
                    eventContent={renderEventContent}
                    selectable={isOwner} // 방장만 새 슬롯 지정을 위해 드래그 가능
                    select={handleSelect}
                    eventClick={(clickInfo) => handleSlotClick(Number(clickInfo.event.id))} // 이벤트를 클릭 = 투표
                    locale="ko"
                    allDaySlot={false} // '종일' 슬롯 숨기기
                    slotMinTime="09:00:00" // 캘린더 시작 시간
                    slotMaxTime="24:00:00" // 캘린더 종료 시간
                    height="auto" // 부모 컨테이너 높이에 맞춤
                />
            </div>
            
            <button
                onClick={onSave}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                내 투표 저장하기
            </button>
        </div>
    );
}

export default RoomDetail;