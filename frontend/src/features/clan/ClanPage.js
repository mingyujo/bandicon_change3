import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiGet, apiPostForm } from '../../api/api'; // 이미지를 포함하므로 apiPostForm 사용
import { useAuth } from '../../context/AuthContext';

// App.js로부터 user 객체를 prop으로 받습니다.
const ClanPage = () => {
    const { user } = useAuth();

    const [clans, setClans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // 새 클랜 생성을 위한 form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [image, setImage] = useState(null);

    const navigate = useNavigate();

    // 1. 모든 클랜 목록을 불러오는 함수
    const fetchClans = async () => {
        try {
            setLoading(true);
            const data = await apiGet('/clans/'); // GET /api/v1/clans/
            setClans(data);
        } catch (err) {
            console.error("Failed to fetch clans:", err);
            alert("클랜 목록을 불러오는 데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    // 페이지 로드 시 클랜 목록을 불러옵니다.
    useEffect(() => {
        fetchClans();
    }, []);

    // 2. 새 클랜 생성 핸들러
    const handleCreateClan = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            alert("클랜 이름을 입력해주세요.");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        if (image) {
            formData.append('image', image);
        }

        try {
            // POST /api/v1/clans/ (ClanViewSet의 create 액션)
            const newClan = await apiPostForm('/clans/', formData);
            alert("클랜 생성 요청이 완료되었습니다. 운영자 승인 후 활동할 수 있습니다.");
            navigate(`/clans/${newClan.id}`); // 생성된 클랜의 상세 페이지로 이동
        } catch (err) {
            console.error("Failed to create clan:", err);
            // 백엔드에서 보낸 유효성 검사 오류 (예: 중복된 이름)
            const errorMsg = err.response?.data?.name?.[0] || err.response?.data?.detail || "클랜 생성에 실패했습니다.";
            alert(errorMsg);
        }
    };

    if (loading) return <div style={{ padding: 20 }}>클랜 목록을 불러오는 중...</div>;

    return (
        <div style={{ padding: 20 }}>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ margin: 0 }}>클랜 목록</h2>

                {/* 3. 로그인한 유저에게만 "새 클랜 만들기" 버튼 표시 */}
                {user && (
                    <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                        {showForm ? "생성 취소" : "새 클랜 만들기"}
                    </button>
                )}
            </div>

            {/* 4. 새 클랜 만들기 폼 */}
            {user && showForm && (
                <div className="card" style={{ marginBottom: 20, padding: 20 }}>
                    <form onSubmit={handleCreateClan}>
                        <h3 style={{ marginTop: 0 }}>새 클랜 만들기</h3>
                        <div style={{ marginBottom: 10 }}>
                            <label>클랜 이름 (필수)</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input-field"
                                style={{ width: '100%' }}
                                required
                            />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                            <label>클랜 설명</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input-field"
                                style={{ width: '100%', minHeight: '60px', resize: 'vertical' }}
                            />
                        </div>
                        <div style={{ marginBottom: 15 }}>
                            <label>클랜 이미지 (선택)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setImage(e.target.files[0])}
                                style={{ display: 'block', marginTop: 5 }}
                            />
                        </div>
                        {/* 5. 생성 API 호출 버튼 */}
                        <button type="submit" className="btn btn-primary">
                            생성하기
                        </button>
                    </form>
                </div>
            )}

            {/* 1. 클랜 목록 표시 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {clans.length === 0 ? (
                    <p>생성된 클랜이 없습니다.</p>
                ) : (
                    clans.map(clan => (
                        <Link to={`/clans/${clan.id}`} key={clan.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="card" style={{ padding: 20, display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer' }}>
                                {clan.image && (
                                    <img src={clan.image} alt={clan.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} />
                                )}
                                {!clan.image && (
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
                                        No Img
                                    </div>
                                )}
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1.2em' }}>{clan.name}</h4>
                                    <p style={{ margin: '5px 0 0 0', color: '#555' }}>
                                        {clan.description ? clan.description.substring(0, 100) + (clan.description.length > 100 ? '...' : '') : "설명이 없습니다."}
                                    </p>
                                    <small style={{ color: '#888', marginTop: '5px', display: 'block' }}>
                                        클랜장: {clan.owner_nickname} | 멤버: {clan.members_count}명
                                    </small>
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
};

export default ClanPage;