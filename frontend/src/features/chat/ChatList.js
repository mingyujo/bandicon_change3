// [전체 코드] src/features/chat/ChatList.js
import React, { useEffect, useState, useCallback } from "react";
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from "../../api/api";

const ChatList = ({ user }) => {
    // 배포 확인용 로그 (콘솔에서 확인 가능)
    console.log("🚀 ChatList Loaded: White Screen Fix Applied (2025-12-26 01:13)");

    const [myRooms, setMyRooms] = useState([]);
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [newFriend, setNewFriend] = useState("");
    const [unreadCounts, setUnreadCounts] = useState({});

    const fetchData = useCallback(async () => {
        if (!user?.nickname) return;
        try {
            const [roomData, friendData, unreadData] = await Promise.all([
                apiGet(`/rooms/my/${user.nickname}`),
                apiGet(`/users/friends/${user.nickname}/`),
                apiGet(`/chats/summary?nickname=${encodeURIComponent(user.nickname)}`)
            ]);
            setMyRooms(Array.isArray(roomData) ? roomData : (roomData?.results || []));
            setFriends(friendData.friends || []);
            setPendingRequests(friendData.pending_requests || []);
            setUnreadCounts(unreadData || {});
        } catch (err) {
            console.error("채팅 목록 데이터 불러오기 실패:", err);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000); // 5초마다 데이터 새로고침
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleAddFriend = async (e) => {
        e.preventDefault();
        if (!newFriend.trim() || newFriend === user.nickname) {
            alert("유효한 닉네임을 입력해주세요.");
            return;
        }
        try {
            const res = await apiPost("/users/friends/request/", { sender: user.nickname, receiver_nickname: newFriend });
            alert(res.message);
            setNewFriend("");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "친구 요청 중 오류 발생");
        }
    };

    const handleAcceptFriend = async (requestId) => {
        try {
            await apiPost("/users/friends/accept/", { request_id: requestId });
            alert("친구 요청을 수락했습니다.");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "친구 수락 실패");
        }
    };

    const handleRejectFriend = async (requestId) => {
        try {
            await apiPost("/users/friends/reject/", { request_id: requestId });
            alert("친구 요청을 거절했습니다.");
            fetchData();
        } catch (err) {
            alert(err.response?.data?.detail || "친구 거절 실패");
        }
    }

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h2 className="page-title">채팅</h2>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>친구 추가</h3>
                <form onSubmit={handleAddFriend} style={{ display: 'flex', gap: '10px' }}>
                    <input value={newFriend} onChange={(e) => setNewFriend(e.target.value)} placeholder="닉네임으로 추가" className="input-field" style={{ margin: 0, flex: 1 }} />
                    <button type="submit" className="btn btn-primary">요청</button>
                </form>
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>받은 친구 요청</h3>
                {Array.isArray(pendingRequests) && pendingRequests.length > 0 ? pendingRequests.map(req => (
                    <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--light-gray)' }}>
                        <span><Link to={`/profile/${req.sender.nickname}`}>{req.sender.nickname}</Link> 님의 요청</span>
                        <div>
                            <button onClick={() => handleAcceptFriend(req.id)} className="btn btn-secondary" style={{ marginLeft: '5px' }}>수락</button>
                            <button onClick={() => handleRejectFriend(req.id)} className="btn btn-secondary" style={{ marginLeft: '5px' }}>거절</button>
                        </div>
                    </div>
                )) : <p style={{ fontSize: '0.9em', color: '#666' }}>받은 요청이 없습니다.</p>}
            </div>

            <div className="card" style={{ marginBottom: '20px' }}>
                <h3 style={{ marginTop: 0 }}>친구 목록</h3>
                {Array.isArray(friends) && friends.map(friend => {
                    const chatUrl = `/chats/direct/${friend.nickname}`;
                    const unreadCount = unreadCounts[chatUrl] || 0;
                    return (
                        <div key={`direct-${friend.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--light-gray)' }}>
                            <Link to={`/profile/${friend.nickname}`} style={{ textDecoration: 'none', color: 'inherit', fontWeight: '500' }}>
                                {friend.nickname}
                                {unreadCount > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8em' }}>{unreadCount}</span>}
                            </Link>
                            <Link to={chatUrl}>
                                <button className="btn btn-primary">채팅</button>
                            </Link>
                        </div>
                    )
                })}
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>단체 채팅방</h3>

                {/* --- 1. 합주방 채팅 목록 (기존과 동일) --- */}
                {Array.isArray(myRooms) && myRooms.map(room => {
                    const chatUrl = `/chats/group/${room.id}`;
                    const unreadCount = unreadCounts[chatUrl] || 0;
                    return (
                        <div key={`group-${room.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--light-gray)' }}>
                            <span style={{ fontWeight: '500' }}>{room.title}
                                {unreadCount > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8em' }}>{unreadCount}</span>}
                            </span>
                            <Link to={chatUrl}>
                                <button className="btn btn-primary">채팅</button>
                            </Link>
                        </div>
                    )
                })}

                {/* --- 2. [추가] 클랜 단체 채팅 목록 --- */}
                {user.clans && Array.isArray(user.clans) && user.clans.map(clan => {
                    const chatUrl = `/chats/clan/${clan.id}`;
                    const unreadCount = unreadCounts[chatUrl] || 0;
                    return (
                        <div key={`clan-${clan.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--light-gray)' }}>
                            <span style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                [클랜] {clan.name}
                                {unreadCount > 0 && <span style={{ marginLeft: '8px', background: '#ef4444', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '0.8em' }}>{unreadCount}</span>}
                            </span>
                            <Link to={chatUrl}>
                                <button className="btn btn-primary" style={{ background: '#6c757d' }}>채팅</button>
                            </Link>
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default ChatList;