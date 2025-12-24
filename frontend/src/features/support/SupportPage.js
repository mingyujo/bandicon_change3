import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPostForm } from '../../api/api';

const SupportPage = ({ user }) => {
  const [type, setType] = useState('inquiry');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [myTickets, setMyTickets] = useState([]);

  const fetchMyTickets = useCallback(async () => {
    try {
      const data = await apiGet(`/support/my/${user.nickname}`);
      console.log("[SupportPage] Loaded v2. Data:", data);
      setMyTickets(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error("티켓 불러오기 실패:", err);
    }
  }, [user.nickname]);

  useEffect(() => {
    fetchMyTickets();
  }, [fetchMyTickets]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('type', type);
    formData.append('title', title);
    formData.append('content', content);
    formData.append('user_nickname', user.nickname);

    try {
      await apiPostForm('/support/create', formData);
      alert(type === 'feedback' ? '피드백이 전송되었습니다!' : '문의가 접수되었습니다!');
      setTitle('');
      setContent('');
      fetchMyTickets();
    } catch (err) {
      alert('전송 실패');
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
      <h2>문의/피드백 (v2)</h2>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '15px' }}>
            <label>
              <input
                type="radio"
                value="inquiry"
                checked={type === 'inquiry'}
                onChange={(e) => setType(e.target.value)}
              />
              문의사항
            </label>
            <label style={{ marginLeft: '20px' }}>
              <input
                type="radio"
                value="feedback"
                checked={type === 'feedback'}
                onChange={(e) => setType(e.target.value)}
              />
              피드백
            </label>
          </div>

          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
          />

          <textarea
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            style={{ width: '100%', minHeight: '150px', padding: '10px' }}
          />

          <button type="submit" className="btn btn-primary">
            전송
          </button>
        </form>
      </div>

      <h3 style={{ marginTop: '30px' }}>내 문의 내역</h3>
      {myTickets.length === 0 ? (
        <p>문의 내역이 없습니다.</p>
      ) : (
        myTickets.map(ticket => (
          <div key={ticket.id} className="card" style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: '10px 0' }}>{ticket.title}</h4>
              <span style={{
                background: ticket.status === 'answered' ? '#4caf50' : '#ff9800',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '0.8em'
              }}>
                {ticket.status === 'answered' ? '답변완료' : '대기중'}
              </span>
            </div>
            <p>{ticket.content}</p>
            <small>{new Date(ticket.created_at).toLocaleDateString()}</small>

            {ticket.replies && ticket.replies.length > 0 && ticket.replies.map(reply => (
              <div key={reply.id} style={{
                marginTop: '15px',
                padding: '10px',
                background: '#e3f2fd',
                borderRadius: '5px',
                borderLeft: '3px solid var(--primary-color)'
              }}>
                <strong style={{ color: 'var(--primary-color)' }}>운영자 답변:</strong>
                <p style={{ margin: '10px 0' }}>{reply.content}</p>
                <small style={{ color: '#666' }}>
                  답변일: {new Date(reply.created_at).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default SupportPage;