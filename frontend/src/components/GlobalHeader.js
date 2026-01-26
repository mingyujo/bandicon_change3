import React from 'react';
import { Link } from 'react-router-dom';
import './GlobalHeader.css';

const GlobalHeader = ({ user }) => {
    // Fallback if user is not loaded yet or passed
    const displayUser = user || JSON.parse(localStorage.getItem('bandicon_user')) || {};

    return (
        <div className="global-header-container">
            <Link to="/" className="global-brand">Bandicon</Link>
            <div className="global-right-section">
                <Link to={displayUser.nickname ? "/profile" : "/login"} className="global-profile-link">
                    {displayUser.nickname ? `${displayUser.nickname} 님` : '로그인'}
                </Link>
                <Link to="/chats" className="global-chat-icon">
                    <img src="https://placehold.co/24x24" alt="Chat" className="global-chat-img" />
                </Link>
            </div>
        </div>
    );
};

export default GlobalHeader;
