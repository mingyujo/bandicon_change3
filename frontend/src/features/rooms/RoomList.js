// frontend/src/features/rooms/RoomList.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPostForm, apiPost } from '../../api/api';
import { useAlert } from '../../context/AlertContext';

const RoomList = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const fetchRooms = useCallback(async (currentSearch, currentSortBy) => { 
        try {
            const data = await apiGet(`/rooms/?search=${encodeURIComponent(currentSearch)}&sort=${currentSortBy}`);
            setRooms(data || []);
        } catch (error) {
            console.error("방 목록 불러오기 실패:", error);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchRooms(searchTerm, sortBy); 
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, sortBy, fetchRooms]);

    const handleJoinSession = async (room, sessionName) => {
        // 비밀방인 경우 비밀번호 확인 (TODO: 백엔드에 비밀번호 검증 추가 필요)
        if (room.is_private) {
            const password = prompt("비밀번호를 입력하세요:");
            if (password === null) return;
            // TODO: 비밀번호 검증 로직
        }

        // ✅ 세션 ID 찾기
        const session = room.sessions?.find(s => s.session_name === sessionName);
        if (!session) {
            alert("세션을 찾을 수 없습니다.");
            return;
        }

        try {
            // ✅ 세션 토글 API 사용
            const res = await apiPost(`/rooms/${room.id}/sessions/${session.id}/join/`);
            alert(res.detail || "세션에 참가했습니다.");
            fetchRooms(searchTerm, sortBy);
        } catch (err) {
            alert(err.response?.data?.detail || "참가에 실패했습니다.");
        }
    };
    
    // ✅ 수정된 handleLeaveSession
    const handleLeaveSession = async (room, sessionName) => {
        // 세션 ID를 찾기
        const session = room.sessions?.find(s => s.session_name === sessionName);
        if (!session) {
            alert("세션을 찾을 수 없습니다.");
            return;
        }

        showAlert(
            "참여 취소",
            `'${room.title}' 방의 '${sessionName}' 세션 참여를 취소하시겠습니까?`,
            async () => {
                try {
                    // ✅ 세션 토글 API 사용 (방장도 사용 가능)
                    const res = await apiPost(`/rooms/${room.id}/sessions/${session.id}/join/`);
                    alert(res.detail || "참여가 취소되었습니다.");
                    fetchRooms(searchTerm, sortBy);
                } catch (err) {
                    alert(err.response?.data?.detail || "참여 취소 실패");
                }
            }
        );
    };

    const handleReserveSession = async (room, sessionName) => {
        const session = room.sessions?.find(s => s.session_name === sessionName);
        if (!session) {
            alert("세션을 찾을 수 없습니다.");
            return;
        }

        showAlert(
            "세션 예약",
            `'${sessionName}' 세션에 예약하시겠습니까?`,
            async () => {
                try {
                    const res = await apiPost(`/rooms/sessions/${session.id}/reserve/`);
                    showAlert("성공", res.detail || "예약이 완료되었습니다.", () => fetchRooms(searchTerm, sortBy), false);
                } catch (err) {
                    showAlert("실패", err.response?.data?.detail || "예약 실패", () => {}, false);
                }
            }
        );
    };

    const handleCancelReservation = async (room, sessionName) => {
        const session = room.sessions?.find(s => s.session_name === sessionName);
        if (!session) {
            alert("세션을 찾을 수 없습니다.");
            return;
        }

        showAlert(
            "예약 취소",
            `'${sessionName}' 세션 예약을 취소하시겠습니까?`,
            async () => {
                try {
                    const res = await apiPost(`/rooms/sessions/${session.id}/cancel-reserve/`);
                    showAlert("성공", res.detail || "예약이 취소되었습니다.", () => fetchRooms(searchTerm, sortBy), false);
                } catch (err) {
                    showAlert("실패", err.response?.data?.detail || "예약 취소 실패", () => {}, false);
                }
            }
        );
    };

    const showReservations = (session) => {
        const title = `'${session.session_name}' 예약 대기 목록 (선착순)`;
        const message = session.reservations.length > 0
            ? session.reservations.map((r, index) => `${index + 1}. ${r.user.nickname}`).join('\n')
            : "예약자가 없습니다.";
        
        showAlert(title, message, () => {}, false);
    };

    return (
        <div style={{ padding: 20 }}>
            <h2 className="page-title">합주방 목록</h2>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="방 제목 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ flex: 1 }}
                />
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field"
                    style={{ width: '150px' }}
                >
                    <option value="latest">최신순</option>
                    <option value="oldest">오래된순</option>
                    <option value="popularity">인기순</option>
                </select>
                <button 
                    onClick={() => navigate('/create-room')} 
                    className="btn btn-primary"
                >
                    방 만들기
                </button>
            </div>

            {rooms.length === 0 ? (
                <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                    검색 결과가 없습니다.
                </div>
            ) : (
                rooms.map(room => (
                    <div key={room.id} className="card" style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginBottom: '10px', color: 'var(--primary-color)' }}>
                            <Link to={`/rooms/${room.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                {room.title}
                            </Link>
                            {room.is_private && <span style={{ marginLeft: '10px', fontSize: '0.9em', color: '#666' }}>🔒</span>}
                        </h3>
                        
                        <p style={{ color: '#666', marginBottom: '10px' }}>{room.description}</p>
                        
                        <div style={{ fontSize: '0.85em', color: '#888', marginBottom: '10px' }}>
                            방장: {room.manager_nickname} | 
                            생성일: {new Date(room.created_at).toLocaleDateString()}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
                            {room.sessions && room.sessions.map(session => {
                                const isMySession = session.nickname === user?.nickname;
                                const isFull = session.nickname !== null;
                                const isReserved = session.reservations && session.reservations.some(r => r.user.nickname === user?.nickname);

                                return (
                                    <div 
                                        key={session.id} 
                                        style={{
                                            padding: '10px',
                                            border: isMySession ? '2px solid var(--primary-color)' : '1px solid #ddd',
                                            borderRadius: '5px',
                                            backgroundColor: isFull ? '#f0f0f0' : '#fff',
                                            textAlign: 'center'
                                        }}
                                    >
                                        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                                            {session.session_name}
                                        </div>
                                        <div style={{ fontSize: '0.85em', color: '#666', marginBottom: '5px' }}>
                                            {session.nickname || '참여 대기'}
                                        </div>
                                        
                                        {isMySession ? (
                                            <button 
                                                onClick={() => handleLeaveSession(room, session.session_name)}
                                                className="btn btn-secondary"
                                                style={{ fontSize: '0.85em', padding: '5px 10px' }}
                                            >
                                                참여 취소
                                            </button>
                                        ) : isFull ? (
                                            isReserved ? (
                                                <button 
                                                    onClick={() => handleCancelReservation(room, session.session_name)}
                                                    className="btn btn-secondary"
                                                    style={{ fontSize: '0.85em', padding: '5px 10px' }}
                                                >
                                                    예약 취소
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => handleReserveSession(room, session.session_name)}
                                                    className="btn btn-primary"
                                                    style={{ fontSize: '0.85em', padding: '5px 10px' }}
                                                >
                                                    예약하기
                                                </button>
                                            )
                                        ) : (
                                            <button 
                                                onClick={() => handleJoinSession(room, session.session_name)}
                                                className="btn btn-primary"
                                                style={{ fontSize: '0.85em', padding: '5px 10px' }}
                                            >
                                                참가하기
                                            </button>
                                        )}
                                        
                                        {session.reservations && session.reservations.length > 0 && (
                                            <div style={{ marginTop: '5px' }}>
                                                <button 
                                                    onClick={() => showReservations(session)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--primary-color)',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8em',
                                                        textDecoration: 'underline'
                                                    }}
                                                >
                                                    예약 {session.reservations.length}명
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
};

export default RoomList;