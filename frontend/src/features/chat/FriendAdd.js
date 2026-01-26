import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import { apiGet, apiPost } from '../../api/api';
import './FriendAdd.css';

const FriendAdd = ({ user }) => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [notFound, setNotFound] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        if (e.key === 'Enter') {
            if (!searchTerm.trim()) return;
            setLoading(true);
            setSearchResult(null);
            setNotFound(false);
            try {
                // Search by Profile View API
                const res = await apiGet(`/users/profile/${encodeURIComponent(searchTerm)}/`);
                if (res && res.nickname) {
                    setSearchResult(res);
                } else {
                    setNotFound(true);
                }
            } catch (err) {
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }
    };

    const sendFriendRequest = async () => {
        if (!searchResult) return;
        if (!window.confirm(`${searchResult.nickname}님에게 친구 요청을 보내시겠습니까?`)) return;

        try {
            await apiPost('/users/friends/request/', { receiver_nickname: searchResult.nickname });
            alert('친구 요청을 보냈습니다.');
            navigate('/chats');
        } catch (err) {
            alert(err.response?.data?.detail || "요청 실패");
        }
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <div className="friend-add-page">
                {/* Sub Header (Back + Title) */}
                <div className="sub-header">
                    <div className="back-btn" onClick={() => navigate(-1)}>
                        {/* Chevron Icon */}
                        <svg width="14" height="24" viewBox="0 0 14 24" fill="none">
                            <path d="M12 2L2 12L12 22" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="friend-add-title">친구 추가</div>
                </div>

                <div className="friend-add-content">
                    {/* Search Bar */}
                    <div className="add-search-bar">
                        <div className="search-icon-area">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            type="text"
                            className="add-search-input"
                            placeholder="친구 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={handleSearch}
                        />
                    </div>

                    {/* Result */}
                    {loading && <div className="not-found-msg">검색 중...</div>}
                    {notFound && <div className="not-found-msg">검색 결과가 없습니다.</div>}

                    {searchResult && (
                        <div className="search-result-card">
                            <div className="result-user-info">
                                <img src={searchResult.profile_img || "https://placehold.co/48x48"} alt="" className="result-user-img" />
                                <span className="result-user-name">{searchResult.nickname}</span>
                            </div>
                            <div className="plus-action-btn" onClick={sendFriendRequest}>
                                {/* Plus Icon (Bigger and Blue as requested) */}
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="16"></line>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <BottomNav />
        </MobileLayout>
    );
};
export default FriendAdd;
