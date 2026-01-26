import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, API_BASE_SERVER } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './RoomDetail.css';
import defaultProfileImg from '../../assets/default_profile.png';
// Session Image Helper
const getInstrumentImage = (sessionName) => {
    if (!sessionName) return null;
    const name = sessionName.toLowerCase();
    if (name.includes('보컬')) return '/assets/instruments/vocal.png';
    if (name.includes('베이스')) return '/assets/instruments/guitar.png';
    if (name.includes('기타')) return '/assets/instruments/bass.png';
    if (name.includes('드럼')) return '/assets/instruments/drum.png';
    if (name.includes('키보드') || name.includes('건반') || name.includes('피아노')) return '/assets/instruments/keyboard.png';
    return '/assets/instruments/custom.svg?v=5';
};



function RoomDetail({ user }) {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const [room, setRoom] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessions, setSessions] = useState([]);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showFullSessionWarning, setShowFullSessionWarning] = useState(false);
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [targetSessionId, setTargetSessionId] = useState(null);
    const [showNotReadyModal, setShowNotReadyModal] = useState(false);
    const [showScheduleWarning, setShowScheduleWarning] = useState(false);
    const [showPermissionWarning, setShowPermissionWarning] = useState(false);

    // Owner Actions State
    const [showKickModal, setShowKickModal] = useState(false);
    const [targetKickNickname, setTargetKickNickname] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showEndModal, setShowEndModal] = useState(false);

    // Reservation List Modal
    const [showReservationModal, setShowReservationModal] = useState(false);
    const [reservationList, setReservationList] = useState([]);
    const [targetSessionName, setTargetSessionName] = useState('');

    const fetchRoomDetail = useCallback(async () => {
        try {
            setLoading(true);
            if (!roomId) return;
            const data = await apiGet(`/rooms/${roomId}/`);
            setRoom(data);
            setSessions(data.sessions || []);
            setError(null);
        } catch (err) {
            setError(err.message || "방 정보를 불러오는 데 실패했습니다.");
            if (err.response && err.response.status === 404) {
                showAlert('방을 찾을 수 없습니다.', 'error');
                navigate('/rooms');
            }
        } finally {
            setLoading(false);
        }
    }, [roomId, navigate, showAlert]);

    useEffect(() => {
        if (roomId) fetchRoomDetail();
    }, [fetchRoomDetail, roomId]);

    const handleSessionClick = (session) => {
        if (!user) return showAlert('로그인이 필요합니다.', 'error');
        if (session.is_placeholder) return;

        if (!session.participant_nickname) {
            // Empty -> Join
            setTargetSessionId(session.id);
            setShowJoinModal(true);
        } else if (session.participant_nickname === user.nickname) {
            // My Session -> Leave
            setTargetSessionId(session.id);
            setShowLeaveModal(true);
        }
        // Others -> Do nothing
    };

    const executeSessionAction = async () => {
        if (!targetSessionId) return;
        try {
            await apiPost(`/rooms/${roomId}/sessions/${targetSessionId}/join/`, {});
            fetchRoomDetail();
            setShowJoinModal(false);
            setShowLeaveModal(false);
            setTargetSessionId(null);
        } catch (err) {
            showAlert(err.message || '세션 변경에 실패했습니다.', 'error');
            fetchRoomDetail();
            setShowJoinModal(false);
            setShowLeaveModal(false);
            setTargetSessionId(null);
        }
    };

    const performRoomConfirm = async () => {
        try {
            await apiPost(`/rooms/${roomId}/confirm/`, {});
            showAlert('방이 확정되었습니다.', 'success');
            setShowConfirmModal(false);
            fetchRoomDetail();
        } catch (err) {
            showAlert(err.message || '방 확정에 실패했습니다.', 'error');
            setShowConfirmModal(false);
        }
    };

    const handleConfirmClick = () => {
        if (room.confirmed) return;
        if (!isOwner) {
            setShowPermissionWarning(true);
            setTimeout(() => setShowPermissionWarning(false), 2000);
            return;
        }

        // Check if all sessions are occupied (excluding placeholders)
        // Note: sessions array from API contains the actual sessions. 
        // displaySessions has placeholders. We use 'sessions'.
        const allOccupied = sessions.every(s => s.participant_nickname);

        if (!allOccupied) {
            setShowFullSessionWarning(true);
            // Hide warning after 2 seconds
            setTimeout(() => setShowFullSessionWarning(false), 2000);
        } else {
            setShowConfirmModal(true);
        }
    };

    const fileInputRef = React.useRef(null);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!isOwner) {
            showAlert('방장만 이미지를 변경할 수 있습니다.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        try {
            await apiPost(`/rooms/${roomId}/image/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            showAlert('방 이미지가 변경되었습니다.', 'success');
            fetchRoomDetail(); // Refresh to show new image
        } catch (err) {
            showAlert(err.message || '이미지 업로드에 실패했습니다.', 'error');
        }
    };

    const handleAlbumArtClick = () => {
        if (isOwner && fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleNotReadyClick = () => {
        setShowNotReadyModal(true);
        setTimeout(() => setShowNotReadyModal(false), 2000);
    };

    // Owner Actions Handlers
    const handleKickClick = (e, session) => {
        e.stopPropagation();
        setTargetKickNickname(session.participant_nickname);
        setShowKickModal(true);
    };

    const performKick = async () => {
        try {
            await apiPost(`/rooms/${roomId}/kick/`, { nickname: targetKickNickname });
            showAlert('강퇴 처리되었습니다.', 'success');
            setShowKickModal(false);
            fetchRoomDetail();
        } catch (err) {
            showAlert(err.message || '강퇴에 실패했습니다.', 'error');
            setShowKickModal(false);
        }
    };

    const performDeleteRoom = async () => {
        try {
            await apiDelete(`/rooms/${roomId}/`);
            showAlert('방이 삭제되었습니다.', 'success');
            navigate('/rooms');
        } catch (err) {
            showAlert(err.message || '방 삭제에 실패했습니다.', 'error');
            setShowDeleteModal(false);
        }
    };

    const performEndPractice = async () => {
        try {
            await apiPost(`/rooms/${roomId}/end/`, {});
            showAlert('합주가 종료되었습니다.', 'success');
            navigate('/rooms');
        } catch (err) {
            showAlert(err.message || '합주 종료에 실패했습니다.', 'error');
            setShowEndModal(false);
        }
    };

    const handleScheduleClick = () => {
        if (!room.confirmed) {
            setShowScheduleWarning(true);
            // Optional: Auto-hide after 2 seconds
            setTimeout(() => setShowScheduleWarning(false), 2000);
            return;
        }
        navigate(`/rooms/${roomId}/schedule`);
    };

    if (loading) return <div className="p-4 text-center">로딩중...</div>;
    if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
    if (!room) return <div className="p-4 text-center">방을 찾을 수 없습니다.</div>;

    const isOwner = user && (room.manager_nickname === user.nickname || room.user_is_clan_admin);

    const displaySessions = [...sessions];
    while (displaySessions.length < 6) {
        displaySessions.push({ id: `placeholder-${displaySessions.length}`, is_placeholder: true });
    }

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <div className={`room-detail-container ${room.confirmed ? 'state-confirmed' : 'state-unconfirmed'}`}>

                {/* 2. Header */}
                <div className="detail-header">
                    <div className="header-left">
                        <button className="back-btn" onClick={() => navigate(-1)}>
                            <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11 1L2 10L11 19" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleImageUpload}
                        />
                        <div
                            className="album-art"
                            onClick={handleAlbumArtClick}
                            style={{
                                backgroundImage: room.image ? `url(${room.image.startsWith('http') ? room.image : API_BASE_SERVER + room.image}?v=${Date.now()})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                cursor: isOwner ? 'pointer' : 'default',
                                borderRadius: '50%'
                            }}
                        ></div>
                        <div className="room-info">
                            <div className="room-title">
                                <span className="room-song-name">{room.song}</span>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="room-lock-icon"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                            </div>
                            <div className="room-artist">: {room.artist}</div>
                        </div>
                    </div>
                    <div className="header-right">
                        <div className="room-manager">
                            방장 : {room.manager_nickname}
                        </div>
                        <div
                            className={`status-badge ${room.confirmed ? 'confirmed' : ''}`}
                            onClick={handleConfirmClick}
                            style={{ cursor: 'pointer' }}
                        >
                            {room.confirmed ? '확정' : '미확정'}
                        </div>
                        <button className="chat-btn" onClick={() => navigate(`/chats/group/${roomId}`)}>
                            단체 채팅
                        </button>
                    </div>
                </div>

                {/* 3. Session Grid */}
                <div className="session-grid-container">
                    <h2 className="section-title">세션 현황</h2>
                    <div className="session-grid-layout">
                        {displaySessions.map((session, index) => {
                            const isPlaceholder = session.is_placeholder;
                            const isOccupied = !isPlaceholder && !!session.participant_nickname;
                            const instrumentImg = !isPlaceholder ? getInstrumentImage(session.session_name) : null;

                            // Color Filter Logic
                            let colorClass = 'filter-gray';
                            if (isOccupied) {
                                if (index % 2 === 0) { // 1st, 3rd, 5th (Indices 0, 2, 4) -> Sky
                                    colorClass = 'filter-sky';
                                } else { // 2nd, 4th, 6th (Indices 1, 3, 5) -> Deep
                                    colorClass = 'filter-deep';
                                }
                            }

                            const hasReservation = session.reservations && session.reservations.length > 0;

                            return (
                                <div
                                    key={session.id}
                                    className={`session-card ${isOccupied ? 'occupied' : 'empty'}`}
                                    onClick={() => handleSessionClick(session)}
                                >
                                    {/* Image Layer */}
                                    <div className="session-icon-container">
                                        {instrumentImg ? (
                                            <img
                                                src={instrumentImg}
                                                alt={session.session_name}
                                                className={`session-img ${colorClass}`}
                                            />
                                        ) : (
                                            <div className="session-icon-placeholder"></div>
                                        )}
                                    </div>

                                    {/* Text Overlay Layer */}
                                    <div
                                        className="session-role"
                                        style={{ bottom: hasReservation ? '48px' : '25px', transition: 'bottom 0.2s' }}
                                    >
                                        {!isPlaceholder ? session.session_name : ''}
                                    </div>

                                    {/* Reservation Info (Orange) */}
                                    {hasReservation && (
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReservationList(session.reservations.map(r => ({
                                                    nickname: r.user.nickname,
                                                    date: r.created_at
                                                })));
                                                setTargetSessionName(session.session_name);
                                                setShowReservationModal(true);
                                            }}
                                            style={{
                                                position: 'absolute',
                                                bottom: isOccupied ? '28px' : '10px',
                                                right: '8px',
                                                zIndex: 3,
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                color: '#f97316',
                                                textShadow: '0 0 2px rgba(255, 255, 255, 0.8)',
                                                textAlign: 'right',
                                                cursor: 'pointer',
                                                textDecoration: 'underline'
                                            }}
                                        >
                                            예약 명단
                                        </div>
                                    )}

                                    {/* Footer Overlay Layer (User Info) */}
                                    {isOccupied && (
                                        <div
                                            className="session-footer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (user && session.participant_nickname === user.nickname) {
                                                    navigate('/profile');
                                                } else {
                                                    navigate(`/profile/${session.participant_nickname}`);
                                                }
                                            }}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div
                                                className="user-icon-small"
                                                style={{
                                                    backgroundImage: `url(${session.participant_profile_image
                                                        ? (session.participant_profile_image.startsWith("http")
                                                            ? session.participant_profile_image
                                                            : API_BASE_SERVER + session.participant_profile_image)
                                                        : defaultProfileImg
                                                        })`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center',
                                                    backgroundColor: '#eee'
                                                }}
                                            ></div>
                                            <span>{session.participant_nickname}</span>
                                        </div>
                                    )}

                                    {/* Minus Button (Kick) - Only for Owner, and not for self */}
                                    {isOwner && isOccupied && session.participant_nickname !== user.nickname && (
                                        <div className="btn-minus" onClick={(e) => handleKickClick(e, session)}>
                                            <div className="minus-icon-line"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 4. Additional Features (Horizontal) */}
                <div className="features-section">
                    <h2 className="section-title" style={{ fontSize: '16px' }}>추가 기능</h2>

                    <div className="feature-row">
                        <span className="feature-label">합주 일정 조율</span>
                        <div className="feature-pill-btn btn-schedule" onClick={handleScheduleClick}>캘린더 보러가기</div>
                    </div>

                    <div className="feature-row">
                        <span className="feature-label">합주실 예약</span>
                        <div className="feature-pill-btn" onClick={handleNotReadyClick}>합주실 보러가기</div>
                    </div>

                    <div className="feature-row">
                        <span className="feature-label">밴디콘 정기공연</span>
                        <div className="feature-pill-btn" onClick={handleNotReadyClick}>밴디콘서트 신청하기</div>
                    </div>
                </div>

                {/* Bottom Navigation */}

                {/* Custom Popups */}
                {showFullSessionWarning && (
                    <div className="custom-modal-overlay" onClick={() => setShowFullSessionWarning(false)}>
                        <div className="room-warning-popup" onClick={e => e.stopPropagation()}>
                            <div className="warning-text">모든 세션이 차야 방을 확정할 수 있습니다.</div>
                        </div>
                    </div>
                )}

                {showConfirmModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowConfirmModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                방을 확정하시겠습니까?{"\n"}(방을 확정한 이후에는 되돌릴 수 없습니다)
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowConfirmModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={performRoomConfirm}>
                                    확정
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showJoinModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowJoinModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                세션에 참여하시겠습니까?
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowJoinModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={executeSessionAction}>
                                    참여
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showLeaveModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowLeaveModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                세션 참여를 취소하시겠습니까?
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowLeaveModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={executeSessionAction} style={{ backgroundColor: '#ef4444' }}>
                                    나가기
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showNotReadyModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowNotReadyModal(false)}>
                        <div className="room-warning-popup" onClick={e => e.stopPropagation()}>
                            <div className="warning-text">해당 기능은 아직 오픈되지 않았습니다.</div>
                        </div>
                    </div>
                )}

                {showScheduleWarning && (
                    <div className="custom-modal-overlay" onClick={() => setShowScheduleWarning(false)}>
                        <div className="room-warning-popup" onClick={e => e.stopPropagation()}>
                            <div className="warning-text">방을 확정하신 후 사용하실 수 있는 기능입니다.</div>
                        </div>
                    </div>
                )}

                {showPermissionWarning && (
                    <div className="custom-modal-overlay" onClick={() => setShowPermissionWarning(false)}>
                        <div className="room-warning-popup" onClick={e => e.stopPropagation()}>
                            <div className="warning-text">방은 방장만 확정할 수 있습니다.</div>
                        </div>
                    </div>
                )}

                {/* Kick Modal */}
                {showKickModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowKickModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                정말로 강퇴하시겠습니까?
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowKickModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={performKick} style={{ backgroundColor: '#ef4444' }}>
                                    강퇴
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Room Modal */}
                {showDeleteModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowDeleteModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                정말로 방을 삭제하시겠습니까?
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowDeleteModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={performDeleteRoom} style={{ backgroundColor: '#ef4444' }}>
                                    삭제
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* End Practice Modal */}
                {showEndModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowEndModal(false)}>
                        <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                            <div className="confirm-text">
                                정말로 합주를 종료하시겠습니까?{"\n"}(종료 후엔 방이 사라집니다)
                            </div>
                            <div className="confirm-actions">
                                <div className="confirm-btn-cancel" onClick={() => setShowEndModal(false)}>
                                    취소
                                </div>
                                <div className="confirm-btn-ok" onClick={performEndPractice} style={{ backgroundColor: '#ef4444' }}>
                                    종료
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Bottom Button (Only for owner) */}
                {isOwner && (
                    <div className="floating-bottom-btn-container">
                        {room.confirmed ? (
                            <button className="btn-end-practice" onClick={() => setShowEndModal(true)}>
                                합주 종료
                            </button>
                        ) : (
                            <button className="btn-delete-room" onClick={() => setShowDeleteModal(true)}>
                                방 삭제
                            </button>
                        )}
                    </div>
                )}

                {/* Reservation List Modal */}
                {showReservationModal && (
                    <div className="custom-modal-overlay" onClick={() => setShowReservationModal(false)}>
                        <div
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: '300px',
                                padding: '20px',
                                background: 'white',
                                borderRadius: '24px',
                                border: '2px solid #f97316', // Orange Border
                                position: 'relative',
                                boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}
                        >
                            {/* Close Button (X) */}
                            <div
                                onClick={() => setShowReservationModal(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    cursor: 'pointer',
                                    color: '#64748b'
                                }}
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </div>

                            {/* Title */}
                            <div style={{
                                fontSize: '18px',
                                fontWeight: '700',
                                color: '#0f172a',
                                marginBottom: '24px',
                                marginTop: '4px',
                                textAlign: 'left',
                                paddingRight: '20px'
                            }}>
                                {targetSessionName} 예약 대기 명단
                            </div>

                            {/* List */}
                            <div style={{
                                maxHeight: '250px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px'
                            }}>
                                {reservationList.map((item, idx) => {
                                    // Date Formatting: 2026. 1. 26.
                                    const dateObj = new Date(item.date);
                                    const formattedDate = `${dateObj.getFullYear()}. ${dateObj.getMonth() + 1}. ${dateObj.getDate()}.`;

                                    return (
                                        <div key={idx} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: '15px',
                                            color: '#334155'
                                        }}>
                                            <div style={{ fontWeight: '500', color: '#0f172a' }}>{item.nickname}</div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{formattedDate}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div >
            <BottomNav />
        </MobileLayout >
    );
}

export default RoomDetail;