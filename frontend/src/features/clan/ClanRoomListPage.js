// [수정된 코드] src/features/clan/ClanRoomListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiGet, apiPostForm } from '../../api/api';
import { useAlert } from '../../context/AlertContext';

const ClanRoomListPage = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const { clanId } = useParams();
    const [clanName, setClanName] = useState('');
    const [loading, setLoading] = useState(false);

    // 🔥 핵심 수정 1: fetchClanRooms에서 클랜 이름 가져오는 부분 분리
    const fetchClanName = useCallback(async () => {
        if (!clanName && clanId) {
            try {
                const clanData = await apiGet(`/clans/${clanId}`);
                setClanName(clanData.name);
            } catch (error) {
                console.error("클랜 정보 불러오기 실패:", error);
            }
        }
    }, [clanId, clanName]);

    // 🔥 핵심 수정 2: fetchClanRooms 함수 최적화
    const fetchClanRooms = useCallback(async (currentSearch = searchTerm, currentSortBy = sortBy) => {
        if (!user?.nickname || !clanId || loading) return;
        
        setLoading(true);
        try {
            const url = `/clans/${clanId}/rooms?nickname=${encodeURIComponent(user.nickname)}&search=${encodeURIComponent(currentSearch)}&sort=${currentSortBy}`;
            const data = await apiGet(url);
            setRooms(data || []);
        } catch (error) {
            console.error("클랜 방 목록 불러오기 실패:", error);
            showAlert("오류", "데이터를 불러오는 데 실패했습니다.", () => {}, false);
        } finally {
            setLoading(false);
        }
    }, [user?.nickname, clanId, showAlert, loading]); // 🔥 searchTerm, sortBy 의존성 제거

    // 🔥 핵심 수정 3: 클랜명은 한 번만 가져오기
    useEffect(() => {
        fetchClanName();
    }, [fetchClanName]);

    // 🔥 핵심 수정 4: useEffect 최적화 - 디바운싱 적용
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchClanRooms(searchTerm, sortBy);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, sortBy, user?.nickname, clanId]); // fetchClanRooms 의존성 제거

    // 권한 체크는 별도로 한 번만
    useEffect(() => {
        if (!user?.nickname || !clanId) {
            showAlert("오류", "로그인이 필요하거나 잘못된 접근입니다.", () => {
                navigate('/clans');
            });
        }
    }, [user?.nickname, clanId, navigate, showAlert]);

    const handleJoinSession = async (room, sessionName) => {
        let password = "";
        if (room.is_private) {
            password = prompt("비밀번호를 입력하세요:");
            if (password === null) return;
        }
        try {
            const formData = new FormData();
            formData.append('room_id', String(room.id));
            formData.append('session_name', sessionName);
            formData.append('nickname', user.nickname);
            formData.append('password', password);
            const res = await apiPostForm("/rooms/join", formData);
            showAlert("성공", res.message, () => fetchClanRooms(), false);
        } catch (err) {
            showAlert("실패", err.response?.data?.detail || "참가에 실패했습니다.", () => {}, false);
        }
    };

    const handleLeaveSession = async (room, sessionName) => {
        showAlert("참여 취소", `'${room.title}' 방의 '${sessionName}' 세션 참여를 취소하시겠습니까?`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/leave", formData);
                    showAlert("성공", res.message, () => fetchClanRooms(), false);
                } catch (err) {
                    showAlert("실패", err.response?.data?.detail || "참여 취소 실패", () => {}, false);
                }
            }
        );
    };

    const handleReserveSession = async (room, sessionName) => {
        showAlert("세션 예약", `'${sessionName}' 세션에 예약하시겠습니까?`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/session/reserve", formData);
                    showAlert("성공", res.message, () => fetchClanRooms(), false);
                } catch (err) {
                    showAlert("실패", err.response?.data?.detail || "예약 실패", () => {}, false);
                }
            }
        );
    };

    const handleCancelReservation = async (room, sessionName) => {
        showAlert("예약 취소", `'${sessionName}' 세션 예약을 취소하시겠습니까?`,
            async () => {
                try {
                    const formData = new FormData();
                    formData.append('room_id', String(room.id));
                    formData.append('session_name', sessionName);
                    formData.append('nickname', user.nickname);
                    const res = await apiPostForm("/rooms/session/cancel-reservation", formData);
                    showAlert("성공", res.message, () => fetchClanRooms(), false);
                } catch (err) {
                    showAlert("실패", err.response?.data?.detail || "예약 취소 실패", () => {}, false);
                }
            }
        );
    };

    const showReservations = (session) => {
        const title = `'${session.session_name}' 예약 대기 목록 `;
        const message = session.reservations.length > 0
            ? session.reservations.map((r, index) => `${index + 1}. ${r.user.nickname}`).join('\n')
            : "예약자가 없습니다.";
        showAlert(title, message, () => {}, false);
    };

    if (loading && rooms.length === 0) {
        return <div style={{ padding: 20 }}>로딩중...</div>;
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="page-title" style={{ margin: 0 }}>'{clanName}' 클랜 합주방</h2>
                <button 
                    className="btn btn-primary" 
                    onClick={() => navigate('/create-room', { state: { clanId: clanId } })}
                >
                    + 방 생성
                </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <input
                    type="text"
                    placeholder="제목, 곡명, 아티스트로 검색"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field"
                    style={{ flexGrow: 1, margin: 0 }}
                />
                <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    style={{ marginLeft: '10px', padding: '8px', borderRadius: '8px', border: '1px solid var(--light-gray)' }}
                >
                    <option value="latest">최신순</option>
                    <option value="fewest_empty">빈 세션 적은 순</option>
                    <option value="most_empty">빈 세션 많은 순</option>
                </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', marginTop: '20px' }}>
                {rooms.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888', gridColumn: '1 / -1' }}>
                        {loading ? "로딩 중..." : "이 클랜으로 만들어진 합주방이 없습니다."}
                    </p>
                ) : (
                    rooms.map(room => (
                        <div key={room.id} className="card" style={{display: 'flex', flexDirection: 'column'}}>
                            <Link to={`/rooms/${room.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>{room.title} {room.is_private ? '🔒' : ''}</h3>
                                <p style={{ margin: '0 0 5px 0' }}>{room.song} - {room.artist}</p>
                                <p style={{ margin: 0, fontSize: '0.8em', color: '#666' }}>방장: {room.manager_nickname}</p>
                            </Link>
                            
                            <div style={{ flexGrow: 1, borderTop: '1px solid var(--light-gray)', marginTop: '15px', paddingTop: '10px' }}>
                                <ul style={{ 
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '10px 15px',
                                    listStyle: 'none', 
                                    padding: 0, 
                                    margin: 0,
                                }}>
                                    {room.sessions.map(session => {
                                        const isReservedByMe = session.reservations.some(r => r.user.nickname === user.nickname);
                                        return (
                                        <li key={session.session_name} style={{ fontSize: '0.9em', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                            <div>
                                                {session.session_name}:<br/><strong>{session.participant_nickname || '공석'}</strong>
                                                {session.reservations.length > 0 && 
                                                    <span onClick={() => showReservations(session)} style={{fontSize: '0.8em', color: 'orange', marginLeft: '4px', cursor: 'pointer', textDecoration: 'underline'}}>
                                                        (예약 {session.reservations.length}명)
                                                    </span>
                                                }
                                            </div>
                                            
                                            <div style={{marginTop: '4px'}}>
                                                {!session.participant_nickname && !room.confirmed && (
                                                    <button onClick={() => handleJoinSession(room, session.session_name)} className="btn btn-secondary" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                        참여
                                                    </button>
                                                )}
                                                {session.participant_nickname === user.nickname && !room.confirmed && (
                                                    <button onClick={() => handleLeaveSession(room, session.session_name)} className="btn btn-danger" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                        취소
                                                    </button>
                                                )}
                                                {session.participant_nickname && session.participant_nickname !== user.nickname && !isReservedByMe && !room.confirmed &&(
                                                    <button onClick={() => handleReserveSession(room, session.session_name)} className="btn btn-secondary" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px', background: 'orange', color: 'white'}}>
                                                        예약
                                                    </button>
                                                )}
                                                {isReservedByMe && !room.confirmed &&(
                                                    <button onClick={() => handleCancelReservation(room, session.session_name)} className="btn btn-danger" style={{width: '100%', fontSize: '0.8em', padding: '3px 6px'}}>
                                                        예약취소
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    )})}
                                </ul>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ClanRoomListPage;