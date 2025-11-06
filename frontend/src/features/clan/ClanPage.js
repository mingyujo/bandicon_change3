import React, { useState, useEffect, useCallback } from 'react';
import { apiGet, apiPost } from '../../api/api';
import { useNavigate } from 'react-router-dom';

const ClanPage = ({ user }) => {
    const [clans, setClans] = useState([]);
    const [myClan, setMyClan] = useState(null);
    const [clanName, setClanName] = useState('');
    const [clanDesc, setClanDesc] = useState('');
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const allClans = await apiGet('/clans');
            setClans(allClans);
            if (user.clan_id) {
                const myClanData = await apiGet(`/clans/${user.clan_id}`);
                setMyClan(myClanData);
            }
        } catch (error) {
            console.error("클랜 정보 로딩 실패:", error);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateClan = async (e) => {
        e.preventDefault();
        try {
            await apiPost(`/clans?nickname=${user.nickname}`, { name: clanName, description: clanDesc });
            alert('클랜이 생성되었습니다!');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.detail || "클랜 생성 실패");
        }
    };

    const handleJoinClan = async (clanId) => {
        try {
            const res = await apiPost(`/clans/${clanId}/join?nickname=${user.nickname}`);
            alert(res.message);
        } catch (error) {
            alert(error.response?.data?.detail || "가입 신청 실패");
        }
    };
    
    // ... ClanDetail, ClanManagement 로직이 추가될 부분 ...

    if (myClan) {
        // 내 클랜이 있을 경우 상세 정보 페이지 렌더링 (추후 ClanDetail 컴포넌트로 분리)
        return (
            <div>
                <h1>{myClan.name}</h1>
                <p>{myClan.description}</p>
                <h3>멤버</h3>
                <ul>
                    {myClan.members.map(m => <li key={m.nickname}>{m.nickname}</li>)}
                </ul>
                {/* 여기에 공지사항, 회계, 이벤트 기능이 추가됨 */}
            </div>
        );
    }

    return (
        <div>
            <h1>클랜</h1>
            {user.role === '간부' && !user.clan_id && (
                <form onSubmit={handleCreateClan}>
                    <h2>클랜 생성</h2>
                    <input value={clanName} onChange={e => setClanName(e.target.value)} placeholder="클랜 이름" required />
                    <textarea value={clanDesc} onChange={e => setClanDesc(e.target.value)} placeholder="클랜 설명" />
                    <button type="submit">생성하기</button>
                </form>
            )}
            <h2>클랜 목록</h2>
            {clans.map(clan => (
                <div key={clan.id} style={{border: '1px solid #ddd', padding: '10px', margin: '10px 0'}}>
                    <h3>{clan.name} (클랜장: {clan.owner.nickname})</h3>
                    <p>{clan.description}</p>
                    {!user.clan_id && <button onClick={() => handleJoinClan(clan.id)}>가입 신청</button>}
                </div>
            ))}
        </div>
    );
};

export default ClanPage;