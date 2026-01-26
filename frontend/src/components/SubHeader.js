import React from 'react';
import { useNavigate } from 'react-router-dom';
import './SubHeader.css';

const SubHeader = ({ title, onBackClick, rightAction = null }) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBackClick) {
            onBackClick();
        } else {
            navigate(-1);
        }
    };

    return (
        <div className="sub-header-container">
            <div className="sub-header-left">
                <div className="sub-header-back-btn" onClick={handleBack}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </div>
            </div>
            <div className="sub-header-title">
                {title}
            </div>
            <div className="sub-header-right">
                {rightAction}
            </div>
        </div>
    );
};

export default SubHeader;
