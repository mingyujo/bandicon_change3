import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import ConfirmationModal from '../../components/ConfirmationModal';
import './ClanAnnouncementList.css';

const ClanAnnouncementList = ({ user }) => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [clanName, setClanName] = useState("클랜");
    const [clan, setClan] = useState(null); // To check permissions

    // Admin Actions State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [noticeToDelete, setNoticeToDelete] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // We'll implement a simple create modal/prompt
    const [newTitle, setNewTitle] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch clan info for title & permissions
                const clanRes = await apiGet(`/clans/${clanId}/`);
                setClanName(clanRes.name);
                setClan(clanRes);

                // Fetch announcements
                const noticesRes = await apiGet(`/clans/${clanId}/announcements/`);
                setNotices(noticesRes.results || noticesRes);
            } catch (err) {
                console.error("Error fetching notices:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [clanId]);

    const isOwnerOrAdmin = clan && user && (clan.owner?.id === user.id || clan.admins?.some(a => a.id === user.id));

    // Format helper: "12/26 (Mon)" style if needed, or just date
    // Format helper
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    const handleCreateClick = () => {
        setIsCreateModalOpen(true);
        setNewTitle("");
    };

    const handleCreateSubmit = async () => {
        if (!newTitle || !newTitle.trim()) return;

        try {
            await apiPost(`/clans/${clanId}/announcements/`, { title: newTitle, content: newTitle });
            // Refresh
            const noticesRes = await apiGet(`/clans/${clanId}/announcements/`);
            setNotices(noticesRes.results || noticesRes);
            setIsCreateModalOpen(false);
            setNewTitle("");
        } catch (err) {
            alert("공지 생성 실패");
        }
    };

    const handleDeleteClick = (id) => {
        setNoticeToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!noticeToDelete) return;
        try {
            await apiDelete(`/clans/announcements/${noticeToDelete}/`);
            // Refresh
            const noticesRes = await apiGet(`/clans/${clanId}/announcements/`);
            setNotices(noticesRes.results || noticesRes);
            setIsDeleteModalOpen(false);
            setNoticeToDelete(null);
        } catch (err) {
            alert("삭제 실패");
        }
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <div className="clan-notice-page">
                {/* Fixed Header */}
                <div className="cn-header">
                    <div className="cn-header-left">
                        <button onClick={() => navigate(-1)} className="cn-back-btn">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        <span className="cn-title">클랜 공지</span>
                    </div>
                    {isOwnerOrAdmin && (
                        <button className="cn-create-btn" onClick={handleCreateClick}>공지 생성</button>
                    )}
                </div>

                <div className="notice-card-container">
                    <div className="notice-full-card">
                        <div className="notice-card-header">
                            <span>공지</span>
                        </div>
                        <div className="notice-card-body">
                            {loading ? (
                                <div className="empty-state">로딩 중...</div>
                            ) : notices.length > 0 ? (
                                notices.map((notice) => (
                                    <div key={notice.id} className="notice-list-item">
                                        <div className="notice-content-wrapper">
                                            <span className="notice-bullet">•</span>
                                            <span className="notice-date">{formatDate(notice.created_at)}</span>
                                            <span className="notice-text">{notice.title}</span>
                                        </div>
                                        {isOwnerOrAdmin && (
                                            <div className="notice-delete-btn" onClick={() => handleDeleteClick(notice.id)}>
                                                <div className="red-minus-icon">−</div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="empty-state">등록된 공지가 없습니다.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <BottomNav />

            {/* Create Notice Modal */}
            {isCreateModalOpen && (
                <div className="create-notice-overlay" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="create-notice-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="cn-close-btn" onClick={() => setIsCreateModalOpen(false)}>&times;</button>

                        <div className="cn-input-wrapper">
                            <input
                                type="text"
                                className="cn-input"
                                placeholder="공지를 작성하세요."
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <button className="cn-submit-btn" onClick={handleCreateSubmit}>
                            공지 올리기
                        </button>
                    </div>
                </div>
            )}

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="공지 삭제"
                message="이 공지를 삭제하시겠습니까?"
                confirmText="삭제"
                isDanger={true}
            />
        </MobileLayout>
    );
};

export default ClanAnnouncementList;
