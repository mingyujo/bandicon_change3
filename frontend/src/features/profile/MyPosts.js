// frontend/src/features/profile/MyPosts.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../../api/api';

const MyPosts = ({ user }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        // --- 👇 [수정] API 호출 ---
        const fetchMyPosts = async () => {
            if (!user) {
                navigate('/login'); // 비로그인 시 로그인 페이지로
                return;
            }
            try {
                setLoading(true);
                // 1순위: /my-posts/ API 호출
                const data = await apiGet('/boards/my-posts/');
                setPosts(data);
            } catch (error) {
                console.error("내가 쓴 글 목록 조회 실패:", error);
                // (401 인증 오류 등은 api.js 인터셉터가 처리)
            } finally {
                setLoading(false);
            }
        };

        fetchMyPosts();
        // --- 👆 [수정] ---
    }, [user, navigate]);

    // --- 👇 [신규] 로딩 및 게시글 없음 처리 ---
    if (loading) {
        return <div className="container" style={{padding: '20px'}}>로딩 중...</div>;
    }

    if (posts.length === 0) {
        return (
            <div className="container" style={{padding: '20px'}}>
                <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{marginBottom: '20px'}}>← 뒤로가기</button>
                <h2>내가 쓴 글</h2>
                <div className="card" style={{padding: '40px', textAlign: 'center', color: '#888'}}>
                    작성한 글이 없습니다.
                </div>
            </div>
        );
    }
    // --- 👆 [신규] ---

    return (
        <div className="container" style={{padding: '20px'}}>
            <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{marginBottom: '20px'}}>← 뒤로가기</button>
            <h2>내가 쓴 글 ({posts.length}개)</h2>
            
            {/* --- 👇 [수정] 게시글 목록 렌더링 --- */}
            <div className="list-group">
                {posts.map(post => (
                    <Link 
                        key={post.id} 
                        to={`/posts/${post.id}`} 
                        className="list-group-item list-group-item-action"
                    >
                        <div className="d-flex w-100 justify-content-between">
                            <h5 className="mb-1">{post.title}</h5>
                            <small>{new Date(post.created_at).toLocaleDateString('ko-KR')}</small>
                        </div>
                        <p className="mb-1" style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: '#555'
                        }}>
                            {post.content || '(내용 없음)'}
                        </p>
                        <small>
                            👍 {post.likes_count ?? 0} &nbsp; 
                            💬 {post.comments_count ?? 0}
                        </small>
                    </Link>
                ))}
            </div>
            {/* --- 👆 [수정] --- */}
        </div>
    );
};

export default MyPosts;