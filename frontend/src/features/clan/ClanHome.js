// [전체 코드] src/features/clan/ClanHome.js
import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../../api/api";

const ClanHome = ({ user }) => {
  const [clans, setClans] = useState([]);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");


  
  const load = useCallback(async () => {
  console.log("클랜 목록 로딩 시작");
  console.log("현재 토큰:", localStorage.getItem('accessToken'));
  
  try {
    const data = await apiGet("/clans");
    console.log("클랜 데이터 로드 성공:", data);
    setClans(data || []);
  } catch (e) {
    console.error("클랜 로드 에러:", e.response?.status, e.response?.data);
    
    if (e.response?.status === 401) {
      alert("인증 에러 발생!");
    }
  }
}, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("클랜 이름을 입력해주세요.");

    try {
      const newClan = await apiPost(`/clans?nickname=${encodeURIComponent(user.nickname)}`, { name, description });
      // 성공 시 폼 닫고, 목록 새로고침 후 해당 클랜 상세 페이지로 이동
      setShowCreate(false);
      setName("");
      setDescription("");
      await load(); 
      alert("클랜을 생성했습니다!");
      navigate(`/clans/${newClan.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "클랜 생성 실패");
    }
  };

  
  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>클랜 목록</h2>
        {/* [수정] user.role이 '간부'이기만 하면 버튼이 보이도록 조건 수정 */}
        {user.role === '간부' && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '취소' : '+ 클랜 생성'}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={create} className="card" style={{ marginTop: 20 }}>
          <h3 style={{marginTop: 0}}>새 클랜 생성</h3>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="클랜 이름"
            className="input-field"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="클랜 설명 (선택)"
            className="input-field"
            rows={3}
          />
          {error && <p style={{ color: "red" }}>{error}</p>}
          <button className="btn btn-primary" type="submit">생성하기</button>
        </form>
      )}

      <div style={{marginTop: 20}}>
        {clans.map((clan) => (
          <Link key={clan.id} to={`/clans/${clan.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
            <div className="card" style={{marginBottom: 10}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <h3 style={{margin: 0}}>{clan.name}</h3>
                <span style={{fontSize: '0.9em', color: '#666'}}>클랜장: {clan.owner?.nickname ?? '정보 없음'}</span>
              </div>
              <p style={{color: '#666', marginTop: '10px'}}>{clan.description || '클랜 설명이 없습니다.'}</p>
              <div style={{marginTop: '15px', borderTop: '1px solid var(--light-gray)', paddingTop: '10px', fontSize: '0.9em'}}>
                멤버: {clan.members?.length ?? 0}명
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};


export default ClanHome;

