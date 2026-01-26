import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet, apiPost, apiDelete } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './ClanBoardList.css';

const DeleteBoardModal = ({ onClose, onConfirm }) => {
    return (
        <div className="delete-modal-overlay" onClick={onClose}>
            <div className="delete-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="delete-modal-title">정말로 게시판을 삭제하시겠습니까?</div>
                <div className="delete-modal-desc">게시판 내 내용이 모두 삭제됩니다</div>
                <div className="delete-modal-actions">
                    <button className="delete-modal-btn cancel" onClick={onClose}>취소</button>
                    <button className="delete-modal-btn confirm" onClick={onConfirm}>확인</button>
                </div>
            </div>
        </div>
    );
};

const ClanBoardList = ({ user }) => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [clan, setClan] = useState(null);
    const [boards, setBoards] = useState([]);
    const [hotPosts, setHotPosts] = useState([]);

    // 모달 상태
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);

    const handleCreateBoardSubmit = async (boardName) => {
        try {
            await apiPost(`/clans/${clanId}/boards/`, {
                title: boardName,
                category: 'free', // 기본값
                content: '' // 필수 필드라면 빈 문자열
            });
            // 목록 갱신
            const updatedBoards = await apiGet(`/clans/${clanId}/boards/`);
            setBoards(updatedBoards || []);
            setIsCreateModalOpen(false); // Close Modal
        } catch (error) {
            console.error("게시판 생성 실패:", error);
            alert("게시판 생성에 실패했습니다.");
        }
    };

    // 권한 상태
    const [isMaster, setIsMaster] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 1. 클랜 정보 가져오기 (권한 확인용)
                const clanData = await apiGet(`/clans/${clanId}/`);
                setClan(clanData);

                // 권한 체크
                if (user) {
                    const master = clanData.owner.id === user.id;
                    const admin = clanData.admins.some(admin => admin.id === user.id);
                    setIsMaster(master);
                    setIsAdmin(admin);
                }

                // 2. 게시판 목록 가져오기
                const boardsData = await apiGet(`/clans/${clanId}/boards/`);
                setBoards(boardsData || []);

                // 3. Hot 게시글 가져오기
                const hotData = await apiGet(`/boards/clan/${clanId}/hot-posts/`);
                setHotPosts(hotData || []);

            } catch (error) {
                console.error("클랜 데이터 로딩 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user && clanId) {
            fetchData();
        }
    }, [clanId, user]);



    const handleDeleteBoardClick = (e, boardId) => {
        e.stopPropagation(); // 링크 이동 방지
        e.preventDefault();
        setDeleteTargetId(boardId);
    };

    const handleConfirmDelete = async () => {
        if (!deleteTargetId) return;
        try {
            await apiDelete(`/clans/boards/${deleteTargetId}/`);
            // 목록 갱신
            const updatedBoards = await apiGet(`/clans/${clanId}/boards/`);
            setBoards(updatedBoards || []);
        } catch (error) {
            console.error("게시판 삭제 실패:", error);
            alert("게시판 삭제에 실패했습니다.");
        } finally {
            setDeleteTargetId(null);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    // 임시 Hot 게시글 데이터 (UI 구현용)


    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            <div className="clan-board-wrapper">
                {/* Header */}
                <div className="clan-board-header">
                    <button className="back-btn" onClick={() => navigate(`/clans/${clanId}`)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <div className="header-title">클랜 게시판</div>
                </div>

                <div className="clan-board-container">
                    {/* Hot Section (UI Mockup) */}
                    {/* Hot Section (Real Data) */}
                    {hotPosts.length > 0 && (
                        <div className="hot-section">
                            <div className="hot-label-row">
                                <span className="hot-icon">#</span>
                                <span className="hot-icon">🔥</span>
                                <span className="hot-text">Hot</span>
                                <span className="hot-icon">🔥</span>
                            </div>
                            <div className="hot-card">
                                {hotPosts.map((post) => (
                                    <div key={post.id} className="hot-post-item" onClick={() => navigate(`/post/${post.id}`)}>
                                        <div className="hot-post-top-row">
                                            <div className="hot-post-title">{post.title}</div>
                                            <div className="hot-post-date">{formatDate(post.created_at)}</div>
                                        </div>
                                        <div className="hot-post-info">
                                            <div className="hot-post-meta-left">
                                                <div className="author-wrap">
                                                    <svg width="8" height="8" viewBox="0 0 8 10" fill="none" stroke="#083344">
                                                        <path d="M4 5C5.10457 5 6 4.10457 6 3C6 1.89543 5.10457 1 4 1C2.89543 1 2 1.89543 2 3C2 4.10457 2.89543 5 4 5Z" strokeWidth="1" />
                                                        <path d="M1 9C1 7.34315 2.34315 6 4 6C5.65685 6 7 7.34315 7 9" strokeWidth="1" strokeLinecap="round" />
                                                    </svg>
                                                    <span className="author-name">{post.is_anonymous ? '익명' : post.author?.nickname}</span>
                                                </div>
                                                <div className="count-wrap">
                                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#083344">
                                                        <path d="M2.5 9V4.5M2.5 4.5H1.5C1.22386 4.5 1 4.72386 1 5V8.5C1 8.77614 1.22386 9 1.5 9H2.5ZM2.5 4.5H5.5C6.05228 4.5 6.5 4.05228 6.5 3.5V2C6.5 1.44772 6.05228 1 5.5 1H4C4 2 3 3 2.5 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
                                                        <path d="M2.5 9H8C8.27614 9 8.5 8.77614 8.5 8.5V5.5C8.5 5.22386 8.27614 5 8 5H6.5" strokeLinecap="round" strokeLinejoin="round" />
                                                    </svg>
                                                    <span className="count-text">({post.likes_count || 0})</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Board List Section */}
                    <div className="board-list-section">
                        <div className="list-header-row">
                            <div className="list-title">게시판 목록</div>
                            {(isMaster || isAdmin) && (
                                <button className="create-board-btn" onClick={() => setIsCreateModalOpen(true)}>
                                    + 게시판 생성
                                </button>
                            )}
                        </div>

                        <div className="board-list-card">
                            {boards.map((board) => (
                                <Link
                                    to={`/boards/clan/${board.id}`}
                                    state={{ title: board.title, clanId: clanId }}
                                    key={board.id}
                                    className="board-item"
                                >
                                    <div className="board-item-left">
                                        {(isMaster || isAdmin) && (
                                            <button
                                                className="delete-btn"
                                                onClick={(e) => handleDeleteBoardClick(e, board.id)}
                                            >
                                                −
                                            </button>
                                        )}
                                        <span className="board-item-name">{board.title}</span>
                                    </div>
                                    <div className="board-arrow">
                                        <svg width="10" height="14" viewBox="0 0 10 14" fill="none" stroke="#083344">
                                            <path d="M1 1L7 7L1 13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                </Link>
                            ))}
                            {boards.length === 0 && (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
                                    생성된 게시판이 없습니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <BottomNav />
            </div>

            {/* Create Board Modal */}
            {isCreateModalOpen && (
                <CreateBoardModal
                    onClose={() => setIsCreateModalOpen(false)}
                    onCreate={handleCreateBoardSubmit}
                />
            )}

            {/* Custom Delete Modal */}
            {deleteTargetId && (
                <DeleteBoardModal
                    onClose={() => setDeleteTargetId(null)}
                    onConfirm={handleConfirmDelete}
                />
            )}
        </MobileLayout>
    );
};

// [New] Create Board Modal Component matching the User's Design
const CreateBoardModal = ({ onClose, onCreate }) => {
    const [title, setTitle] = useState("");

    const handleSubmit = () => {
        if (!title.trim()) return;
        onCreate(title);
    };

    return (
        <div className="delete-modal-overlay"> {/* Reuse overlay */}
            <div className="create-board-modal-content">
                {/* Back Button (Top Left) - per User Image */}
                <div className="create-modal-header">
                    <button className="create-back-btn" onClick={onClose}>
                        &lt; 뒤로 가기
                    </button>
                </div>

                {/* Input Field */}
                <div className="create-input-wrapper">
                    <input
                        type="text"
                        className="create-board-input"
                        placeholder="추가할 게시판 이름을 입력하세요."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </div>

                {/* Submit Button */}
                <button className="create-board-submit-btn" onClick={handleSubmit}>
                    게시판 추가하기
                </button>
            </div>
        </div>
    );
};

export default ClanBoardList;
