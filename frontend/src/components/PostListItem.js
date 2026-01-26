import React from 'react';
import './PostListItem.css';

const PostListItem = ({ title, date, authorNickname, likesCount, commentsCount, onClick }) => {
    return (
        <div className="post-list-item" onClick={onClick}>
            <div className="post-item-top">
                <div className="post-item-title">{title}</div>
                <div className="post-item-date">{date}</div>
            </div>

            <div className="post-item-bottom">
                <div className="post-item-user">
                    <div className="user-icon-box">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <span className="user-name">{authorNickname || '익명'}</span>
                </div>

                <div className="post-item-stats">
                    <div className="stat-badge">
                        <span className="stat-icon">👍</span>
                        <span className="stat-count">({likesCount || 0})</span>
                    </div>
                    <div className="stat-badge">
                        <span className="stat-icon">💬</span>
                        <span className="stat-count">({commentsCount || 0})</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostListItem;
