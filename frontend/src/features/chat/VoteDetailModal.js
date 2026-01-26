import React, { useState, useEffect } from 'react';
import './VoteDetailModal.css';

const VoteDetailModal = ({ vote, comments = [], onClose, onSubmitVote, onCancelVote, onOpenStatus, onSubmitComment, userNickname }) => {
    const [selectedOption, setSelectedOption] = useState(vote.myVotedOption !== undefined ? vote.myVotedOption : null);
    const [timeLeft, setTimeLeft] = useState('');
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

    // ... (logic) ...



    useEffect(() => {
        if (vote.myVotedOption !== undefined) {
            setSelectedOption(vote.myVotedOption);
        }
    }, [vote.myVotedOption]);

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const end = new Date(vote.deadline);
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft('투표 종료');
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);

            let str = '';
            if (days > 0) str += `${days}일 `;
            str += `${hours}시간 ${minutes}분`;
            setTimeLeft(str);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 60000); // Update every minute
        return () => clearInterval(interval);
    }, [vote.deadline]);

    const isVoted = vote.isVoted;

    const handleVote = () => {
        if (isVoted) return;

        if (vote.allowMultiple) {
            if (!Array.isArray(selectedOption) || selectedOption.length === 0) {
                alert('항목을 최소 하나 이상 선택해주세요.');
                return;
            }
        } else {
            if (selectedOption === null) {
                alert('항목을 선택해주세요.');
                return;
            }
        }
        onSubmitVote(vote, selectedOption);
    };

    const toggleOption = (idx) => {
        if (isVoted) return;

        if (vote.allowMultiple) {
            setSelectedOption(prev => {
                const current = Array.isArray(prev) ? prev : [];
                if (current.includes(idx)) {
                    return current.filter(i => i !== idx);
                } else {
                    return [...current, idx];
                }
            });
        } else {
            setSelectedOption(idx);
        }
    };

    const handleCommentSubmit = () => {
        if (!commentText.trim()) return;

        onSubmitComment && onSubmitComment(vote, commentText);
        setCommentText('');
    };

    return (
        <div className="vote-modal-overlay" onClick={onClose}>
            <div className="vote-detail-container" onClick={e => e.stopPropagation()}>
                {/* ... */}
                <div className="vote-status-link" onClick={() => onOpenStatus && onOpenStatus(vote)}>
                    현황 보기 {'>'}
                </div>
                <div className="vote-detail-header">
                    <button className="vote-detail-back" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        <span>뒤로 가기</span>
                    </button>

                </div>

                {/* Title */}
                <div className="vote-detail-title">{vote.title}</div>

                {/* Options */}
                <div className="vote-detail-options">
                    {vote.options.map((opt, idx) => {
                        const isSelected = vote.allowMultiple
                            ? (Array.isArray(selectedOption) && selectedOption.includes(idx))
                            : selectedOption === idx;

                        return (
                            <button
                                key={idx}
                                disabled={isVoted}
                                className={`vote-option-btn ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleOption(idx)}
                                style={isVoted ? { cursor: 'default', opacity: 0.8 } : {}}
                            >
                                {idx + 1}. {opt}
                            </button>
                        );
                    })}
                </div>

                {/* Vote Button */}
                {/* Vote Button */}
                {!isVoted ? (
                    <button className="vote-action-btn" onClick={handleVote}>
                        투표하기
                    </button>
                ) : (
                    <button
                        className="vote-action-btn"
                        onClick={() => {
                            if (window.confirm('투표를 취소하시겠습니까?')) {
                                onCancelVote && onCancelVote(vote);
                            }
                        }}
                        style={{ backgroundColor: '#EF4444', cursor: 'pointer' }}
                    >
                        투표 취소
                    </button>
                )}

                <div className="vote-divider"></div>

                {/* Footer Info */}
                <div className="vote-info-section">
                    <span className="vote-time-label">투표 종료까지 남은 시간</span>
                    <div className="vote-time-val">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>{timeLeft}</span>
                    </div>
                </div>

                <div className="vote-sub-info">
                    * {vote.allowMultiple ? '복수 선택 가능' : '복수 선택 불가능'}<br />
                    * {vote.isAnonymous ? '익명' : '공개 투표'}
                </div>


                <div className="vote-comment-label">댓글</div>
                <div className="vote-detail-comments-scroll">
                    {(() => {
                        const uniqueLocals = localComments.filter(lc => !comments.some(c => c.text === lc.text && c.sender === lc.sender));
                        const allToRender = [...comments, ...uniqueLocals];

                        return allToRender.length === 0 ? (
                            <div className="vote-no-comment-msg">첫 댓글을 남겨보세요!</div>
                        ) : (
                            allToRender.map((c, i) => {
                                const isMine = c.sender === userNickname;
                                return (
                                    <div key={i} className={`vote-detail-comment-item ${isMine ? 'mine' : ''}`}>
                                        <div className="vdc-top">
                                            <span className="vdc-sender">{c.sender}</span>
                                            <span className="vdc-time">{c.time}</span>
                                        </div>
                                        <div className="vdc-text">{c.text}</div>
                                    </div>
                                );
                            })
                        );
                    })()}
                </div>
                <div className="vote-comment-input-row">
                    <input
                        className="vote-comment-box"
                        placeholder="댓글을 입력하세요"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit()}
                    />
                    <button className="vote-comment-btn" onClick={handleCommentSubmit}>등록</button>
                </div>
            </div>
        </div>
    );
};

export default VoteDetailModal;
