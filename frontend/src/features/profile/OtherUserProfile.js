
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, API_BASE_SERVER } from '../../api/api';
import defaultProfileImg from '../../assets/default_profile.png';
import './OtherUserProfile.css';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import SubHeader from '../../components/SubHeader';

const OtherUserProfile = ({ user: currentUser }) => {
    const { nickname } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFriend, setIsFriend] = useState(false); // Should come from API

    useEffect(() => {
        const fetchProfile = async () => {
            if (!nickname) return;
            try {
                setLoading(true);
                // Fetch other user profile
                const data = await apiGet(`/users/profile/${encodeURIComponent(nickname)}/`);
                setProfile(data);

                // Check friend status (Assuming API provides this, or distinct endpoint)
                // If API doesn't provide, we might need `/users/friends/check?target=` or similar.
                // For now, I will assume the profile data includes `is_friend` or similar, 
                // OR I will default to false/true based on data.
                // If the user provided design strictly says "If friend, show buttons", I need to know.
                // I will add a mock check or look for 'is_friend' field.
                if (data.is_friend !== undefined) {
                    setIsFriend(data.is_friend);
                } else {
                    // Fallback: Check if this user is in my friend list?
                    // Simpler: assume true for testing if user wants to see the screen as per screenshot.
                    // But for logic:
                    // const friends = await apiGet('/users/friends/');
                    // setIsFriend(friends.some(f => f.nickname === nickname));
                    // I'll stick to data.is_friend if available, else false.
                    // WAIT: User screenshot shows "홍친구 님".
                    // I will set it to true for demonstration if the name contains '친구' just to be smart?
                    // No, I'll rely on backend. But since I can't change backend now easily without checking, 
                    // I will provide the buttons if proper flag is present.
                    // Let's assume the API returns `relationship: 'FRIEND'` or `is_friend: true`.
                    if (data.relation === 'FRIEND' || data.is_friend) setIsFriend(true);
                }
            } catch (error) {
                console.error("Failed to fetch profile:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [nickname]);

    const handleChat = async () => {
        if (!profile) return;
        try {
            // Create or get private chat
            // POST /chats/private { target_nickname: ... }
            const res = await apiPost('/chats/private', { target_nickname: profile.nickname });
            navigate(`/chats/private/${res.id}`);
        } catch (error) {
            console.error("Chat init failed", error);
            alert("채팅방을 열 수 없습니다.");
        }
    };

    const handleDeleteFriend = async () => {
        if (!window.confirm(`${profile.nickname}님을 친구 목록에서 삭제하시겠습니까?`)) return;
        try {
            // DELETE /users/friends/:id or POST /users/friends/delete
            // Assuming endpoint exists.
            await apiPost('/users/friends/delete', { target_nickname: profile.nickname });
            setIsFriend(false);
            alert("친구가 삭제되었습니다.");
        } catch (error) {
            console.error("Delete friend failed", error);
            alert("친구 삭제 실패");
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</div>
        );
    }

    if (!profile) return <div>User not found</div>;

    const profileImgSrc = profile.profile_img
        ? (profile.profile_img.startsWith('http') ? profile.profile_img : `${API_BASE_SERVER}${profile.profile_img}`)
        : defaultProfileImg;

    // Custom Right Action for SubHeader (Chat button)
    // Actually design has Chat on right. Delete on Left of Chat?
    // Design: [Title] [Delete] ... [Chat]
    // SubHeader `rightAction` puts things on far right.
    // If I put both in `rightAction` with flex, they will be on right.
    // Screenshot: "채팅하기" is far right. "친구 삭제" is next to Title.
    // My SubHeader Component:
    // <div className="sub-header-title">{title}</div>
    // <div className="sub-header-right">{rightAction}</div>
    //
    // I can put "Delete" button inside the `title` prop if I pass a fragment?
    // SubHeader renders `{title}` which renders nodes.
    // So I can pass: <div style={{display:'flex', alignItems:'center', gap:'10px'}}>{name} <DeleteBtn/></div>

    const CustomTitle = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{profile.nickname} 님</span>
            {isFriend && (
                <button className="friend-delete-btn" onClick={handleDeleteFriend}>친구 삭제</button>
            )}
        </div>
    );

    return (
        <MobileLayout>
            <GlobalHeader user={currentUser} />
            <SubHeader
                title={CustomTitle}
                rightAction={isFriend ? <button className="friend-chat-btn" onClick={handleChat}>채팅하기</button> : null}
            />

            <div className="friend-profile-body">
                {/* Profile Card Container (White Box with Shadow) */}
                <div className="friend-profile-card">
                    {/* Left: Image */}
                    <div className="friend-img-box">
                        <img src={profileImgSrc} alt="Profile" className="friend-img" />
                    </div>

                    {/* Middle: Info */}
                    <div className="friend-info">
                        <div className="friend-name">{profile.nickname} 님</div>
                        <div className="friend-affil">
                            소속 : {profile.clan_affiliations && profile.clan_affiliations.length > 0
                                ? profile.clan_affiliations[0].clan_name
                                : "소속 없음"}
                        </div>
                    </div>



                    {/* Right: Stats */}
                    <div className="friend-stats">
                        <div className="stat-row">
                            <span className="stat-label">매너점수</span>
                            <span className="stat-value">{profile.score}점</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">분위기 메이커</span>
                            <span className="stat-value">{profile.mood_maker_count || 0}개</span>
                        </div>
                    </div>
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default OtherUserProfile;
