import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';
import SubHeader from '../../components/SubHeader';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import PostListItem from '../../components/PostListItem';
import './MyPosts.css';

const MyPosts = ({ user }) => {
    const [myPosts, setMyPosts] = useState([]);
    const [commentedPosts, setCommentedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(user);

    useEffect(() => {
        if (user) setCurrentUser(user);
    }, [user]);

    useEffect(() => {
        const fetchData = async () => {
            if (!currentUser?.nickname) return;
            try {
                setLoading(true);
                const [postsData, commentsData] = await Promise.all([
                    apiGet('/boards/my-posts/'),
                    apiGet('/boards/my-comments/')
                ]);

                setMyPosts(Array.isArray(postsData) ? postsData : []);
                setCommentedPosts(Array.isArray(commentsData) ? commentsData : []);
            } catch (error) {
                console.error("데이터 조회 실패:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [currentUser]);

    const handlePostClick = (postId) => {
        navigate(`/post/${postId}`);
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <SubHeader title="내가 쓴 글" />

            <div className="myposts-content">
                {/* Section 1: My Posts */}
                <div className="section-block">
                    <div className="section-header">내가 쓴 글</div>
                    {myPosts.length === 0 ? (
                        <div className="empty-message">작성한 글이 없습니다.</div>
                    ) : (
                        <div className="posts-list">
                            {myPosts.map(post => (
                                <PostListItem
                                    key={post.id}
                                    title={post.title}
                                    date={new Date(post.created_at).toLocaleDateString()}
                                    authorNickname={post.author?.nickname || currentUser?.nickname} // Fallback to current user for my posts
                                    likesCount={post.likes_count}
                                    commentsCount={post.comments_count}
                                    onClick={() => handlePostClick(post.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Section 2: Commented Posts */}
                <div className="section-block">
                    <div className="section-header">댓글 쓴 글</div>
                    {commentedPosts.length === 0 ? (
                        <div className="empty-message">작성한 댓글이 없습니다.</div>
                    ) : (
                        <div className="posts-list">
                            {commentedPosts.map(item => {
                                // Validate if item has post info. If item IS a comment, we need post details.
                                // Assuming API returns flat comment: { id, content, post_id, created_at, ... }
                                // We might not have post title if backend doesn't serializer it.
                                // We'll try to use 'post_title' if available, or fall back to 'content' (which is wrong but fallback).
                                // Ideally backend should provide post context.
                                // If 'item.post' object exists?
                                const postTitle = item.post_title || item.post?.title || "게시글 정보를 불러올 수 없습니다";
                                const postId = item.post_id || item.post?.id;
                                const postAuthor = item.post_author || item.post?.author?.nickname || "익명";

                                return (
                                    <PostListItem
                                        key={`comment-${item.id}`}
                                        title={postTitle}
                                        date={new Date(item.created_at).toLocaleDateString()}
                                        authorNickname={postAuthor}
                                        likesCount={item.post_likes || 0}
                                        commentsCount={item.post_comments || 0}
                                        onClick={() => postId && handlePostClick(postId)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default MyPosts;