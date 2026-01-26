// frontend/src/features/board/PostDetail.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, API_BASE_SERVER } from '../../api/api';
import Linkify from '../../components/Linkify';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './PostDetail.css';

const Comment = ({ comment, onReplyClick, onLikeClick, user }) => {
  const indent = (comment.depth || 0) * 20;
  return (
    <div className="comment-item" style={{ marginLeft: `${indent}px`, borderLeft: comment.depth > 0 ? '3px solid #f0f0f0' : 'none', paddingLeft: comment.depth > 0 ? '10px' : '0' }}>
      <div className="cm-header">
        <div className="cm-author-row">
          <span className={`cm-author ${comment.is_writer ? 'is-writer' : ''}`}>
            {comment.is_anonymous ? '익명' : (comment.author?.nickname || '알 수 없음')}
            {comment.is_writer && <span style={{ fontSize: '10px', marginLeft: '4px', color: '#0EA5E9' }}>(작성자)</span>}
          </span>
          <span className="cm-date">
            {new Date(comment.created_at).toLocaleString()}
          </span>
        </div>
        <div className="cm-actions-right">
          {/* Only allow replying to root comments (depth 0) */}
          {(comment.depth === 0 || !comment.depth) && (
            <button className="cm-action-btn" onClick={() => onReplyClick(comment)}>
              <div className="cm-action-icon-box">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              </div>
              <span>({comment.replies_count || 0})</span>
            </button>
          )}
          <button className="cm-action-btn" onClick={() => onLikeClick(comment.id)}>
            <div className={`cm-action-icon-box ${comment.is_liked ? 'liked' : ''}`} style={comment.is_liked ? { backgroundColor: '#F0F9FF', border: '1px solid #0EA5E9' } : {}}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={comment.is_liked ? "#0EA5E9" : "#64748B"} strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
            </div>
            <span style={comment.is_liked ? { color: '#0EA5E9' } : {}}>({comment.likes_count || 0})</span>
          </button>
        </div>
      </div>
      <div className="cm-content">
        <Linkify>{comment.content}</Linkify>
      </div>

      {/* Recursive rendering for replies if existing in the tree structure,
          but API typically returns flat list. 
          Assuming flat list is sorted or we need to process it. 
          If backend returns `parent` field, we can rely on that visually 
          or if backend nests them.
          Current serializer is flat for `comments` M2M.
          However, usually we render threaded comments.
          Let's stick to flat list but with indentation if `parent` exists.
          (Handled by style above)
       */}
    </div>
  );
};

const PostDetail = ({ user }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [post, setPost] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Reply State
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

  const boardTitle = location.state?.title || post?.board_info?.name || '게시글';

  // --- Comment Organizing Logic ---
  const organizeComments = (comments) => {
    if (!comments) return [];

    // 1. Separate roots (no parent) and potential children
    const roots = comments.filter(c => !c.parent).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const allReplies = comments.filter(c => c.parent);

    // 2. Recursive function to find children
    const getReplies = (parentId, depth) => {
      // Find direct children of this parent ID
      const children = allReplies.filter(r => r.parent === parentId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      const result = [];
      children.forEach(child => {
        const childWithDepth = { ...child, depth };
        result.push(childWithDepth);
        // Recursively find children of this child
        result.push(...getReplies(child.id, depth + 1));
      });
      return result;
    };

    // 3. Build final list
    const flattened = [];
    roots.forEach(root => {
      flattened.push({ ...root, depth: 0 });
      flattened.push(...getReplies(root.id, 1));
    });

    return flattened;
  };

  const sortedComments = organizeComments(post?.comments);


  const fetchPost = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      const data = await apiGet(`/boards/posts/${postId}/`);
      setPost(data);
      const isAuthor = data.author?.nickname === user.nickname;
      const isAdmin = user.role === 'OPERATOR';
      setIsOwner(isAuthor || isAdmin);
    } catch (e) {
      console.error('게시글 조회 실패:', e);
      // alert('게시글을 불러오는 데 실패했습니다.');
    }
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleLike = async () => {
    if (!user?.nickname) return;
    try {
      const res = await apiPost(`/boards/posts/${postId}/like/`);
      setPost(prev => ({ ...prev, is_liked: res.liked, likes_count: res.likes_count }));
    } catch (e) {
      console.error('좋아요 실패:', e);
    }
  };

  const handleScrap = async () => {
    if (!user?.nickname) return;
    try {
      const res = await apiPost(`/boards/posts/${postId}/scrap/`);
      setPost(prev => ({ ...prev, is_scrapped: res.scrapped, scraps_count: res.scraps_count }));
    } catch (e) {
      console.error('스크랩 실패:', e);
    }
  };

  const handleDeletePost = async () => {
    if (!user?.nickname) return;
    try {
      await apiDelete(`/boards/posts/${postId}/`);
      alert('게시글이 삭제되었습니다.');
      navigate(-1);
    } catch (e) {
      console.error('게시글 삭제 실패:', e);
      // alert(e.response?.data?.detail || '게시글 삭제에 실패했습니다.');
    }
  };

  // --- New Logic ---

  const handleLikeComment = async (commentId) => {
    if (!user?.nickname) return;
    try {
      const res = await apiPost(`/boards/comments/${commentId}/like/`);
      // Update local state primarily for responsiveness
      setPost(prev => ({
        ...prev,
        comments: prev.comments.map(c =>
          c.id === commentId
            ? { ...c, is_liked: res.liked, likes_count: res.likes_count }
            : c
        )
      }));
    } catch (e) {
      console.error("댓글 좋아요 실패:", e);
    }
  };

  const handleReplyClick = (comment) => {
    setReplyingTo(comment);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const submitComment = async () => {
    if (!user?.nickname || !commentInput.trim()) return;

    try {
      const payload = {
        content: commentInput.trim(),
        is_anonymous: isAnonymous,
      };

      if (replyingTo) {
        payload.parent = replyingTo.id;
      }

      await apiPost(`/boards/posts/${postId}/comments/`, payload);
      setCommentInput('');
      setReplyingTo(null); // Reset reply state
      fetchPost();
    } catch (e) {
      console.error('댓글 등록 실패:', e);
    }
  };

  if (!post) return <MobileLayout><div>로딩중...</div></MobileLayout>;

  const imageUrl = post.image ? (
    post.image.startsWith('http') ? post.image : `${API_BASE_SERVER}${post.image}`
  ) : null;

  return (
    <MobileLayout>
      <GlobalHeader user={user} />

      <div className="post-detail-container">
        {/* Sub Header */}
        <div className="post-detail-header">
          <button className="post-back-btn" onClick={() => navigate(-1)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <div className="post-header-title">{boardTitle}</div>

          {/* Delete Button (If Owner) */}
          {isOwner && (
            <button
              onClick={() => setShowDeleteModal(true)}
              style={{ marginLeft: 'auto', border: 'none', background: 'none', color: '#EF4444', fontSize: '14px', cursor: 'pointer' }}
            >
              삭제
            </button>
          )}
        </div>

        {/* Post Content */}
        <div className="post-content-card">
          <div className="pd-title">{post.title}</div>
          <div className="pd-meta-row">
            <div className="pd-author">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              {post.is_anonymous ? '익명' : (post.author?.nickname || '알 수 없음')}
            </div>
            <div className="pd-date">
              {new Date(post.created_at).toLocaleString()}
            </div>
          </div>

          <div className="pd-divider"></div>

          {imageUrl && (
            <div className="pd-image-wrapper">
              <img src={imageUrl} alt="Post" className="pd-image" />
            </div>
          )}

          <div className="pd-content">
            <Linkify>{post.content}</Linkify>
          </div>

          {/* Like & Scrap Buttons */}
          <div className="pd-actions-row">
            <button className={`pd-action-btn ${post.is_liked ? 'active' : ''}`} onClick={handleLike}>
              <svg className="pd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
              <span>({post.likes_count})</span>
            </button>
            <button className={`pd-action-btn ${post.is_scrapped ? 'active' : ''}`} onClick={handleScrap}>
              <svg className="pd-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
              <span>({post.scraps_count})</span>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div className="comments-section">
          <div className="comments-header">댓글</div>
          <div className="comments-list">
            {sortedComments.map((c) => (
              <Comment
                key={c.id}
                comment={c}
                onReplyClick={handleReplyClick}
                onLikeClick={handleLikeComment}
                user={user}
              />
            ))}
            {sortedComments.length === 0 && (
              <div style={{ color: '#94A3B8', fontSize: '14px', padding: '20px 0', textAlign: 'center' }}>
                작성된 댓글이 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Comment Input */}
      <div className="comment-input-area" style={replyingTo ? { flexDirection: 'column', alignItems: 'stretch', gap: '5px', padding: '8px 20px 12px' } : {}}>

        {replyingTo && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B', paddingLeft: '4px' }}>
            <span>
              Replying to <strong>{replyingTo.is_anonymous ? '익명' : replyingTo.author?.nickname}</strong>
            </span>
            <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>✖ 취소</button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <label className="anon-check-label">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ marginRight: '4px' }}
            />
            익명
          </label>
          <div className="comment-input-box">
            <input
              ref={inputRef}
              className="comment-input"
              placeholder={replyingTo ? "답글을 입력하세요." : "따뜻한 댓글을 남겨주세요."}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && submitComment()}
            />
          </div>
          <button className="comment-submit-btn" onClick={submitComment}>전송</button>
        </div>
      </div>

      <BottomNav />

      {/* Delete Modal Reused */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>게시글 삭제</h3>
            <p>정말로 삭제하시겠습니까?</p>
            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-secondary">취소</button>
              <button onClick={() => { setShowDeleteModal(false); handleDeletePost(); }} className="btn btn-danger">삭제</button>
            </div>
          </div>
        </div>
      )}

    </MobileLayout>
  );
};

export default PostDetail;