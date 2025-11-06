// [새 파일] src/features/profile/MyPosts.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';

const MyPosts = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  const fetchMyPosts = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      const data = await apiGet(`/profile/${encodeURIComponent(user.nickname)}/posts`);
      setPosts(data || []);
    } catch (e) {
      console.error('내가 쓴 글 목록 조회 실패:', e);
    }
  }, [user]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  const formatDate = (dateString) => {
    if (!dateString) return '알 수 없음';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (!user) return <div style={{ padding: 20 }}>로그인 필요</div>;

  return (
    <div style={{ maxWidth: '800px', margin: 'auto' }}>
      <h2 className="page-title">내가 쓴 글</h2>
      <div className="card">
        {posts.length === 0 ? (
          <div>작성한 게시글이 없습니다.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--light-gray)' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>제목</th>
                <th style={{ padding: '10px' }}>작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} style={{ borderBottom: '1px solid var(--light-gray)' }}>
                  <td className="post-title-cell" style={{ padding: '10px' }}>
                    <Link to={`/post/${post.id}`}>{post.title}</Link> [{post.comments_count || 0}]
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {formatDate(post.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <button onClick={() => navigate(-1)} className="btn btn-secondary" style={{marginTop: '20px'}}>뒤로가기</button>
    </div>
  );
};

export default MyPosts;