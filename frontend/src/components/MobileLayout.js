import React from 'react';
import './MobileLayout.css';

const MobileLayout = ({ children, className = '' }) => {
    return (
        <div className="mobile-layout-wrapper">
            <div className={`mobile-layout-container ${className}`}>
                {children}
            </div>
        </div>
    );
};

export default MobileLayout;
