// [전체 코드] src/features/board/PostDetail.js - 익명 게시글도 삭제 가능
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
// [수정] apiDelete import 추가
import { apiGet, apiPost, apiPostForm, apiDelete, API_BASE_SERVER } from '../../api/api';
import Linkify from '../../components/Linkify';

const Comment = ({ comment, onReplySubmit, user }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReply = () => {
    if (!replyContent.trim()) return;
    onReplySubmit(replyContent, comment.id);
    setReplyContent('');
    setShowReplyForm(false);
  };

  return (
    <div style={{ marginLeft: comment.parent_id ? '30px' : '0', marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: '10px' }}>
      <div style={{ fontSize: 14, color: '#333', fontWeight: 'bold' }}>
        {comment.anonymous_nickname || comment.owner?.nickname}
        {comment.anonymous_nickname === '글쓴이' && <span style={{color: 'blue', fontSize: '0.8em', marginLeft: '5px'}}> (글쓴이)</span>}
      </div>
      <div style={{ fontSize: 12, color: '#666' }}>
        {new Date(comment.created_at).toLocaleString()}
      </div>
      <div style={{ margin: '5px 0' }}>
        <Linkify>{comment.content}</Linkify>
      </div>

      <div style={{ marginTop: 6 }}>
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
      </div>

      {(comment.replies || [])
        .slice() // 원본 배열을 바꾸지 않기 위해 복사본을 만듭니다.
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // 시간순 정렬
        .map((r) => (
          <Comment key={r.id} comment={r} onReplySubmit={onReplySubmit} user={user} />
      ))}
    </div>
    );
    };

const PostDetail = ({ user }) => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [commentInput, setCommentInput] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [canDelete, setCanDelete] = useState(false); // 삭제 권한 여부

  const fetchPost = useCallback(async () => {
    if (!user?.nickname) return;
    try {
      const data = await apiGet(`/post/${postId}?nickname=${encodeURIComponent(user.nickname)}`);
      setPost(data);
      
      // 삭제 권한 확인: 서버에서 is_owner 필드를 받아오거나, 클라이언트에서 판단
      // 여기서는 서버 응답에 is_owner가 있다고 가정하거나, 아래 로직으로 판단
      const isOwner = data.is_owner || (!data.is_anonymous && data.owner?.nickname === user.nickname);
      setCanDelete(isOwner);
      
    } catch (e) {
      console.error('게시글 조회 실패:', e);
      alert('게시글을 불러오는 데 실패했습니다.');
    }
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
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

  }, [fetchPost, user, postId]);

  const handleLike = async () => {
    if (!user?.nickname) return;
    try {
      const res = await apiPost(`/post/${postId}/like?nickname=${encodeURIComponent(user.nickname)}`);
      setPost(prev => ({ ...prev, is_liked: !prev.is_liked, likes_count: res.likes_count }));
    } catch (e) {
      console.error('좋아요 실패:', e);
    }
  };

  const handleScrap = async () => {
    if (!user?.nickname) return;
    try {
      await apiPost(`/post/${postId}/scrap?nickname=${encodeURIComponent(user.nickname)}`);
      setPost(prev => ({ ...prev, is_scrapped: !prev.is_scrapped }));
    } catch (e) {
      console.error('스크랩 실패:', e);
    }
  };

  // 게시글 삭제 함수
  const handleDeletePost = async () => {
    if (!user?.nickname) return;
    
    try {
      await apiDelete(`/posts/${postId}?nickname=${encodeURIComponent(user.nickname)}`);
      alert('게시글이 삭제되었습니다.');
      navigate(-1); // 이전 페이지로 돌아가기
    } catch (e) {
      console.error('게시글 삭제 실패:', e);
      const errorMsg = e.response?.data?.detail || '게시글 삭제에 실패했습니다.';
      alert(errorMsg);
    }
  };

  const submitComment = async (content, parentId = null) => {
    if (!user?.nickname || !content.trim()) return;
    try {
      await apiPost(`/post/${postId}/comments?nickname=${encodeURIComponent(user.nickname)}${parentId ? `&parent_id=${parentId}` : ''}`, {
        content: content.trim(),
      });
      setCommentInput('');
      fetchPost();
    } catch (e) {
      console.error('댓글 등록 실패:', e);
    }
  };

  if (!post) return <div style={{ padding: 20 }}>로딩중…</div>;

  return (
    <div style={{ padding: 20, maxWidth: '800px', margin: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <button onClick={() => navigate(-1)}>
          ← 목록으로
        </button>
        
        {/* 작성자 본인에게만 삭제 버튼 표시 (익명/실명 관계없이) */}
        {canDelete && (
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
        {post.is_anonymous ? '익명' : (post.owner?.nickname || '알 수 없음')} · {new Date(post.created_at).toLocaleString()}
      </div>

      {post.image_url && (
        <div style={{ margin: '20px 0' }}>
          <img
            src={`${API_BASE_SERVER}${post.image_url}`}
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
        <button onClick={handleScrap}>{post.is_scrapped ? '⭐️ 스크랩 취소' : '⭐️ 스크랩'}</button>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>게시글 삭제</h3>
            <p>정말로 이 게시글을 삭제하시겠습니까?<br/>삭제된 게시글은 복구할 수 없습니다.</p>
            <div className="modal-actions">
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ marginRight: '10px' }}
              >
                취소
              </button>
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  handleDeletePost();
                }}
                style={{ 
                  backgroundColor: '#dc3545', 
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
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
          style={{ width: '100%', resize: 'none' }}
          placeholder="따뜻한 댓글을 남겨주세요."
        />
        <div style={{ marginTop: 6, textAlign: 'right' }}>
          <button onClick={() => submitComment(commentInput)}>등록</button>
        </div>
      </div>

      <div>
        {(post.comments || [])
          .slice() // 원본 배열을 바꾸지 않기 위해 복사본을 만듭니다.
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) // 시간순 정렬
          .map((c) => (
            <Comment key={c.id} comment={c} onReplySubmit={submitComment} user={user} />
        ))}
      </div>
    </div>
  );
};

export default PostDetail;