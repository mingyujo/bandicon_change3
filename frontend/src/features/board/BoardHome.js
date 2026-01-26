import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import BottomNav from '../../components/BottomNav';
import GlobalHeader from '../../components/GlobalHeader';
import './BoardHome.css';

const BoardHome = ({ user }) => {
    const navigate = useNavigate();
    const [hotPosts, setHotPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHotPosts = async () => {
            try {
                // Fetch from both main public boards
                const [generalPosts, beginnerPosts] = await Promise.all([
                    apiGet('/boards/general/').catch(() => []),
                    apiGet('/boards/beginner/').catch(() => [])
                ]);

                // Combine and sort by likes
                const allPosts = [...(generalPosts || []), ...(beginnerPosts || [])];

                // Sort by likes_count desc, then by date desc
                const sorted = allPosts.sort((a, b) => {
                    const likesA = a.likes_count || 0;
                    const likesB = b.likes_count || 0;
                    if (likesB !== likesA) return likesB - likesA;
                    return new Date(b.created_at) - new Date(a.created_at);
                });

                setHotPosts(sorted.slice(0, 5));
            } catch (error) {
                console.error("Hot posts fetch error:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHotPosts();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            {/* Sticky Header */}
            <div className="board-home-header">
                <div className="header-title-large">게시판</div>
            </div>

            <div className="board-scroll-container">
                {/* Hot Section */}
                <div className="section-header">
                    <span className="hot-icon">#</span>
                    <span className="hot-text">Hot</span>
                </div>

                <div className="hot-posts-card">
                    {loading ? (
                        <div className="p-4 text-center text-gray-400 text-sm">로딩중...</div>
                    ) : hotPosts.length > 0 ? (
                        hotPosts.map((post, index) => (
                            <div key={post.id} className={`hot-post-item ${index !== hotPosts.length - 1 ? 'border-b' : ''}`} onClick={() => navigate(`/post/${post.id}`)}>
                                <div className="post-main-row">
                                    <div className="post-title-text">{post.title}</div>
                                    <div className="post-date">{formatDate(post.created_at)}</div>
                                </div>
                                <div className="post-info-row">
                                    <div className="author-info">
                                        <div className="user-icon-small">
                                            <svg width="8" height="10" viewBox="0 0 8 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M4 5C5.10457 5 6 4.10457 6 3C6 1.89543 5.10457 1 4 1C2.89543 1 2 1.89543 2 3C2 4.10457 2.89543 5 4 5Z" stroke="#083344" strokeWidth="1" />
                                                <path d="M1 9C1 7.34315 2.34315 6 4 6C5.65685 6 7 7.34315 7 9" stroke="#083344" strokeWidth="1" strokeLinecap="round" />
                                            </svg>
                                        </div>
                                        <span className="author-name">{post.is_anonymous ? '익명' : (post.author?.nickname || '알수없음')}</span>
                                    </div>

                                    <div className="stats-info">
                                        <div className="stat-badge">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M2.5 9V4.5M2.5 4.5H1.5C1.22386 4.5 1 4.72386 1 5V8.5C1 8.77614 1.22386 9 1.5 9H2.5ZM2.5 4.5H5.5C6.05228 4.5 6.5 4.05228 6.5 3.5V2C6.5 1.44772 6.05228 1 5.5 1H4C4 2 3 3 2.5 4.5Z" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                                <path d="M2.5 9H8C8.27614 9 8.5 8.77614 8.5 8.5V5.5C8.5 5.22386 8.27614 5 8 5H6.5" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="stat-count">({post.likes_count || 0})</span>
                                        </div>
                                        <div className="stat-badge">
                                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.5 5.5C8.5 7.70914 6.70914 9.5 4.5 9.5C4.0387 9.5 3.59598 9.42151 3.18618 9.27738L1 10L1.72262 7.81382C1.26738 7.35515 1 6.72661 1 6.04545C1 3.53508 3.5 1.5 5.5 1.5C7.70914 1.5 9.5 3.29086 9.5 5.5" stroke="#083344" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <span className="stat-count">({post.comments_count || 0})</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-hot-state">
                            <div className="empty-state-message">
                                아직 등록된 핫 게시글이 없습니다.
                            </div>
                        </div>
                    )}
                </div>

                {/* Board List Section */}
                <div className="section-title-row">
                    <div className="section-title">게시판 목록</div>
                </div>

                <div className="board-list-card">
                    <Link to="/boards/general" className="board-link-item border-b">
                        <span className="board-name">자유 게시판</span>
                        <div className="arrow-icon">
                            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L7 7L1 13" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </Link>
                    <Link to="/boards/beginner" className="board-link-item">
                        <span className="board-name">초보자 게시판</span>
                        <div className="arrow-icon">
                            <svg width="10" height="14" viewBox="0 0 10 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L7 7L1 13" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                    </Link>
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default BoardHome;