import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost, API_BASE_SERVER } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './RoomList.css';

const RoomList = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [selectedRole, setSelectedRole] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Password Modal State
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, roomId: null, title: '' });
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState(null); // 'correct' | 'wrong' | null
    const [reservationModal, setReservationModal] = useState({ isOpen: false, sessionName: '', reservations: [] });
    const [pendingAction, setPendingAction] = useState(null); // { func: async () => {} }

    // Custom Confirmation Modals for RoomList
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [targetAction, setTargetAction] = useState(null); // { roomId, sessionId, type: 'join' | 'leave' }

    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('user')) || {});

    useEffect(() => {
        // Fetch fresh user data to ensure nickname comparison is accurate
        const fetchMe = async () => {
            try {
                const userData = await apiGet('/users/me/');
                if (userData) {
                    setCurrentUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData)); // Sync local storage
                }
            } catch (err) {
                console.error("Failed to fetch user", err);
            }
        };
        fetchMe();
    }, []);

    const fetchRooms = useCallback(async (currentSearch, currentSortBy, currentRole) => {
        try {
            let url = `/rooms/?search=${encodeURIComponent(currentSearch)}&sort=${currentSortBy}`;
            if (currentRole) {
                url += `&required_session=${encodeURIComponent(currentRole)}`;
            }
            const data = await apiGet(url);
            setRooms(data || []);
        } catch (error) {
            console.error("방 목록 불러오기 실패:", error);
        }
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchRooms(searchTerm, sortBy, selectedRole);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, sortBy, selectedRole, fetchRooms]);

    // Handlers
    const handleJoinSession = (e, roomId, sessionId) => {
        e.stopPropagation();
        navigate(`/rooms/${roomId}`); // Currently navigation, but should probably be direct join if buttons are present
        // However, standard flow might be: Click Join -> API Call -> Refresh.
        // If user wants buttons, we might need simple API calls here or Navigate.
        // Given the image, "참여" implies direct action. But for now let's keep navigation or restore API logic if confirmed.
        // Actually, previous implementation called API? No, previously it navigated.
        // If visuals show buttons, they likely expect functionality. 
        // But to be safe and quick, let's make buttons navigate to Detail or implement basic Join?
        // Let's implement basic navigation for now to match visual, but buttons need to be there.
        // Wait, if I click "참여", it should probably participate.
        // Ref image shows buttons. I will add buttons to UI. 
    };

    const handleSortToggle = () => {
        setIsFilterOpen(!isFilterOpen);
    };

    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        setSelectedRole('');
        setIsFilterOpen(false);
    };

    const handleRoleChange = (role) => {
        if (selectedRole === role) setSelectedRole(''); // Toggle off
        else setSelectedRole(role);
        setIsFilterOpen(false);
    };

    const handleRoomClick = (room) => {
        if (room.is_private) {
            setPasswordModal({ isOpen: true, roomId: room.id, title: room.title });
            setPasswordInput('');
            setPasswordFeedback(null);
        } else {
            navigate(`/rooms/${room.id}`);
        }
    };

    const submitPassword = async () => {
        if (!passwordInput) return;
        try {
            await apiPost(`/rooms/${passwordModal.roomId}/verify_password/`, { password: passwordInput });
            setPasswordFeedback('correct');

            if (pendingAction) {
                // If there was a pending action (Participate/Reserve), modify logic to run it
                setTimeout(async () => {
                    closePasswordModal();
                    await pendingAction.func();
                    setPendingAction(null); // Clear
                }, 1000);
            } else {
                // Default: Navigate to room details
                setTimeout(() => {
                    navigate(`/rooms/${passwordModal.roomId}`);
                    closePasswordModal();
                }, 1000);
            }
        } catch (err) {
            setPasswordFeedback('wrong');
            console.error(err);
            setTimeout(() => {
                setPasswordFeedback(null);
            }, 1500);
        }
    };

    const closePasswordModal = () => {
        setPasswordModal({ isOpen: false, roomId: null, title: '' });
        setPasswordInput('');
        setPasswordFeedback(null);
        setPendingAction(null);
    };

    const executeOrVerify = async (e, room, actionFunc) => {
        e.stopPropagation();
        if (room.is_private) {
            setPasswordModal({ isOpen: true, roomId: room.id, title: room.title });
            setPendingAction({ func: actionFunc });
        } else {
            await actionFunc();
        }
    };

    const openReservationModal = (e, sessionName, reservations) => {
        e.stopPropagation();
        setReservationModal({ isOpen: true, sessionName, reservations });
    };

    const closeReservationModal = () => {
        setReservationModal({ isOpen: false, sessionName: '', reservations: [] });
    };

    // Existing Session Helper Logic (kept for inline actions if needed, though card click navigates)
    // Note: User design implies clicking the room card opens details (or password check)
    // But the current UI also has "Participate" buttons directly on the card.
    // We should preserve those buttons but ensure clicking the CARD body also works?
    // For now, let's keep the existing buttons working as shortcuts, but clicking the title/header navigates.

    // ... (Keep handleLeaveSession etc if needed, but adapt for click propagation)

    // Action Logic
    const handleSessionActionClick = (e, roomId, sessionId, participantNickname) => {
        e.stopPropagation();
        if (!participantNickname) {
            // Empty -> Join
            setTargetAction({ roomId, sessionId, type: 'join' });
            setShowJoinModal(true);
        } else {
            // Occupied (by me) -> Leave
            setTargetAction({ roomId, sessionId, type: 'leave' });
            setShowLeaveModal(true);
        }
    };

    const executeTargetAction = async () => {
        if (!targetAction) return;
        const { roomId, sessionId } = targetAction;
        try {
            // Both join and leave use the same endpoint (toggle/join logic)
            // But confirming my backend logic: 
            // RoomSessionJoinView toggles if already joined, or joins if empty. Perfect.
            await apiPost(`/rooms/${roomId}/sessions/${sessionId}/join/`, {});

            if (targetAction.type === 'join') {
                showAlert("참여가 완료되었습니다.", "success");
            } else {
                showAlert("참여가 취소되었습니다.", "success");
            }
            fetchRooms(searchTerm, sortBy, selectedRole);
        } catch (err) {
            showAlert(err.response?.data?.detail || "작업 실패", "error");
        } finally {
            setShowJoinModal(false);
            setShowLeaveModal(false);
            setTargetAction(null);
        }
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <div className="room-list-header">
                <h2 className="room-page-title">자유 합주방</h2>
                <button className="btn-create-room" onClick={() => navigate('/create-room')}>방 생성</button>
            </div>

            <div className="room-list-container">
                <div className="room-controls">
                    <div className="search-bar-wrapper">
                        {/* Search Icon */}
                        <div className="search-icon-wrapper">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="방 제목, 곡명, 아티스트명으로 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Custom Filter Dropdown */}
                    <div className="filter-wrapper">
                        <button className="filter-btn" onClick={handleSortToggle}>
                            {selectedRole ? selectedRole :
                                sortBy === 'latest' ? '최신순' :
                                    sortBy === 'empty_desc' ? '빈 세션 (많)' :
                                        sortBy === 'empty_asc' ? '빈 세션 (적)' :
                                            '오래된순'
                            }
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '4px' }}><path d="M6 9l6 6 6-6" /></svg>
                        </button>

                        {isFilterOpen && (
                            <div className="filter-popup-ui">
                                <div className="filter-dropdown-content">
                                    <div className="filter-item" onClick={() => handleSortChange('latest')}>최신순</div>
                                    <div className="filter-divider"></div>
                                    <div className="filter-item" onClick={() => handleSortChange('empty_desc')}>빈세션 (많)</div>
                                    <div className="filter-item" onClick={() => handleSortChange('empty_asc')}>빈세션 (적)</div>
                                    <div className="filter-divider"></div>
                                    <div className={`filter-item ${selectedRole === '보컬' ? 'active' : ''}`} onClick={() => handleRoleChange('보컬')}>보컬</div>
                                    <div className={`filter-item ${selectedRole === '기타' ? 'active' : ''}`} onClick={() => handleRoleChange('기타')}>기타</div>
                                    <div className={`filter-item ${selectedRole === '베이스' ? 'active' : ''}`} onClick={() => handleRoleChange('베이스')}>베이스</div>
                                    <div className={`filter-item ${selectedRole === '키보드' ? 'active' : ''}`} onClick={() => handleRoleChange('키보드')}>키보드</div>
                                    <div className={`filter-item ${selectedRole === '드럼' ? 'active' : ''}`} onClick={() => handleRoleChange('드럼')}>드럼</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {rooms.map(room => (
                    <div key={room.id} className="room-card" onClick={() => handleRoomClick(room)} style={{ cursor: 'pointer' }}>
                        <div className="room-header-section">
                            {/* [추가] 룸 리스트에서도 썸네일 표시 */}
                            <div
                                className="room-list-thumbnail"
                                style={{
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '50%', // Circle
                                    backgroundColor: '#e2e8f0', // gray-200
                                    backgroundImage: room.image ? `url(${(room.image.startsWith('http') ? room.image : API_BASE_SERVER + room.image)}?t=${new Date().getTime()})` : undefined,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    marginRight: '12px',
                                    flexShrink: 0,
                                    border: '1px solid #eee'
                                }}
                            ></div>
                            <div className="room-title-section" style={{ flex: 1 }}>
                                <div className="room-title-row">
                                    {room.is_private && (
                                        <svg className="lock-svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                        </svg>
                                    )}
                                    <span className="room-title">{room.title}</span>
                                </div>
                                <div className="room-song-info">
                                    {room.artist && room.song ? `${room.artist} - ${room.song}` : room.song || room.artist || '곡 정보 없음'}
                                </div>
                            </div>
                        </div>

                        <div className="room-divider"></div>

                        <div className="session-grid">
                            {/* Reverted to Dynamic Layout as per user request */}
                            {room.sessions?.map(session => (
                                session && (
                                    <div key={session.id} className="session-slot">
                                        <div className="instrument-label">
                                            {session.session_name}
                                        </div>
                                        {/* Status / Buttons Logic */}
                                        {/* Status / Buttons Logic - Instant Action Implementation */}
                                        <div className="member-info-row">
                                            {session.participant_nickname ? (
                                                <div style={{ width: '100%' }}>
                                                    <span className="participant-name">
                                                        {session.participant_nickname}
                                                        {session.reservations && session.reservations.length > 0 && (
                                                            <span
                                                                className="reservation-text clickable"
                                                                onClick={(e) => openReservationModal(e, session.session_name, session.reservations)}
                                                            >
                                                                (예약 {session.reservations.length}명)
                                                            </span>
                                                        )}
                                                    </span>
                                                    {session.participant_nickname === currentUser.nickname || (session.participant_nickname && currentUser.nickname && session.participant_nickname.trim() === currentUser.nickname.trim()) ? (
                                                        <button
                                                            className="slot-action-btn btn-cancel"
                                                            onClick={(e) => handleSessionActionClick(e, room.id, session.id, session.participant_nickname)}
                                                        >
                                                            참여 취소
                                                        </button>
                                                    ) : (
                                                        /* Check if I reserved */
                                                        session.reservations && session.reservations.some(r => r.user.nickname === currentUser.nickname || (r.user.nickname && currentUser.nickname && r.user.nickname.trim() === currentUser.nickname.trim())) ? (
                                                            <button
                                                                className="slot-action-btn btn-cancel-reservation"
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    if (!window.confirm("예약을 취소하시겠습니까?")) return;
                                                                    try {
                                                                        await apiPost(`/rooms/sessions/${session.id}/cancel-reserve/`, {});
                                                                        showAlert("예약이 취소되었습니다.", "success");
                                                                        fetchRooms(searchTerm, sortBy, selectedRole);
                                                                    } catch (err) {
                                                                        showAlert(err.response?.data?.detail || "취소 실패", "error");
                                                                    }
                                                                }}
                                                            >
                                                                예약 취소
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="slot-action-btn btn-reserve"
                                                                onClick={(e) => executeOrVerify(e, room, async () => {
                                                                    try {
                                                                        await apiPost(`/rooms/sessions/${session.id}/reserve/`, {});
                                                                        showAlert("예약되었습니다.", "success");
                                                                        fetchRooms(searchTerm, sortBy, selectedRole);
                                                                    } catch (err) {
                                                                        showAlert(err.response?.data?.detail || "예약 실패", "error");
                                                                    }
                                                                })}
                                                            >
                                                                예약
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ width: '100%' }}>
                                                    <span className="participant-name empty">
                                                        공석
                                                        {session.reservations && session.reservations.length > 0 && (
                                                            <span
                                                                className="reservation-text clickable"
                                                                onClick={(e) => openReservationModal(e, session.session_name, session.reservations)}
                                                            >
                                                                (예약 {session.reservations.length}명)
                                                            </span>
                                                        )}
                                                    </span>
                                                    <button
                                                        className="slot-action-btn btn-participate"
                                                        onClick={(e) => handleSessionActionClick(e, room.id, session.id, null)}
                                                    >
                                                        참여
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Password Modal Overlay */}
            {
                passwordModal.isOpen && (
                    <div className="password-modal-overlay">
                        <div className="password-modal-box">
                            <div className="password-modal-title">해당 방은 비밀방입니다</div>
                            <div className="password-input-wrapper">
                                <input
                                    type="password"
                                    className="password-input"
                                    placeholder="비밀번호를 입력하세요"
                                    autoFocus
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && submitPassword()}
                                />
                            </div>
                            <button
                                onClick={submitPassword}
                                className="password-submit-btn"
                            >
                                입력
                            </button>
                            <button onClick={closePasswordModal} className="password-close-btn">✕</button>
                        </div>
                    </div>
                )
            }

            {/* Feedback Popups */}
            {
                passwordFeedback === 'wrong' && (
                    <div className="feedback-popup feedback-error">
                        <div className="feedback-text">비밀번호가 다릅니다.</div>
                    </div>
                )
            }
            {
                passwordFeedback === 'correct' && (
                    <div className="feedback-popup feedback-success">
                        <div className="feedback-text">승인되었습니다.</div>
                    </div>
                )
            }

            {/* Reservation List Modal */}
            {
                reservationModal.isOpen && (
                    <div className="password-modal-overlay">
                        <div className="reservation-modal-box">
                            <div className="reservation-modal-title">
                                {reservationModal.sessionName} 예약 대기 명단
                            </div>
                            <button onClick={closeReservationModal} className="password-close-btn">✕</button>
                            <div className="reservation-list-container">
                                {reservationModal.reservations.map((res, index) => (
                                    <div key={index} className="reservation-item">
                                        <span className="reservation-user">{res.user.nickname}</span>
                                        <span className="reservation-time">{new Date(res.created_at).toLocaleDateString()}</span>
                                    </div>
                                ))}
                                {reservationModal.reservations.length === 0 && (
                                    <div className="reservation-empty">예약자가 없습니다.</div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Custom Join/Leave Modals */}
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
                            <div className="confirm-btn-ok" onClick={executeTargetAction}>
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
                            <div className="confirm-btn-ok" onClick={executeTargetAction} style={{ backgroundColor: '#ef4444' }}>
                                나가기
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </MobileLayout>
    );
};

export default RoomList;