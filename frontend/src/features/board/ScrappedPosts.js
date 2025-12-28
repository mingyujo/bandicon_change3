import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../../api/api';

const ScrappedPosts = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  const fetchScrappedPosts = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      // --- 👇 [수정] API URL 변경 ---
      try {
        const data = await apiGet(`/boards/my-scraps/`);
        console.log("Scrapped posts data:", data);

        if (Array.isArray(data)) {
          setPosts(data);
        } else if (data && Array.isArray(data.results)) {
          setPosts(data.results);
        } else {
          setPosts([]);
        }
      } catch (e) {
        console.error('스크랩 목록 조회 실패:', e);
      }
    }, [user]); // (user.nickname -> user)

  useEffect(() => {
    fetchScrappedPosts();
  }, [fetchScrappedPosts]);

  if (!user) return <div style={{ padding: 20 }}>로그인 필요</div>;

  return (
    <div style={{ padding: 20, maxWidth: '800px', margin: 'auto' }}>
      <h2 className="page-title">내 스크랩</h2>

      {posts.length === 0 ? (
        <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
          스크랩한 게시글이 없습니다.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {posts.map((post) => (
            <Link key={post.id} to={`/post/${post.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{ padding: '15px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary-color)' }}>{post.title}</h4>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {post.author?.nickname} · {new Date(post.created_at).toLocaleString()} · 👍 {post.likes_count} · 💬 {post.comments_count}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <button onClick={() => navigate(-1)} className="btn btn-secondary">← 뒤로가기</button>
      </div>
    </div>
  );
};

export default ScrappedPosts;