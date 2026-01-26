import React, { useState, useEffect } from 'react';
import { apiGet } from '../../api/api';
import { useNavigate } from 'react-router-dom';
import MobileLayout from '../../components/MobileLayout';
import BottomNav from '../../components/BottomNav';
import GlobalHeader from '../../components/GlobalHeader';
import './MyClans.css';

function MyClans({ user }) {
    const navigate = useNavigate();

    const [clans, setClans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyClans = async () => {
            if (!user) return;
            try {
                const allClans = await apiGet('/clans/');
                console.log("DEBUG: allClans:", allClans);
                const userId = user.id || user.pk;
                console.log("DEBUG: userId:", userId);

                const myClansList = allClans.filter(clan => {
                    // Exclude rejected clans
                    if (clan.status === 'rejected') return false;

                    const isOwner = clan.owner && (clan.owner.id == userId || clan.owner.pk == userId);

                    // Check if members is array of objects or IDs
                    const isMember = clan.members && clan.members.some(m => {
                        const memberId = (typeof m === 'object') ? (m.id || m.pk) : m;
                        return memberId == userId; // Loose equality
                    });

                    if (isOwner) console.log(`DEBUG: Owner of ${clan.name}`);
                    if (isMember) console.log(`DEBUG: Member of ${clan.name}`);

                    return isOwner || isMember;
                });

                setClans(myClansList);
            } catch (error) {
                console.error("Failed to fetch my clans:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMyClans();
    }, [user]);

    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            {/* Custom Header matching the design */}
            <div className="my-clan-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    {/* Chevron Left icon */}
                    <svg width="12" height="20" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 1L2 10L11 19" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="header-title">내 클랜</div>
            </div>

            <div className="my-clan-scroll-container">
                <div className="my-clan-list">
                    {loading ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>로딩 중...</div>
                    ) : clans.length > 0 ? (
                        clans.map(clan => (
                            <div key={clan.id || clan.clan_id} className="my-clan-card" onClick={() => navigate(`/clans/${clan.id || clan.clan_id}`)}>
                                <img
                                    className="clan-img"
                                    src={clan.image || "https://placehold.co/67x67"}
                                    alt={clan.name || clan.clan_name}
                                />
                                <div className="clan-info">
                                    <div className="clan-name">{clan.name || clan.clan_name}</div>
                                    <div className="clan-desc">{clan.description || "설명 없음"}</div>
                                    <div className="clan-members">멤버 : {clan.member_count || 0}명</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>가입된 클랜이 없습니다.</div>
                    )}
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
}

export default MyClans;
