import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/api';
import { useAlert } from '../../context/AlertContext';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';

import BottomNav from '../../components/BottomNav';
import ConfirmationModal from '../../components/ConfirmationModal';
import './ClanMemberListPage.css';

const ClanMemberListPage = () => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    // State
    const [clan, setClan] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // [New] State for managing which member's "Change" menu is open
    const [activeMenuMemberId, setActiveMenuMemberId] = useState(null);

    // [New] Detail Modal State
    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: null,
        isDanger: false,
        confirmText: '확인'
    });

    // Fetch user info
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('bandicon_user'));
        if (user) setCurrentUser(user);
    }, []);

    // Fetch Clan Data
    const fetchClanData = useCallback(async () => {
        try {
            const data = await apiGet(`/clans/${clanId}/`);
            setClan(data);
        } catch (error) {
            console.error("Failed to fetch clan data:", error);
            showAlert("클랜 정보를 불러오는데 실패했습니다.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [clanId, showAlert]);

    useEffect(() => {
        fetchClanData();
    }, [fetchClanData]);

    // [New] Expanded View State
    const [isExpanded, setIsExpanded] = useState(false);
    const [activityData, setActivityData] = useState([]);

    // Fetch Activity Data Handlers
    const fetchActivityData = useCallback(async () => {
        try {
            const data = await apiGet(`/clans/${clanId}/activity/`);
            setActivityData(data);
        } catch (error) {
            console.error("Failed to fetch activity data:", error);
            // Optionally show alert or just fail silently
        }
    }, [clanId]);

    const toggleExpand = () => {
        if (!isExpanded) {
            // Opening expanded view
            setIsExpanded(true);
            if (activityData.length === 0) {
                fetchActivityData();
            }
        } else {
            // Closing
            setIsExpanded(false);
        }
    };

    // ... existing derived state ...
    const isOwner = currentUser && clan?.owner?.id === currentUser.id;
    const isAdmin = isOwner || (currentUser && clan?.admins?.some(admin => admin.id === currentUser.id));

    const pendingRequests = clan?.join_requests || [];
    const members = clan?.members || [];

    // ... existing helpers ...
    const getMemberRole = (memberId) => {
        if (clan?.owner?.id === memberId) return 'OWNER';
        if (clan?.admins?.some(admin => admin.id === memberId)) return 'ADMIN';
        return 'MEMBER';
    };

    const getRoleText = (memberId) => {
        const role = getMemberRole(memberId);
        if (role === 'OWNER') return "클랜장";
        if (role === 'ADMIN') return "간부";
        return null; // 일반 멤버는 빈 문자열
    };

    // Filtered Members (Reuse for list, but Activity Data is separate)
    const filteredMembers = members.filter(member => {
        if (!searchTerm) return true;
        return member.nickname.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Sort members for regular list
    const sortedMembers = [...filteredMembers].sort((a, b) => {
        const roleA = getRoleText(a.id);
        const roleB = getRoleText(b.id);

        const getScore = (role) => {
            if (role === '클랜장') return 3;
            if (role === '간부') return 2;
            return 1;
        };

        return getScore(roleB) - getScore(roleA);
    });

    // Handlers
    const handleApproveAll = async () => {
        if (!window.confirm("모든 가입 신청을 수락하시겠습니까?")) return;
        try {
            await apiPost(`/clans/${clanId}/approve-all/`, {});
            showAlert("모든 신청이 수락되었습니다.", "success");
            fetchClanData();
        } catch (error) {
            showAlert("일괄 수락 실패: " + (error.response?.data?.detail || "오류"), "error");
        }
    };

    const handleRequestAction = async (reqId, action) => {
        try {
            await apiPost(`/clans/${clanId}/join-requests/${reqId}/`, { action });
            showAlert(action === 'approve' ? "승인되었습니다." : "거절되었습니다.", "success");
            fetchClanData();
        } catch (error) {
            showAlert("요청 처리 실패: " + (error.response?.data?.detail || "오류"), "error");
        }
    };

    // Role Management Handlers
    const toggleMenu = (memberId) => {
        if (activeMenuMemberId === memberId) {
            setActiveMenuMemberId(null);
        } else {
            setActiveMenuMemberId(memberId);
        }
    };

    const handlePromoteClick = (memberId, nickname) => {
        setModalConfig({
            isOpen: true,
            title: '간부 임명',
            message: `'${nickname}'님을 간부로 임명하시겠습니까?`,
            onConfirm: () => executePromote(memberId, nickname),
            isDanger: false,
            confirmText: '임명'
        });
    };

    const executePromote = async (memberId, nickname) => {
        try {
            await apiPost(`/clans/${clanId}/members/${memberId}/promote/`, {});
            showAlert(`'${nickname}'님이 간부로 임명되었습니다.`, "success");
            fetchClanData();
            setActiveMenuMemberId(null);
        } catch (error) {
            showAlert("승급 실패: " + (error.response?.data?.detail || "오류"), "error");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleDemoteClick = (memberId, nickname) => {
        setModalConfig({
            isOpen: true,
            title: '권한 해제',
            message: `'${nickname}'님의 간부 권한을 해제하시겠습니까?`,
            onConfirm: () => executeDemote(memberId, nickname),
            isDanger: true,
            confirmText: '해제'
        });
    };

    const executeDemote = async (memberId, nickname) => {
        try {
            await apiPost(`/clans/${clanId}/members/${memberId}/demote/`, {});
            showAlert(`'${nickname}'님의 권한이 해제되었습니다.`, "success");
            fetchClanData();
            setActiveMenuMemberId(null);
        } catch (error) {
            showAlert("강등 실패: " + (error.response?.data?.detail || "오류"), "error");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    const handleTransferClick = (memberId, nickname) => {
        setModalConfig({
            isOpen: true,
            title: '클랜장 위임',
            message: `정말 '${nickname}'님에게 클랜장을 위임하시겠습니까?\n\n위임 후 본인은 '간부' 등급으로 변경됩니다.\n이 작업은 되돌릴 수 없습니다.`,
            onConfirm: () => executeTransfer(memberId, nickname),
            isDanger: true,
            confirmText: '위임하기'
        });
    };

    const executeTransfer = async (memberId, nickname) => {
        try {
            await apiPost(`/clans/${clanId}/transfer-ownership/`, { target_user_id: memberId });
            showAlert(`클랜장이 '${nickname}'님에게 위임되었습니다.`, "success");
            fetchClanData();
            setActiveMenuMemberId(null);
        } catch (error) {
            showAlert("위임 실패: " + (error.response?.data?.detail || "오류"), "error");
        }
        setModalConfig(prev => ({ ...prev, isOpen: false }));
    };

    return (
        <MobileLayout>
            <GlobalHeader user={currentUser} />

            {/* Sub Header */}
            <div style={{
                position: 'sticky', top: '50px', zIndex: 40,
                background: 'white', borderBottom: '1px solid #eee',
                padding: '10px 20px', display: 'flex', alignItems: 'center', height: '50px'
            }}>
                <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 0 12px' }}>멤버 현황</h2>
            </div>

            <div className="member-list-container">
                {/* Search */}
                <div className="member-search-wrapper">
                    <svg className="member-search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        className="member-search-input"
                        placeholder="닉네임, 곡명, 아티스트로 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button
                        className={`btn-expand ${isExpanded ? 'active' : ''}`}
                        onClick={toggleExpand}
                    >
                        {isExpanded ? '접어두기' : '펼쳐보기'}
                    </button>
                </div>

                {/* Join Requests (Admin Only) */}
                {isAdmin && pendingRequests.length > 0 && (
                    <div className="join-requests-section">
                        <div className="join-requests-header">
                            <span className="join-requests-title">클랜 가입 신청</span>
                            <button className="btn-approve-all" onClick={handleApproveAll}>모두 수락</button>
                        </div>
                        <div>
                            {pendingRequests.map(req => (
                                <div key={req.id} className="join-request-item">
                                    <div className="requester-info">
                                        {req.user_nickname}
                                    </div>
                                    <div className="request-actions">
                                        <button className="btn-request-action btn-reject" onClick={() => handleRequestAction(req.id, 'reject')}>거절</button>
                                        <button className="btn-request-action btn-approve" onClick={() => handleRequestAction(req.id, 'approve')}>수락</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Member List or Activity Cards */}
                <div className={`member-list-section ${isExpanded ? 'expanded-view' : ''}`}>
                    {isExpanded ? (
                        // --- Expanded View (Activity Cards) ---
                        activityData.length > 0 ? (
                            <div className="activity-grid">
                                {activityData.map((data) => (
                                    <MemberActivityCard
                                        key={data.member.id}
                                        data={data}
                                        onReservationClick={(session) => showAlert(`'${session.title}' 예약 명단 확인 (준비중)`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="loading-msg">활동 정보를 불러오는 중...</div>
                        )
                    ) : (
                        // --- Standard List View ---
                        <>
                            {sortedMembers.map(member => {
                                const roleText = getRoleText(member.id);
                                const roleType = getMemberRole(member.id); // OWNER, ADMIN, MEMBER
                                const isTargetOwner = roleType === 'OWNER';
                                const showMenu = activeMenuMemberId === member.id;

                                return (
                                    <div key={member.id} className="member-list-item">
                                        <div className="member-info-left">
                                            <span className="member-nickname">{member.nickname}</span>
                                        </div>

                                        <div className="member-info-right">
                                            {/* Role Management Actions (Owner Only) */}
                                            {isOwner && !isTargetOwner && (
                                                <div className="member-actions-wrapper">
                                                    {/* CHANGE Button (Toggle) */}
                                                    {!showMenu ? (
                                                        <button
                                                            className="btn-role-change"
                                                            onClick={() => toggleMenu(member.id)}
                                                        >
                                                            변경
                                                        </button>
                                                    ) : (
                                                        <div className="role-menu-inline transition-enter">
                                                            {roleType === 'MEMBER' && (
                                                                <button
                                                                    className="btn-role-option btn-promote"
                                                                    onClick={() => handlePromoteClick(member.id, member.nickname)}
                                                                >
                                                                    승급
                                                                </button>
                                                            )}
                                                            {roleType === 'ADMIN' && (
                                                                <>
                                                                    <button
                                                                        className="btn-role-option btn-transfer"
                                                                        onClick={() => handleTransferClick(member.id, member.nickname)}
                                                                    >
                                                                        승급
                                                                    </button>
                                                                    <button
                                                                        className="btn-role-option btn-demote"
                                                                        onClick={() => handleDemoteClick(member.id, member.nickname)}
                                                                    >
                                                                        강등
                                                                    </button>
                                                                </>
                                                            )}
                                                            <button
                                                                className="btn-role-cancel"
                                                                onClick={() => toggleMenu(member.id)}
                                                            >
                                                                X
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Role Badge */}
                                            {roleText && <span className="member-role-badge">{roleText}</span>}
                                        </div>
                                    </div>
                                );
                            })}
                            {sortedMembers.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                                    검색 결과가 없습니다.
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <BottomNav />
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                isDanger={modalConfig.isDanger}
                confirmText={modalConfig.confirmText}
            />
        </MobileLayout>
    );
};

// [New] Member Activity Card Component
const MemberActivityCard = ({ data, onReservationClick }) => {
    const { member, participating_rooms } = data;
    const activityCount = participating_rooms.length;

    return (
        <div className="member-activity-card">
            <div className="mac-header">
                <div className="mac-info">
                    <span className="mac-nickname">{member.nickname}</span>
                    <span className="mac-count">활동 : {activityCount}곡</span>
                </div>
            </div>

            <div className="mac-body">
                {participating_rooms.length > 0 ? (
                    <div className="mac-timeline">
                        {participating_rooms.map((session, idx) => (
                            <div key={idx} className="mac-timeline-item">
                                <div className="mac-song-info">
                                    <span className="mac-song">{session.song} - {session.artist}</span>
                                </div>
                                <div className="mac-session-info">
                                    {/* '예약' status is clickable and orange */}
                                    <span
                                        className={`mac-session-badge ${session.status === '예약' ? 'badge-reserved clickable' : ''}`}
                                        onClick={session.status === '예약' ? () => onReservationClick(session) : undefined}
                                    >
                                        {session.session_name}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="mac-empty">활동 내역이 없습니다.</div>
                )}
            </div>
        </div>
    );
};

export default ClanMemberListPage;
