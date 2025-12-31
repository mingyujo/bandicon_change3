// [수정된 전체 코드] src/features/clan/ClanRoomDashboard.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';
import { useAlert } from '../../context/AlertContext';

const ClanRoomDashboard = ({ user }) => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [rooms, setRooms] = useState([]);
    const [clanName, setClanName] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [basicSessions, setBasicSessions] = useState([]);
    const [customSessions, setCustomSessions] = useState([]);
    const [showCustomSessions, setShowCustomSessions] = useState(false);
    const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            setIsPortrait(window.innerHeight > window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const sortedRooms = useMemo(() => {
        const roomsCopy = [...rooms];
        const countEmptySessions = (room) => room.sessions.filter(s => !s.participant_nickname).length;

        if (sortBy === 'latest') {
            return roomsCopy.sort((a, b) => b.id - a.id);
        }
        if (sortBy === 'fewest_empty') {
            return roomsCopy.sort((a, b) => countEmptySessions(a) - countEmptySessions(b));
        }
        if (sortBy === 'most_empty') {
            return roomsCopy.sort((a, b) => countEmptySessions(b) - countEmptySessions(a));
        }
        return roomsCopy;
    }, [rooms, sortBy]);

    const fetchClanRooms = useCallback(async () => {
        if (!user || !clanId) return;

        try {
            // [수정] url 끝에 slash(/) 필수
            const dashboardData = await apiGet(`/clans/${clanId}/dashboard/?nickname=${encodeURIComponent(user.nickname)}`);

            console.log("DASHBOARD DATA RECEIVED:", dashboardData);

            setClanName(dashboardData.clan_name);
            setRooms(dashboardData.rooms || []);

            const sessionSet = new Set();
            (dashboardData.rooms || []).forEach(room => {
                room.sessions.forEach(session => {
                    sessionSet.add(session.session_name);
                });
            });

            const basicSessionNames = ["보컬", "리드기타", "리듬기타", "베이스", "드럼", "키보드"];
            const allSessionNames = Array.from(sessionSet);

            const basics = basicSessionNames.filter(s => allSessionNames.includes(s));
            const customs = allSessionNames.filter(s => !basicSessionNames.includes(s)).sort();

            setBasicSessions(basics);
            setCustomSessions(customs);
        } catch (err) {
            console.error("DASHBOARD FETCH ERROR:", err);
            alert(err.response?.data?.detail || "데이터를 불러오는데 실패했습니다.");
            navigate('/clans');
        }
    }, [clanId, user, navigate]);

    useEffect(() => {
        fetchClanRooms();
    }, [fetchClanRooms]);

    const showReservations = (session) => {
        const title = `'${session.session_name}' 예약 대기 목록`;
        const message = session.reservations.length > 0
            ? session.reservations.map((r, i) => `${i + 1}. ${r.user.nickname}`).join('\n')
            : "예약자가 없습니다.";
        showAlert(title, message, () => { }, false);
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'white',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* 상단 헤더 - 고정 */}
            <div style={{
                borderBottom: '2px solid var(--light-gray)',
                padding: '15px 20px',
                background: 'white',
                flexShrink: 0
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flex: '1 1 auto',  // 추가: 유연하게 크기 조정
                        minWidth: 0  // 추가: 축소 가능하게
                    }}>
                        <button
                            onClick={() => navigate(`/clans/${clanId}`)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                fontSize: '1.5em',
                                cursor: 'pointer',
                                padding: 0,
                                flexShrink: 0  // 추가: 뒤로가기 버튼 크기 고정
                            }}
                        >
                            ←
                        </button>
                        <h2 style={{
                            margin: 0,
                            fontSize: isPortrait ? '1em' : '1.2em',  // 수정: 세로모드에서 폰트 작게
                            color: 'var(--primary-color)',
                            overflow: 'hidden',  // 추가
                            textOverflow: 'ellipsis',  // 추가
                            whiteSpace: 'nowrap'  // 추가: 제목이 길면 말줄임
                        }}>
                            {clanName} 리스트
                        </h2>
                        {customSessions.length > 0 && (
                            <button
                                onClick={() => setShowCustomSessions(!showCustomSessions)}
                                style={{
                                    padding: '5px 8px',  // 수정: 패딩 줄임
                                    background: showCustomSessions ? 'var(--primary-color)' : '#f0f0f0',
                                    color: showCustomSessions ? 'white' : '#333',
                                    border: '1px solid var(--light-gray)',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    fontSize: '0.75em',  // 수정: 폰트 더 작게
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0  // 추가: 버튼 크기 고정
                                }}
                            >
                                {showCustomSessions ? '추가 세션 숨기기' : '추가 세션 보기'}
                            </button>
                        )}
                    </div>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        style={{
                            padding: '6px 8px',  // 수정: 패딩 줄임
                            borderRadius: '8px',
                            border: '1px solid var(--light-gray)',
                            background: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85em',  // 추가: 폰트 크기 줄임
                            flexShrink: 0  // 추가: 셀렉트 크기 고정
                        }}
                    >
                        <option value="latest">최신순</option>
                        <option value="fewest_empty">빈 세션 ↓</option>
                        <option value="most_empty">빈 세션 ↑</option>
                    </select>
                </div>
            </div>

            {/* 테이블 영역 - 스크롤 가능 */}
            <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '20px'
            }}>
                {sortedRooms.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#888'
                    }}>
                        합주방이 없습니다.
                    </div>
                ) : (
                    <div style={{
                        overflowX: 'auto',  // 항상 auto
                        height: '100%'
                    }}>
                        <table style={{
                            width: '100%',
                            minWidth: '600px',  // 테이블 최소 너비 추가
                            borderCollapse: 'collapse',
                            fontSize: isPortrait ? '0.85em' : '0.95em',  // 세로 모드에서 폰트 작게
                            tableLayout: 'fixed'  // 유지
                        }}>
                            <thead style={{
                                position: 'sticky',
                                top: 0,
                                background: '#f8f9fa',
                                zIndex: 10
                            }}>
                                <tr>
                                    <th style={{
                                        padding: '12px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid var(--light-gray)',
                                        width: isPortrait ? '140px' : '15%', // [수정 2] maxWidth를 width로 변경하여 너비 고정
                                        position: 'sticky',
                                        left: 0,
                                        background: '#f8f9fa'
                                    }}>
                                        곡제목
                                    </th>
                                    <th style={{
                                        padding: '12px',
                                        textAlign: 'left',
                                        borderBottom: '2px solid var(--light-gray)',
                                        width: isPortrait ? '100px' : '10%', // [수정 3] 여기도 width로 통일성 있게 변경
                                    }}>
                                        아티스트
                                    </th>
                                    {(showCustomSessions ? [...basicSessions, ...customSessions] : basicSessions).map(s => (
                                        <th key={s} style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            borderBottom: '2px solid var(--light-gray)',
                                            width: isPortrait ? '80px' : undefined, // [수정 4] 세션 컬럼들도 고정 너비로 변경
                                            fontSize: '0.9em'
                                        }}>
                                            {s}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRooms.map(room => (
                                    <tr key={room.id} style={{
                                        borderBottom: '1px solid #f0f0f0',
                                        '&:hover': { background: '#f8f9fa' }
                                    }}>
                                        <td style={{
                                            padding: '10px 12px',
                                            fontWeight: 'bold',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            // [수정 5] maxWidth를 제거해도 th의 너비를 따라가므로 생략 가능
                                            position: 'sticky',
                                            left: 0,
                                            background: 'white'
                                        }}>
                                            {room.song}
                                        </td>
                                        <td style={{
                                            padding: '10px 12px',
                                            color: '#666',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                            // [수정 6] 여기도 maxWidth 생략
                                        }}>
                                            {room.artist}
                                        </td>
                                        {(showCustomSessions ? [...basicSessions, ...customSessions] : basicSessions).map(sessionName => {
                                            const session = room.sessions.find(s => s.session_name === sessionName);

                                            if (!session) {
                                                return <td key={sessionName} style={{ padding: '10px', textAlign: 'center', color: '#999', fontSize: '0.8em' }}>X</td>;
                                            }

                                            if (!session.participant_nickname) {
                                                return (
                                                    <td key={sessionName} style={{ padding: '10px', textAlign: 'center', background: '#e3f2fd', fontWeight: 'bold', color: '#1976d2', fontSize: '0.85em' }}>
                                                        공석
                                                        {session.reservations?.length > 0 && (
                                                            <div onClick={() => showReservations(session)} style={{ fontSize: '0.75em', color: '#ff9800', cursor: 'pointer', marginTop: '2px' }}>
                                                                예약 {session.reservations.length}
                                                            </div>
                                                        )}
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={sessionName} style={{ padding: '10px', textAlign: 'center', fontSize: '0.85em' }}>
                                                    <div style={{ fontWeight: '500' }}>
                                                        {session.participant_nickname}
                                                    </div>
                                                    {session.reservations?.length > 0 && (
                                                        <div onClick={() => showReservations(session)} style={{ fontSize: '0.75em', color: '#ff9800', cursor: 'pointer', marginTop: '2px' }}>
                                                            예약 {session.reservations.length}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ClanRoomDashboard;