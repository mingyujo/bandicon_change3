import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { apiGet } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import BottomNav from '../../components/BottomNav';
import GlobalHeader from '../../components/GlobalHeader';
import './BoardList.css';

const BoardList = ({ user }) => {
    const { boardType, boardId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [posts, setPosts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const getTitle = () => {
        if (location.state?.title) return location.state.title;
        if (boardType === 'beginner') return '초보자 게시판';
        if (boardType === 'general') return '자유 게시판';
        return '게시판';
    };

    const boardTitle = getTitle();

    const fetchPosts = useCallback(async (search = '') => {
        try {
            setLoading(true);
            let url = '';

            if (boardId) {
                // 클랜 게시판
                url = `/boards/clan/${boardId}/posts/?search=${encodeURIComponent(search)}`;
            } else {
                // 일반 게시판
                url = `/boards/${boardType}/?search=${encodeURIComponent(search)}`;
            }

            const data = await apiGet(url);
            // Sort by created_at desc if not already sorted
            const sortedData = (data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setPosts(sortedData);
        } catch (error) {
            console.error("게시글 목록 로드 실패:", error);
        } finally {
            setLoading(false);
        }
    }, [boardType, boardId]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPosts(searchTerm);
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchPosts]);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            {/* Sticky Header */}
            <div className="board-list-header">
                <button className="back-btn" onClick={() => {
                    if (boardId && location.state?.clanId) {
                        navigate(`/clans/${location.state.clanId}/boards`);
                    } else {
                        navigate(-1);
                    }
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                        <path d="M15 18l-6-6 6-6" />
                    </svg>
                </button>
                <div className="header-title">{boardTitle}</div>
                <button className="write-btn" onClick={() => {
                    if (boardId) {
                        navigate(`/create-post/clan/${boardId}`);
                    } else {
                        navigate(`/create-post/${boardType}`);
                    }
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.50001C18.8978 2.10219 19.4374 1.87869 20 1.87869C20.5626 1.87869 21.1022 2.10219 21.5 2.50001C21.8978 2.89784 22.1213 3.4374 22.1213 4.00001C22.1213 4.56262 21.8978 5.10219 21.5 5.50001L12 15L8 16L9 12L18.5 2.50001Z" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            <div className="board-content-container">
                {/* Search Bar matching RoomList design */}
                <div className="search-bar-wrapper">
                    <div className="search-icon-wrapper">
                        <svg className="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        className="search-input"
                        placeholder="검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Post List */}
                <div className="post-list">
                    {loading ? (
                        <div className="loading-state">로딩중...</div>
                    ) : posts.length > 0 ? (
                        posts.map((post, index) => (
                            <div key={post.id} className={`post-item ${index !== posts.length - 1 ? 'border-b' : ''}`} onClick={() => navigate(`/post/${post.id}`)}>
                                <div className="post-row-top">
                                    <div className="post-title">{post.title}</div>
                                    <div className="post-date">{formatDate(post.created_at)}</div>
                                </div>
                                <div className="post-row-bottom">
                                    <div className="post-author-wrap">
                                        <div className="user-icon-mini">
                                            <svg width="8" height="10" viewBox="0 0 8 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 5C5.10457 5 6 4.10457 6 3C6 1.89543 5.10457 1 4 1C2.89543 1 2 1.89543 2 3C2 4.10457 2.89543 5 4 5Z" stroke="#083344" strokeWidth="1" />
                                                <path d="M1 9C1 7.34315 2.34315 6 4 6C5.65685 6 7 7.34315 7 9" stroke="#083344" strokeWidth="1" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                        <span className="author-text">{post.is_anonymous ? '익명' : (post.author?.nickname || '알수없음')}</span>
                                    </div>

                                    <div className="post-stats">
                                        <div className="stat-pill">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.5 9V4.5M2.5 4.5H1.5C1.22386 4.5 1 4.72386 1 5V8.5C1 8.77614 1.22386 9 1.5 9H2.5ZM2.5 4.5H5.5C6.05228 4.5 6.5 4.05228 6.5 3.5V2C6.5 1.44772 6.05228 1 5.5 1H4C4 2 3 3 2.5 4.5Z" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M2.5 9H8C8.27614 9 8.5 8.77614 8.5 8.5V5.5C8.5 5.22386 8.27614 5 8 5H6.5" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>({post.likes_count || 0})</span>
                                        </div>
                                        <div className="stat-pill">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.5 5.5C8.5 7.70914 6.70914 9.5 4.5 9.5C4.0387 9.5 3.59598 9.42151 3.18618 9.27738L1 10L1.72262 7.81382C1.26738 7.35515 1 6.72661 1 6.04545C1 3.53508 3.5 1.5 5.5 1.5C7.70914 1.5 9.5 3.29086 9.5 5.5" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span>({post.comments_count || 0})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-list">게시글이 없습니다.</div>
                    )}
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default BoardList;