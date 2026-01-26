import React from 'react';
import './VoteListModal.css';

const VoteListModal = ({ votes, onClose, onSelectVote, userNickname }) => {

    // Helper to determine status if not explicitly provided
    // status: 'unvoted' | 'voted' | 'expired'
    const getStatus = (vote) => {
        const now = new Date();
        const deadline = new Date(vote.deadline);
        if (deadline < now) return 'expired';

        // Mock logic for 'voted' check - in real app, check if user ID is in vote.participants
        // For demo, if specific flag is set or random default logic if data missing
        if (vote.isVoted) return 'voted';

        return 'unvoted';
    };

    return (
        <div className="vote-modal-overlay" onClick={onClose}>
            <div className="vote-list-container" onClick={e => e.stopPropagation()}>
                <div className="vote-list-header">
                    <button className="vote-back-btn" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        <span>뒤로 가기</span>
                    </button>
                    <div className="vote-list-title">투표 목록</div>
                </div>

                <div className="vote-list-scroll">
                    {votes && votes.length > 0 ? (
                        votes.map((vote, idx) => {
                            const status = getStatus(vote);
                            return (
                                <div
                                    key={idx}
                                    className={`vote-item ${status}`}
                                    onClick={() => onSelectVote(vote)}
                                >
                                    <div className="vote-item-title">{vote.title}</div>
                                    <svg className="vote-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#94A3B8' }}>
                            진행 중인 투표가 없습니다.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VoteListModal;
