import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from "../../api/api";
import MobileLayout from "../../components/MobileLayout";
import GlobalHeader from "../../components/GlobalHeader";
import BottomNav from "../../components/BottomNav";
import "./ChatList.css";

const ChatList = ({ user }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'friend'
    const [unifiedChats, setUnifiedChats] = useState([]);
    const [privateChats, setPrivateChats] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [unreadCounts, setUnreadCounts] = useState({});

    const handleAccept = async (requestId) => {
        try {
            await apiPost('/users/friends/accept/', { request_id: requestId });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "오류");
        }
    };

    const handleReject = async (requestId) => {
        if (!window.confirm("거절하시겠습니까?")) return;
        try {
            await apiPost('/users/friends/reject/', { request_id: requestId });
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "오류");
        }
    };

    const fetchData = useCallback(async () => {
        if (!user?.nickname) return;
        try {
            // [수정] Fetch Unified Chat List
            const [chatData, friendData, unreadData] = await Promise.all([
                apiGet(`/users/chats/list/`),
                apiGet(`/users/friends/${user.nickname}/`),
                apiGet(`/chats/summary/`)
            ]);

            setUnifiedChats(Array.isArray(chatData) ? chatData : []);
            setFriends(friendData.friends || []);
            setPendingRequests(friendData.pending_requests || []);
            setUnreadCounts(unreadData || {});
            setPrivateChats(friendData.friends || []);

        } catch (err) {
            console.error("Chat data fetch error:", err);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const renderChatTab = () => (
        <div className="chat-content">
            {/* Unified Group Chats (Clans + Rooms) Sorted by Time */}
            <div className="chat-section">
                <div className="chat-section-header">채팅 목록</div>
                <div className="chat-items-container">
                    {unifiedChats.length > 0 ? unifiedChats.map(chat => {
                        let chatUrl = "";
                        let defaultImg = "https://placehold.co/48x48";

                        if (chat.type === 'clan') {
                            chatUrl = `/chats/clan/${chat.id}`;
                        } else {
                            chatUrl = `/chats/group/${chat.id}`;
                        }

                        const count = unreadCounts[chatUrl] || 0;
                        const img = chat.image || defaultImg;
                        const title = chat.title || (chat.type === 'clan' ? "클랜 채팅" : "합주방");

                        return (
                            <Link to={chatUrl} key={`${chat.type}-${chat.id}`} style={{ textDecoration: 'none' }}>
                                <div className="chat-item-card">
                                    <img src={img} alt={title} className="chat-item-img" />
                                    <div className="chat-item-info">
                                        <div className="chat-item-name">{title}</div>
                                        <div className="chat-item-message">
                                            {/* Preview Text */}
                                            {count > 0 ? "새로운 메시지가 있습니다." : (chat.desc || "대화 내역이 없습니다.")}
                                        </div>
                                    </div>
                                    <div className="chat-msg-time">
                                        <div className="chat-preview-right">
                                            {count > 0 ? "새 메세지" : ""}
                                        </div>
                                        {count > 0 && <div className="chat-badge">{count}</div>}
                                    </div>
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="empty-chat">참여 중인 채팅방이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* Private Chats (Still separate as per design, or should strictly follow 'all in one'?) 
                User said "Clan chat Band chat ...".
                Usually proper app mixes Private too.
                But I didn't add Private to Unified API yet.
                I will keep Private section below for now. */}
            <div className="chat-section">
                <div className="chat-section-header">개인 채팅</div>
                {/* ... existing private chat render ... */}
                <div className="chat-items-container">
                    {privateChats.length > 0 ? privateChats.map(friend => {
                        const chatUrl = `/chats/direct/${friend.nickname}`;
                        const count = unreadCounts[chatUrl] || 0;
                        const profileImg = friend.profile_img || "https://placehold.co/48x48";

                        return (
                            <Link to={`/chats/direct/${friend.nickname}`} key={`friend-${friend.id}`} style={{ textDecoration: 'none' }}>
                                <div className="chat-item-card">
                                    <img src={profileImg} alt={friend.nickname} className="chat-item-img" />
                                    <div className="chat-item-info">
                                        <div className="chat-item-name">{friend.nickname}</div>
                                        <div className="chat-item-message">
                                            {count > 0 ? "새로운 메시지가 도착했습니다." : "최근 대화내역 없음"}
                                        </div>
                                    </div>
                                    <div className="chat-msg-time">
                                        <div className="chat-preview-right">
                                            {count > 0 ? "새 메세지" : ""}
                                        </div>
                                        {count > 0 && <div className="chat-badge">{count}</div>}
                                    </div>
                                </div>
                            </Link>
                        );
                    }) : (
                        <div className="empty-chat">개인 채팅이 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );

    const renderFriendTab = () => {
        const filteredFriends = friends.filter(f => f.nickname.toLowerCase().includes(searchTerm.toLowerCase()));
        return (
            <div className="friend-tab-container">
                {/* Search Bar Area */}
                <div className="friend-search-area">
                    <div className="friend-search-bar">
                        <div className="search-icon-wrapper">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input
                            type="text"
                            placeholder="친구 검색"
                            className="friend-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="friend-add-btn-wrapper" onClick={() => navigate('/chats/friends/add')}>
                        <div className="user-plus-icon">
                            <svg width="20" height="14" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="friend-content-scroll">
                    {pendingRequests.length > 0 && (
                        <div className="new-friends-container">
                            <div className="section-title">새로운 친구</div>
                            {pendingRequests.map(req => (
                                <div key={req.id} className="friend-request-item">
                                    <div className="friend-info">
                                        <img src={req.from_user.profile_img || "https://placehold.co/48x48"} alt="" className="friend-profile-img" />
                                        <span className="friend-name">{req.from_user.nickname}</span>
                                    </div>
                                    <div className="friend-actions">
                                        <button className="btn-reject" onClick={() => handleReject(req.id)}>거절</button>
                                        <button className="btn-accept" onClick={() => handleAccept(req.id)}>수락</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="friend-list-container">
                        <div className="section-title">친구 목록</div>
                        {filteredFriends.map(friend => (
                            <Link to={`/profile/${friend.nickname}`} key={friend.id} className="friend-item-link">
                                <div className="friend-item">
                                    <img src={friend.profile_img || "https://placehold.co/48x48"} alt="" className="friend-profile-img" />
                                    <span className="friend-name">{friend.nickname}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            <div className="chat-list-container">
                {/* Custom Tabs */}
                <div className="chat-tabs">
                    <div
                        className={`chat-tab ${activeTab === 'chat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        채팅
                    </div>
                    <div
                        className={`chat-tab ${activeTab === 'friend' ? 'active' : ''}`}
                        onClick={() => setActiveTab('friend')}
                    >
                        친구
                    </div>
                </div>

                {/* Content */}
                {activeTab === 'chat' ? renderChatTab() : renderFriendTab()}
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default ChatList;