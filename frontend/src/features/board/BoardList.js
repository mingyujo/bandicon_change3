// [전체 코드] src/features/board/BoardList.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../../api/api';

const BoardList = ({ user }) => {
    const { boardType, boardId } = useParams(); // boardId 추가
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState(''); // [수정] 빠뜨렸던 코드 추가

    const boardTitle = boardType ? (boardType === 'general' ? '자유게시판' : '초보자게시판') : '클랜 게시판';


    const fetchPosts = useCallback(async (currentSearch) => {
        try {
            // boardId가 있으면 클랜 게시판 API로, 없으면 일반 게시판 API로 요청합니다.
            const url = boardId
                ? `/boards/clan/${boardId}?search=${encodeURIComponent(currentSearch)}`
                : `/boards/${boardType}?search=${encodeURIComponent(currentSearch)}`;
            const data = await apiGet(url);
            setPosts(data);
        } catch (error) {
            console.error(`${boardTitle} 게시글 목록 불러오기 실패:`, error);
        }
    }, [boardType, boardId, boardTitle]); // 의존성 배열에 boardId를 추가합니다.

    // [수정] 검색어가 변경될 때마다 0.3초 후 자동으로 fetchPosts를 호출하는 로직 추가
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
                <button className="btn btn-primary" onClick={() => navigate(boardId ? `/create-post/clan/${boardId}` : `/create-post/${boardType}`)}>글쓰기</button>
            </div>
            {/* 검색창 Input은 이미 존재하므로 수정할 필요가 없습니다. */}
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
                                <span>작성자: {post.is_anonymous ? '익명' : post.owner?.nickname}</span>
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