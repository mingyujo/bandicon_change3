import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { apiGet } from '../../api/api';

const BoardList = ({ user }) => {
    const { boardType, boardId } = useParams();
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');

    // 이전 페이지(ClanDetail)에서 넘어온 clanId 받기
    const clanId = location.state?.clanId;

    const boardTitle = boardType ? (boardType === 'general' ? '자유게시판' : '초보자게시판') : '클랜 게시판';

    const fetchPosts = useCallback(async (currentSearch) => {
        try {
            // ▼▼▼ [수정] 백엔드 urls.py와 경로 일치시키기 (/posts/ 추가) ▼▼▼
            let url;
            if (boardId) {
                // 클랜 게시판: /api/v1/boards/clan/<id>/posts/
                url = `/boards/clan/${boardId}/posts/?search=${encodeURIComponent(currentSearch)}`;
            } else {
                // 일반 게시판: /api/v1/boards/<type>/
                url = `/boards/${boardType}/?search=${encodeURIComponent(currentSearch)}`;
            }
            // ▲▲▲ [수정 완료] ▲▲▲

            const data = await apiGet(url);
            setPosts(data || []);
        } catch (error) {
            console.error(`${boardTitle} 게시글 목록 불러오기 실패:`, error);
        }
    }, [boardType, boardId, boardTitle]);

    // 검색어 디바운싱 (0.3초)
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchPosts(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, fetchPosts]);

    const formatDate = (dateString) => {
        if (!dateString) return '알 수 없음';
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>{boardTitle}</h2>
                
                {/* ▼▼▼ [핵심 수정] 글쓰기 버튼 클릭 시 clanId 전달 ▼▼▼ */}
                <button 
                    className="btn btn-primary" 
                    onClick={() => navigate(
                        boardId ? `/create-post/clan/${boardId}` : `/create-post/${boardType}`,
                        { state: { clanId: clanId } } // 이 부분이 있어야 CreatePost가 클랜 게시판임을 압니다.
                    )}
                >
                    글쓰기
                </button>
                {/* ▲▲▲ [수정 완료] ▲▲▲ */}
            </div>

            <input
                type="text"
                placeholder="제목 또는 내용으로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {posts && posts.length > 0 ? (
                    posts.map(post => (
                        <div key={post.id} className="card" style={{ padding: '15px' }}>
                            <Link to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                <h3 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>
                                    {post.title}
                                </h3>
                            </Link>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9em', color: '#666' }}>
                                <span>작성자: {post.is_anonymous ? '익명' : post.author?.nickname}</span>
                                <span>좋아요: {post.likes_count || 0}</span>
                                <span>{formatDate(post.created_at)}</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="card" style={{ padding: '20px', textAlign: 'center' }}>
                        아직 게시글이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
};

export default BoardList;