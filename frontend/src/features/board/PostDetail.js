// frontend/src/features/board/PostDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, API_BASE_SERVER } from '../../api/api';
import Linkify from '../../components/Linkify';

// (Comment 컴포넌트는 변경 없음)
const Comment = ({ comment, onReplySubmit, user }) => {
  // const [showReplyForm, setShowReplyForm] = useState(false);
  // const [replyContent, setReplyContent] = useState('');

  // const handleReply = () => {
  //   if (!replyContent.trim()) return;
  //   onReplySubmit(replyContent, comment.id);
  //   setReplyContent('');
  //   setShowReplyForm(false);
  // };

  return (
    <div style={{ marginLeft: comment.parent_id ? '30px' : '0', marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
      <div style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>
        {/* (수정) author.nickname -> author?.nickname (안전하게) */}
        {comment.author?.nickname}
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>
        {new Date(comment.created_at).toLocaleString()}
      </div>
      <div style={{ margin: '5px 0' }}>
        <Linkify>{comment.content}</Linkify>
      </div>

      <div style={{ marginTop: 6 }}>
        {/* (수정) 대댓글 기능은 일단 주석 처리 (백엔드 로직 복잡) */}
        {/*
        {!comment.parent_id && (
          <button onClick={() => setShowReplyForm(!showReplyForm)} style={{ fontSize: 12, padding: '2px 5px' }}>
            답글
          </button>
        )}
        {showReplyForm && (
          <div style={{ marginTop: 6 }}>
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={2}
              style={{ width: '100%', resize: 'none' }}
            />
            <div style={{ marginTop: 4, textAlign: 'right' }}>
              <button onClick={handleReply}>등록</button>
              <button onClick={() => setShowReplyForm(false)} style={{ marginLeft: 6 }}>
                취소
              </button>
            </div>
          </div>
        )}
        */}
      </div>

      {/* (수정) 대댓글 replies 필드 주석 처리
      {(comment.replies || [])
        .slice()
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        .map((r) => (
          <Comment key={r.id} comment={r} onReplySubmit={onReplySubmit} user={user} />
      ))}
      */}
    </div>
  );
};

const PostDetail = ({ user }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // (수정) canDelete -> isOwner 로 명칭 변경
  const [isOwner, setIsOwner] = useState(false);

  const fetchPost = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      // (수정) URL 변경
      const data = await apiGet(`/boards/posts/${postId}/`);
      setPost(data);
      // (수정) is_owner 로직 변경
      setIsOwner(data.author?.nickname === user.nickname);

    } catch (e) {
      console.error('게시글 조회 실패:', e);
      alert('게시글을 불러오는 데 실패했습니다.');
    }
  }, [postId, user]); // (user.nickname -> user로 변경)

  useEffect(() => {
    fetchPost();
    // (AlertReadByUrlView 로직은 4순위이므로 일단 주석 처리)
    /*
    const markAsRead = async () => {
        if (user?.nickname && postId) {
            const formData = new FormData();
            formData.append('nickname', user.nickname);
            formData.append('related_url', `/post/${postId}`);
            try {
                await apiPostForm("/alerts/read-by-url", formData);
            } catch (e) {
                console.error("게시글 알림 읽음 처리 실패:", e);
            }
        }
    };
    markAsRead();
    */
  }, [fetchPost]); // (user, postId 제거)

  const handleLike = async () => {
    if (!user?.nickname) return;
    try {
      // (수정) URL 변경
      const res = await apiPost(`/boards/posts/${postId}/like/`);
      // (수정) res.likes_count -> res.likes_count
      setPost(prev => ({ ...prev, is_liked: res.liked, likes_count: res.likes_count }));
    } catch (e) {
      console.error('좋아요 실패:', e);
    }
  };

  const handleScrap = async () => {
    if (!user?.nickname) return;
    try {
      // --- 👇 [수정] URL 변경 ---
      const res = await apiPost(`/boards/posts/${postId}/scrap/`);
      // --- 👇 [수정] 응답 값(scrapped, scraps_count)으로 상태 업데이트 ---
      setPost(prev => ({
        ...prev,
        is_scrapped: res.scrapped,
        scraps_count: res.scraps_count
      }));
    } catch (e) {
      console.error('스크랩 실패:', e);
    }
  };

  const handleDeletePost = async () => {
    if (!user?.nickname) return;

    try {
      // (수정) URL 변경
      await apiDelete(`/boards/posts/${postId}/`);
      alert('게시글이 삭제되었습니다.');
      navigate(-1);
    } catch (e) {
      console.error('게시글 삭제 실패:', e);
      const errorMsg = e.response?.data?.detail || '게시글 삭제에 실패했습니다.';
      alert(errorMsg);
    }
  };

  const submitComment = async (content, parentId = null) => {
    if (!user?.nickname || !content.trim()) return;
    try {
      // (수정) URL 변경
      await apiPost(`/boards/posts/${postId}/comments/`, {
        content: content.trim(),
        // (대댓글 주석 처리) parent: parentId
      });
      setCommentInput('');
      fetchPost();
    } catch (e) {
      console.error('댓글 등록 실패:', e);
    }
  };

  if (!post) return <div style={{ padding: 20 }}>로딩중…</div>;

  // (수정) post.image_url -> post.image (모델 필드명)
  const imageUrl = post.image ? (
    post.image.startsWith('http') ? post.image : `${API_BASE_SERVER}${post.image}`
  ) : null;

  return (
    <div style={{ padding: 20, maxWidth: '800px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => navigate(-1)}>
          ← 목록으로
        </button>

        {/* (수정) canDelete -> isOwner */}
        {isOwner && (
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9em'
            }}
          >
            삭제
          </button>
        )}
      </div>

      <h2 style={{ margin: 0 }}>{post.title}</h2>
      <div style={{ color: '#666', fontSize: 13, marginBottom: 10, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
        {/* (수정) post.is_anonymous 체크 복구 */}
        {post.is_anonymous ? '익명' : (post.author?.nickname || '알 수 없음')} · {new Date(post.created_at).toLocaleString()}
      </div>

      {/* (수정) post.image_url -> imageUrl */}
      {imageUrl && (
        <div style={{ margin: '20px 0' }}>
          <img
            src={imageUrl}
            alt="post"
            style={{ maxWidth: '100%', borderRadius: 8 }}
          />
        </div>
      )}

      <div style={{ marginBottom: 16, minHeight: '150px', fontSize: '1.1em', padding: '10px 0' }}>
        <Linkify>{post.content}</Linkify>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, padding: '10px', justifyContent: 'center' }}>
        <button onClick={handleLike}>{post.is_liked ? '👍 좋아요 취소' : '👍 좋아요'} ({post.likes_count})</button>
        {/* (수정) 스크랩 카운트 표시 */}
        <button onClick={handleScrap}>{post.is_scrapped ? '⭐️ 스크랩 취소' : '⭐️ 스크랩'} ({post.scraps_count})</button>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>게시글 삭제</h3>
            <p>정말로 이 게시글을 삭제하시겠습니까?<br />삭제된 게시글은 복구할 수 없습니다.</p>
            <div className="modal-actions">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-secondary"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDeletePost();
                }}
                className="btn btn-danger"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <h3>댓글</h3>
      <div style={{ marginBottom: 8 }}>
        <textarea
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          rows={3}
          className="input-field" // (수정) 스타일 일관성
          placeholder="따뜻한 댓글을 남겨주세요."
        />
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <button onClick={() => submitComment(commentInput)} className="btn btn-primary">등록</button>
        </div>
      </div>

      <div>
        {(post.comments || [])
          .slice()
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map((c) => (
            <Comment key={c.id} comment={c} onReplySubmit={submitComment} user={user} />
          ))}
      </div>
    </div>
  );
};

export default PostDetail;