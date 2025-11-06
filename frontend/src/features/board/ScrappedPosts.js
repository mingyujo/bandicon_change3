import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiGet } from '../../api/api';

const ScrappedPosts = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  const fetchScrappedPosts = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      const data = await apiGet(`/profile/${encodeURIComponent(user.nickname)}/scraps`);
      setPosts(data || []);
    } catch (e) {
      console.error('스크랩 목록 조회 실패:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchScrappedPosts();
  }, [fetchScrappedPosts]);

  if (!user) return <div style={{ padding: 20 }}>로그인 필요</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>내 스크랩</h2>
      {posts.length === 0 && <div>스크랩한 게시글이 없습니다.</div>}
      <ul>
        {posts.map((post) => (
          <li key={post.id} style={{ marginBottom: 10 }}>
            {/* ✅ 상세 링크 경로를 App 라우터에 맞춰 /post/:id 로 */}
            <Link to={`/post/${post.id}`}>{post.title}</Link>
            <div style={{ fontSize: 12, color: '#666' }}>
              {post.owner?.nickname} · {new Date(post.created_at).toLocaleString()} · 좋아요 {post.likes_count} · 댓글 {post.comments_count}
            </div>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => navigate(-1)}>← 뒤로</button>
      </div>
    </div>
  );
};

export default ScrappedPosts;
