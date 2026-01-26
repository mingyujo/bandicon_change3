import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './BottomNav.css'; // Assume basic standard styles or inline

const BottomNav = () => {
    const location = useLocation();
    const currentPath = location.pathname;

    const isActive = (path) => {
        if (path === '/') return currentPath === '/';
        return currentPath.startsWith(path);
    };

    // Active color: #0ea5e9 (Sky Blue) - matching Home design
    // Inactive color: #083344 (Dark Blue/Grey) - original
    const getColor = (path) => isActive(path) ? '#0ea5e9' : '#083344';

    return (
        <div className="bottom-nav-fixed">
            <Link to="/rooms" className="nav-item">
                <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke={getColor('/rooms')} strokeWidth="2">
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
            </Link>
            <Link to="/boards" className="nav-item">
                <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke={getColor('/boards')} strokeWidth="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                </svg>
            </Link>
            <Link to="/" className="nav-item">
                <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke={getColor('/')} strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
            </Link>
            <Link to="/clans" className="nav-item">
                <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke={getColor('/clans')} strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
            </Link>
            <Link to="/ambassador" className="nav-item">
                <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke={getColor('/ambassador')} strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
            </Link>
        </div>
    );
};

export default BottomNav;
