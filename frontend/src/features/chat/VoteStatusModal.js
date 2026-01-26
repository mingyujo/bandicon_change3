import React, { useState, useEffect } from 'react';
import './VoteStatusModal.css';

const VoteStatusModal = ({ vote, participantsMap, comments = [], onClose, userNickname, onSubmitComment }) => {
    const [commentText, setCommentText] = useState('');
    const [localComments, setLocalComments] = useState([]);

    useEffect(() => {
        const key = `vote_comments_${vote.id}`;
        try {
            const saved = sessionStorage.getItem(key);
            if (saved) {
                setLocalComments(JSON.parse(saved));
            }
        } catch (e) { }
    }, [vote.id]);

    const handleCommentSubmit = () => {
        if (!commentText.trim()) return;

        onSubmitComment && onSubmitComment(vote, commentText);
        setCommentText('');
    };

    // participantsMap: { [optionIdx]: [ { nickname, image } ] }

    const totalVotes = Object.values(participantsMap).reduce((acc, curr) => acc + curr.length, 0);

    const getPercent = (count) => {
        if (totalVotes === 0) return 0;
        return Math.round((count / totalVotes) * 100);
    };

    return (
        <div className="vote-status-overlay" onClick={onClose}>
            <div className="vote-status-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="vote-status-header">
                    <button className="vote-status-back" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        <span>뒤로 가기</span>
                    </button>
                    <div className="vote-status-title">{vote.title}</div>
                </div>

                <div className="vote-status-scroll">
                    {/* Options & Results */}
                    {vote.options.map((opt, idx) => {
                        const users = participantsMap[idx] || [];
                        const count = users.length;
                        const percent = getPercent(count);
                        const isHigh = percent >= 50; // Simple logic for styling

                        return (
                            <div key={idx} className="vote-result-block">
                                {/* Bar */}
                                <div className="vote-result-bar-area">
                                    <div
                                        className={`vote-result-fill ${isHigh ? '' : 'secondary'}`}
                                        style={{ width: `${percent}%` }}
                                    ></div>
                                    <span className={`vote-result-text ${isHigh ? 'light' : ''}`}>
                                        {idx + 1}. {opt}
                                    </span>
                                    <span className={`vote-result-percent ${isHigh ? 'light' : ''}`}>
                                        {percent}%
                                    </span>
                                </div>

                                {/* Participants */}
                                {!vote.isAnonymous ? (
                                    <div className="vote-participant-grid">
                                        {users.map((u, pIdx) => (
                                            <div key={pIdx} className="vote-participant-item">
                                                <div className="vote-participant-avatar">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <div className="vote-participant-name">{u.nickname}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: '11px', color: '#94A3B8', paddingLeft: '2px', marginTop: '-8px' }}>
                                        익명 투표 (참여자 {users.length}명)
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <div className="vote-status-divider"></div>

                    {/* Comments (Mock for now, or extracted from history if implemented) */}
                    <div className="vote-comments-section">
                        <div className="vote-comments-label">댓글</div>
                        {(() => {
                            const uniqueLocals = localComments.filter(lc => !comments.some(c => c.text === lc.text && c.sender === lc.sender));
                            const allToRender = [...comments, ...uniqueLocals];

                            return allToRender.length === 0 ? (
                                <div style={{ fontSize: '12px', color: '#999', textAlign: 'center', padding: '10px' }}>작성된 댓글이 없습니다.</div>
                            ) : (
                                allToRender.map((c, i) => {
                                    const isMine = c.sender === userNickname;
                                    return (
                                        <div key={i} className={`vote-comment-item ${isMine ? 'mine' : ''}`}>
                                            <div className="vc-avatar">
                                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#eee" stroke="#999" strokeWidth="1"><circle cx="12" cy="12" r="10" /></svg>
                                            </div>
                                            <div className="vc-content">
                                                <div className="vc-bubble">
                                                    {c.text}
                                                </div>
                                                <div className="vc-time">{c.time}</div>
                                            </div>
                                        </div>
                                    );
                                })
                            );
                        })()}
                    </div>
                </div>

                <div className="vote-status-input-area">
                    <input
                        className="vote-status-input"
                        placeholder="댓글을 입력하세요"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    />
                    <button className="vote-status-btn" onClick={handleCommentSubmit}>등록</button>
                </div>

            </div>
        </div>
    );
};

export default VoteStatusModal;
