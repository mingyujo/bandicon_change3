// [새 파일] src/features/clan/ClanMemberActivity.js
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { apiGet } from '../../api/api';

const ClanMemberActivity = ({ user }) => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const [activityData, setActivityData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            const data = await apiGet(`/clans/${clanId}/activity`);
            // [Fix] 백엔드가 페이지네이션(results)을 반환할 수도 있고, 배열을 반환할 수도 있음
            if (Array.isArray(data)) {
                setActivityData(data);
            } else if (data && Array.isArray(data.results)) {
                setActivityData(data.results);
            } else {
                setActivityData([]);
            }
        } catch (error) {
            console.error("클랜 활동 현황 조회 실패:", error);
            alert("데이터를 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    }, [clanId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return activityData;

        const lowercasedFilter = searchTerm.toLowerCase();

        return activityData.filter(activity => {
            // 1. 닉네임에서 검색
            if (activity.member.nickname.toLowerCase().includes(lowercasedFilter)) {
                return true;
            }
            // 2. 참여한 방의 곡명, 아티스트명에서 검색
            return activity.participating_rooms.some(room =>
                room.song.toLowerCase().includes(lowercasedFilter) ||
                room.artist.toLowerCase().includes(lowercasedFilter)
            );
        }).map(activity => {
            // 검색어와 일치하는 방만 필터링하여 보여주기 (선택적)
            const filteredRooms = activity.participating_rooms.filter(room =>
                activity.member.nickname.toLowerCase().includes(lowercasedFilter) ||
                room.song.toLowerCase().includes(lowercasedFilter) ||
                room.artist.toLowerCase().includes(lowercasedFilter)
            );
            // 닉네임으로 검색된 경우 모든 방을 보여주기 위해 조건 추가
            if (activity.member.nickname.toLowerCase().includes(lowercasedFilter)) {
                return activity;
            }
            return { ...activity, participating_rooms: filteredRooms };
        });
    }, [searchTerm, activityData]);

    if (loading) return <div>로딩 중...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>← 뒤로가기</button>
            <h2 className="page-title">클랜원 활동 현황</h2>

            <input
                type="text"
                placeholder="닉네임, 곡명, 아티스트로 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ width: '100%', marginBottom: '20px' }}
            />

            {filteredData.length === 0 ? (
                <p>표시할 활동 내역이 없습니다.</p>
            ) : (
                filteredData.map(({ member, participating_rooms }) => (
                    <div key={member.nickname} className="card" style={{ marginBottom: '15px' }}>
                        <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                            {member.nickname}
                            <span style={{ color: 'var(--primary-color)', fontWeight: 'normal' }}> (활동: {participating_rooms.length}개)</span>
                        </h3>
                        {participating_rooms.length > 0 ? (
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {participating_rooms.map((room, index) => {
                                    // 예약 정보인지 확인
                                    const isReservation = room.session_name.includes('예약');
                                    const isManager = room.session_name === '방장';

                                    return (
                                        <li key={`${member.nickname}-${room.id}-${room.session_name}-${index}`}
                                            style={{ padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                                            <Link to={`/rooms/${room.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                                <strong>{room.song}</strong> - {room.artist}
                                                <span style={{
                                                    float: 'right',
                                                    color: isReservation ? '#ff6b35' : isManager ? '#28a745' : '#666',
                                                    background: isReservation ? '#fff3e0' : isManager ? '#e8f5e9' : '#f0f0f0',
                                                    padding: '3px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.9em',
                                                    fontWeight: isReservation || isManager ? 'bold' : 'normal'
                                                }}>
                                                    {room.session_name}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <p style={{ color: '#888' }}>활동 중인 합주방이 없습니다.</p>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ClanMemberActivity;