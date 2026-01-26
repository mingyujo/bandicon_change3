import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import SubHeader from '../../components/SubHeader';
import PostListItem from '../../components/PostListItem';
import './ScrappedPosts.css'; // Create this CSS for content area

const ScrappedPosts = ({ user }) => {
  const [posts, setPosts] = useState([]);
  const navigate = useNavigate();

  // Ensure we have user data for GlobalHeader
  const [currentUser, setCurrentUser] = useState(user);

  useEffect(() => {
    if (user) setCurrentUser(user);
    // If user prop is stale, we might want to fetch /users/me/ but prop is usually fine from App.js
  }, [user]);

  const fetchScrappedPosts = useCallback(async () => {
    if (!currentUser?.nickname) return;
    try {
      const data = await apiGet(`/boards/my-scraps/`);
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
  }, [currentUser]);

  useEffect(() => {
    fetchScrappedPosts();
  }, [fetchScrappedPosts]);

  const handlePostClick = (postId) => {
    navigate(`/post/${postId}`);
  };

  return (
    <MobileLayout>
      <GlobalHeader user={user} />
      <SubHeader title="내 스크랩" />

      <div className="scrapped-posts-content">
        {posts.length === 0 ? (
          <div className="empty-state">
            스크랩한 게시글이 없습니다.
          </div>
        ) : (
          <div className="posts-list">
            {posts.map((post) => (
              <PostListItem
                key={post.id}
                title={post.title}
                date={new Date(post.created_at).toLocaleDateString()}
                authorNickname={post.author?.nickname}
                likesCount={post.likes_count}
                commentsCount={post.comments_count}
                onClick={() => handlePostClick(post.id)}
              />
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </MobileLayout>
  );
};

export default ScrappedPosts;