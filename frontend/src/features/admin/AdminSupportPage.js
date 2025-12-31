import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPostForm } from '../../api/api';

const AdminSupportPage = ({ user }) => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [filter, setFilter] = useState('all'); // all, feedback, inquiry
  const [selectedItem, setSelectedItem] = useState(null);
  const [replyContent, setReplyContent] = useState('');

  const fetchFeedbacks = useCallback(async () => {
    try {
      const url = filter === 'all'
        ? `/support/admin/feedbacks/?nickname=${user.nickname}`
        : `/support/admin/feedbacks/?type_filter=${filter}&nickname=${user.nickname}`;
      const data = await apiGet(url);
      // 답변 대기중인 것을 위로, 답변 완료를 아래로 정렬
      const sortedData = data.sort((a, b) => {
        if (a.status === 'pending' && b.status === 'answered') return -1;
        if (a.status === 'answered' && b.status === 'pending') return 1;
        return new Date(b.created_at) - new Date(a.created_at); // 같은 상태면 최신순
      });
      setFeedbacks(sortedData);
    } catch (err) {
      alert('권한이 없습니다.');
    }
  }, [filter, user.nickname]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleReply = async (feedbackId) => {
    if (!replyContent.trim()) {
      alert('답변 내용을 입력하세요.');
      return;
    }

    const formData = new FormData();
    formData.append('content', replyContent);
    formData.append('admin_nickname', user.nickname);

    try {
      await apiPostForm(`/support/admin/feedback/${feedbackId}/reply/`, formData);
      alert('답변이 전송되었습니다.');
      setReplyContent('');
      setSelectedItem(null);
      fetchFeedbacks();
    } catch (err) {
      alert('답변 전송 실패');
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: 'auto', padding: '20px' }}>
      <h2>피드백/문의 관리</h2>

      {/* 필터 */}
      <div style={{ marginBottom: '20px' }}>
        <button
          className={filter === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setFilter('all')}
          style={{ marginRight: '10px' }}
        >
          전체
        </button>
        <button
          className={filter === 'inquiry' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setFilter('inquiry')}
          style={{ marginRight: '10px' }}
        >
          문의사항
        </button>
        <button
          className={filter === 'feedback' ? 'btn btn-primary' : 'btn btn-secondary'}
          onClick={() => setFilter('feedback')}
        >
          피드백
        </button>
      </div>

      {/* 목록 */}
      <div style={{ display: 'grid', gap: '15px' }}>
        {feedbacks.map(item => (
          <div key={item.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ margin: 0 }}>{item.title}</h4>
              <div>
                <span style={{
                  background: item.type === 'feedback' ? '#4caf50' : '#2196f3',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8em',
                  marginRight: '10px'
                }}>
                  {item.type === 'feedback' ? '피드백' : '문의'}
                </span>
                <span style={{
                  background: item.status === 'answered' ? '#4caf50' : '#ff9800',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.8em'
                }}>
                  {item.status === 'answered' ? '답변완료' : '대기중'}
                </span>
              </div>
            </div>

            <p style={{ margin: '10px 0' }}>{item.content}</p>
            <small>작성자: {item.user.nickname} | {new Date(item.created_at).toLocaleDateString()}</small>

            {/* 기존 답변 표시 */}
            {item.replies && item.replies.map(reply => (
              <div key={reply.id} style={{
                marginTop: '15px',
                padding: '10px',
                background: '#f0f0f0',
                borderRadius: '5px'
              }}>
                <strong>답변 (운영자: {reply.admin.nickname}):</strong>
                <p>{reply.content}</p>
                <small>{new Date(reply.created_at).toLocaleDateString()}</small>
              </div>
            ))}

            {/* 답변 작성 (문의사항만) */}
            {item.type === 'inquiry' && item.status !== 'answered' && (
              <div style={{ marginTop: '15px' }}>
                {selectedItem === item.id ? (
                  <div>
                    <textarea
                      placeholder="답변을 작성하세요"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      style={{ width: '100%', minHeight: '100px', padding: '10px' }}
                    />
                    <div style={{ marginTop: '10px' }}>
                      <button
                        onClick={() => handleReply(item.id)}
                        className="btn btn-primary"
                        style={{ marginRight: '10px' }}
                      >
                        답변 전송
                      </button>
                      <button
                        onClick={() => { setSelectedItem(null); setReplyContent(''); }}
                        className="btn btn-secondary"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedItem(item.id)}
                    className="btn btn-primary"
                  >
                    답변 작성
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminSupportPage;