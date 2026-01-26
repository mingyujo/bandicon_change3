// frontend/src/features/clan/ClanRoomListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { apiGet, apiPost, API_BASE_SERVER } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import '../rooms/RoomList.css'; // Reuse RoomList styles

const ClanRoomListPage = ({ user }) => {
    const [rooms, setRooms] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [selectedRole, setSelectedRole] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // View View Toggle (Board vs Table) - Visual for now
    const [viewMode, setViewMode] = useState('board'); // 'board' or 'table'

    // Password Modal
    const [passwordModal, setPasswordModal] = useState({ isOpen: false, roomId: null, title: '' });
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState(null);
    const [pendingAction, setPendingAction] = useState(null);

    // Reservation Modal
    const [reservationModal, setReservationModal] = useState({ isOpen: false, sessionName: '', reservations: [] });

    // Confirm Modals
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [targetAction, setTargetAction] = useState(null);

    const navigate = useNavigate();
    const { showAlert } = useAlert();
    const { clanId } = useParams();
    const [currentUser, setCurrentUser] = useState(user || JSON.parse(localStorage.getItem('bandicon_user')) || {});

    // Sync User
    useEffect(() => {
        const fetchMe = async () => {
            try {
                const userData = await apiGet('/users/me/');
                if (userData) {
                    setCurrentUser(userData);
                    localStorage.setItem('bandicon_user', JSON.stringify(userData));
                }
            } catch (err) { }
        };
        fetchMe();
    }, []);

    // Fetch Rooms
    const fetchRooms = useCallback(async (currentSearch, currentSortBy, currentRole) => {
        try {
            let url = `/clans/${clanId}/rooms/?search=${encodeURIComponent(currentSearch)}&sort=${currentSortBy}`;
            if (currentRole) {
                url += `&required_session=${encodeURIComponent(currentRole)}`;
            }
            const data = await apiGet(url);
            setRooms(data.school_rooms || data || []); // Adapt if response structure varies
        } catch (error) {
            console.error("클랜 방 목록 불러오기 실패:", error);
        }
    }, [clanId]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchRooms(searchTerm, sortBy, selectedRole);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, sortBy, selectedRole, fetchRooms]);

    // Handlers
    const handleJoinSession = (e, roomId, sessionId) => {
        e.stopPropagation();
        // Here we could just navigate or set modal
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
            setTimeout(() => {
                navigate(`/rooms/${passwordModal.roomId}`);
                closePasswordModal();
            }, 500);
        } catch (err) {
            setPasswordFeedback('wrong');
            setTimeout(() => setPasswordFeedback(null), 1500);
        }
    };

    const closePasswordModal = () => {
        setPasswordModal({ isOpen: false, roomId: null, title: '' });
        setPasswordInput('');
        setPasswordFeedback(null);
    };

    const handleSessionActionClick = (e, roomId, sessionId, participantNickname) => {
        e.stopPropagation();
        if (!participantNickname) {
            setTargetAction({ roomId, sessionId, type: 'join' });
            setShowJoinModal(true);
        } else {
            setTargetAction({ roomId, sessionId, type: 'leave' });
            setShowLeaveModal(true);
        }
    };

    const executeTargetAction = async () => {
        if (!targetAction) return;
        const { roomId, sessionId } = targetAction;
        try {
            await apiPost(`/rooms/${roomId}/sessions/${sessionId}/join/`, {});
            showAlert(targetAction.type === 'join' ? "참여가 완료되었습니다." : "참여가 취소되었습니다.", "success");
            fetchRooms(searchTerm, sortBy, selectedRole);
        } catch (err) {
            showAlert(err.response?.data?.detail || "작업 실패", "error");
        } finally {
            setShowJoinModal(false);
            setShowLeaveModal(false);
            setTargetAction(null);
        }
    };

    const [isTableExpanded, setIsTableExpanded] = useState(false);

    // --- Helper for Table View ---
    const getSessionStatus = (room, instrumentName) => {
        const sessions = room.sessions.filter(s => s.session_name === instrumentName);

        if (sessions.length === 0) return <span style={{ color: '#cbd5e1' }}>X</span>;

        const total = sessions.length;
        const filled = sessions.filter(s => s.participant_nickname).length;
        const text = `${filled}/${total}`;

        return <span style={{
            color: filled === total ? '#cbd5e1' : '#0f172a',
            fontWeight: filled === total ? '400' : '600'
        }}>{text}</span>;
    };

    const renderTableView = () => {
        if (rooms.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                    생성된 합주방이 없습니다.
                </div>
            );
        }

        // 1. All available session names from current rooms
        const allSessionNames = new Set();
        rooms.forEach(r => r.sessions?.forEach(s => allSessionNames.add(s.session_name)));

        // 2. Define standard and custom columns
        const standardOrder = ['보컬', '리드기타', '리듬기타', '베이스', '드럼', '키보드'];

        // Filter standard columns that actually exist in the data (optional: or always show them?)
        // Let's show them if they exist in standardOrder, but maybe we want to force show them even if empty?
        // User said "Start with Vocal... Keyboard". Let's stick to showing what's available but sorted.
        // Actually, user implies a fixed structure. Let's try to show standard columns + custom.

        const availableStandard = standardOrder.filter(name => allSessionNames.has(name));
        const customColumns = Array.from(allSessionNames).filter(name => !standardOrder.includes(name)).sort();

        // If not expanded, only show standard. If expanded, show all.
        const visibleColumns = isTableExpanded
            ? [...standardOrder.filter(name => allSessionNames.has(name) || standardOrder.includes(name)), ...customColumns]
            // If we want to show ALL standard columns even if empty, use standardOrder directly.
            // But getting session status for non-existent session returns "X", which is fine.
            // Let's use `standardOrder` as the base for the first part to ensure strict order.
            : standardOrder;

        // Refined Logic based on "Expand" requirement:
        // "Basic: Vocal... Keyboard"
        // "Expand: Add custom sessions to the right"

        // Final columns to render
        const columnsToRender = isTableExpanded
            ? [...standardOrder, ...customColumns] // Show all standard (even if empty in current rooms, for consistency) + custom
            : standardOrder;

        return (
            <div className="table-view-wrapper" style={{ marginTop: '10px' }}>
                {customColumns.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                        <button
                            onClick={() => setIsTableExpanded(!isTableExpanded)}
                            style={{
                                background: '#f1f5f9', border: 'none', borderRadius: '4px',
                                padding: '4px 8px', fontSize: '11px', color: '#64748b', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            {isTableExpanded ? '접기' : '펼쳐보기'}
                        </button>
                    </div>
                )}

                <div className="table-view-container" style={{
                    overflowX: isTableExpanded ? 'auto' : 'hidden', // Scroll only when expanded
                    background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0'
                }}>
                    <table style={{ width: isTableExpanded ? 'max-content' : '100%', borderCollapse: 'collapse', fontSize: '12px', minWidth: '100%' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', height: '32px' }}>
                                <th style={{ padding: '0 8px', textAlign: 'left', minWidth: isTableExpanded ? '180px' : '120px', color: '#0f172a', fontWeight: '600', position: 'sticky', left: 0, background: '#f8fafc', zIndex: 1 }}>제목 및 아티스트</th>
                                {columnsToRender.map(col => (
                                    <th key={col} style={{ padding: '0 2px', textAlign: 'center', minWidth: '35px', borderLeft: '1px solid #f1f5f9', color: '#0f172a', fontWeight: '600' }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map(room => (
                                <tr key={room.id} onClick={() => handleRoomClick(room)} style={{ borderBottom: '1px solid #f1f5f9', height: '44px', cursor: 'pointer' }}>
                                    <td style={{ padding: '4px 8px', position: 'sticky', left: 0, background: 'white', zIndex: 1 }}>
                                        <div style={{ fontWeight: '600', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isTableExpanded ? '180px' : '120px' }}>
                                            {room.title}
                                        </div>
                                        <div style={{ color: '#64748b', fontSize: '10px' }}>
                                            {room.artist}
                                        </div>
                                    </td>
                                    {columnsToRender.map(col => (
                                        <td key={col} style={{ textAlign: 'center', borderLeft: '1px solid #f1f5f9' }}>
                                            {getSessionStatus(room, col)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- UI Render ---
    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            {/* Sub Header */}
            <div style={{
                position: 'sticky', top: '50px', zIndex: 40,
                background: 'white', borderBottom: '1px solid #eee',
                padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>클랜 합주방</h2>
                </div>
                <Link to="/create-room" state={{ clanId }} style={{
                    backgroundColor: '#0ea5e9', color: 'white', padding: '6px 12px',
                    borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none'
                }}>
                    방 생성
                </Link>
            </div>

            <div className="room-list-container" style={{ paddingTop: '10px' }}>
                <div className="room-controls">
                    <div className="search-bar-wrapper" style={{ flex: 1 }}>
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

                    {/* View Toggle & Sort (Width reduced to 100px) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', marginLeft: '12px' }}>
                        {/* Toggle Switch */}
                        <div style={{
                            display: 'flex', background: '#f8fafc', borderRadius: '6px', padding: '2px',
                            border: '1px solid #e2e8f0', width: '100px', justifyContent: 'space-between'
                        }}>
                            <div
                                onClick={() => setViewMode('board')}
                                style={{
                                    flex: 1, textAlign: 'center', fontSize: '11px', padding: '3px 0', cursor: 'pointer', borderRadius: '4px',
                                    background: viewMode === 'board' ? '#0ea5e9' : 'transparent',
                                    color: viewMode === 'board' ? 'white' : '#64748b',
                                    fontWeight: viewMode === 'board' ? '600' : '500',
                                    transition: 'all 0.2s'
                                }}>보드</div>
                            <div
                                onClick={() => setViewMode('table')}
                                style={{
                                    flex: 1, textAlign: 'center', fontSize: '11px', padding: '3px 0', cursor: 'pointer', borderRadius: '4px',
                                    background: viewMode === 'table' ? '#0ea5e9' : 'transparent',
                                    color: viewMode === 'table' ? 'white' : '#64748b',
                                    fontWeight: viewMode === 'table' ? '600' : '500',
                                    transition: 'all 0.2s'
                                }}>테이블</div>
                        </div>

                        {/* Sort Dropdown */}
                        <div className="filter-wrapper" style={{ margin: 0, width: '100px' }}>
                            <button
                                className="filter-btn"
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                style={{
                                    width: '100%', height: '30px', padding: '0 8px', fontSize: '11px',
                                    justifyContent: 'space-between', borderRadius: '6px',
                                    borderColor: '#e2e8f0', display: 'flex', alignItems: 'center'
                                }}
                            >
                                <span>
                                    {selectedRole ? selectedRole :
                                        sortBy === 'latest' ? '최신순' :
                                            sortBy === 'empty_desc' ? '빈 세션 (많)' :
                                                sortBy === 'empty_asc' ? '빈 세션 (적)' :
                                                    '오래된순'
                                    }
                                </span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                            </button>

                            {isFilterOpen && (
                                <div className="filter-popup-ui" style={{ top: '100%', right: 0, width: '100%', zIndex: 100 }}>
                                    <div className="filter-dropdown-content">
                                        <div className="filter-item" onClick={() => { setSortBy('latest'); setSelectedRole(''); setIsFilterOpen(false); }}>최신순</div>
                                        <div className="filter-divider"></div>
                                        <div className="filter-item" onClick={() => { setSortBy('empty_desc'); setSelectedRole(''); setIsFilterOpen(false); }}>빈세션 (많)</div>
                                        <div className="filter-item" onClick={() => { setSortBy('empty_asc'); setSelectedRole(''); setIsFilterOpen(false); }}>빈세션 (적)</div>
                                        <div className="filter-divider"></div>
                                        <div className={`filter-item ${selectedRole === '보컬' ? 'active' : ''}`} onClick={() => { setSelectedRole('보컬'); setIsFilterOpen(false); }}>보컬</div>
                                        <div className={`filter-item ${selectedRole === '기타' ? 'active' : ''}`} onClick={() => { setSelectedRole('기타'); setIsFilterOpen(false); }}>기타</div>
                                        <div className={`filter-item ${selectedRole === '베이스' ? 'active' : ''}`} onClick={() => { setSelectedRole('베이스'); setIsFilterOpen(false); }}>베이스</div>
                                        <div className={`filter-item ${selectedRole === '키보드' ? 'active' : ''}`} onClick={() => { setSelectedRole('키보드'); setIsFilterOpen(false); }}>키보드</div>
                                        <div className={`filter-item ${selectedRole === '드럼' ? 'active' : ''}`} onClick={() => { setSelectedRole('드럼'); setIsFilterOpen(false); }}>드럼</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Conditional Rendering */}
                {viewMode === 'table' ? renderTableView() : (
                    rooms.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#999', fontSize: '14px' }}>
                            생성된 합주방이 없습니다.
                        </div>
                    ) : (
                        rooms.map(room => (
                            <div key={room.id} className="room-card" onClick={() => handleRoomClick(room)} style={{ cursor: 'pointer' }}>
                                {/* Reuse exact Room Card Layout */}
                                <div className="room-header-section">
                                    {/* [추가] 룸 리스트에서도 썸네일 표시 */}
                                    {/* Style consistent with RoomList but using inline styles from ClanRoomListPage usually? */}
                                    {/* Using same style classes since RoomList.css is imported */}
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
                                            {room.is_private && <span style={{ marginRight: 4 }}>🔒</span>}
                                            <span className="room-title">{room.title}</span>
                                        </div>
                                        <div className="room-song-info">
                                            {room.artist && room.song ? `${room.artist} - ${room.song}` : room.song}
                                        </div>
                                    </div>
                                </div>
                                <div className="room-divider"></div>
                                <div className="session-grid">
                                    {room.sessions?.map(session => (
                                        <div key={session.id} className="session-slot">
                                            <div className="instrument-label">{session.session_name}</div>
                                            <div className="member-info-row">
                                                {session.participant_nickname ? (
                                                    <div style={{ width: '100%' }}>
                                                        <span className="participant-name">{session.participant_nickname}</span>
                                                        {(session.participant_nickname === currentUser.nickname) ? (
                                                            <button className="slot-action-btn btn-cancel" onClick={(e) => handleSessionActionClick(e, room.id, session.id, session.participant_nickname)}>
                                                                참여 취소
                                                            </button>
                                                        ) : (
                                                            <button className="slot-action-btn" style={{ background: '#f1f5f9', color: '#999', cursor: 'default' }}>참여중</button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div style={{ width: '100%' }}>
                                                        <span className="participant-name empty">공석</span>
                                                        <button className="slot-action-btn btn-participate" onClick={(e) => handleSessionActionClick(e, room.id, session.id, null)}>
                                                            참여
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )
                )}
            </div>

            {/* Modals - Reuse exact structure */}
            {passwordModal.isOpen && (
                <div className="password-modal-overlay">
                    <div className="password-modal-box">
                        <div className="password-modal-title">비밀번호 입력</div>
                        <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="password-input" />
                        <button onClick={submitPassword} className="password-submit-btn">확인</button>
                        <button onClick={closePasswordModal} className="password-close-btn">✕</button>
                    </div>
                </div>
            )}

            {showJoinModal && (
                <div className="custom-modal-overlay" onClick={() => setShowJoinModal(false)}>
                    <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                        <div className="confirm-text">참여하시겠습니까?</div>
                        <div className="confirm-actions">
                            <div className="confirm-btn-cancel" onClick={() => setShowJoinModal(false)}>취소</div>
                            <div className="confirm-btn-ok" onClick={executeTargetAction}>참여</div>
                        </div>
                    </div>
                </div>
            )}
            {showLeaveModal && (
                <div className="custom-modal-overlay" onClick={() => setShowLeaveModal(false)}>
                    <div className="room-confirm-popup" onClick={e => e.stopPropagation()}>
                        <div className="confirm-text">취소하시겠습니까?</div>
                        <div className="confirm-actions">
                            <div className="confirm-btn-cancel" onClick={() => setShowLeaveModal(false)}>아니오</div>
                            <div className="confirm-btn-ok" onClick={executeTargetAction} style={{ background: '#ef4444' }}>네</div>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </MobileLayout>
    );
};

export default ClanRoomListPage;