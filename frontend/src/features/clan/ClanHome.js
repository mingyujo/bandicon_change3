import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPost } from "../../api/api";

// ▼▼▼ [수정] user를 prop으로 받지 않고, useAuth()를 직접 사용합니다. ▼▼▼
const ClanHome = ({user}) => {

  const [clans, setClans] = useState([]);
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");


  
  const load = useCallback(async () => {
    console.log("클랜 목록 로딩 시작");
    try {
      const data = await apiGet("/clans/"); // [수정] 일관성을 위해 /clans/ 로 수정
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
      // ▼▼▼ [수정] 닉네임 쿼리 파라미터 제거 (백엔드 views.py가 request.user를 사용) ▼▼▼
      const newClan = await apiPost(`/clans/`, { name, description });
      // ▲▲▲ [수정] ▲▲▲
      
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

  // ▼▼▼ [추가] 가입 신청 함수 ▼▼▼
  const requestJoin = async (e, clanId) => {
    e.preventDefault(); // Link 태그의 기본 동작(페이지 이동)을 막음
    e.stopPropagation(); // 이벤트 버블링 방지

    if (!user) return alert("로그인이 필요합니다.");
    
    try {
      // 백엔드 ClanViewSet의 'join_request' @action 호출
      const res = await apiPost(`/clans/${clanId}/join_request/`); 
      alert(res?.detail || "가입 신청을 보냈습니다.");
      load(); // 목록 새로고침 (이미 보낸 요청이 있는지 확인하기 위해)
    } catch (e) {
      alert(e.response?.data?.detail || "가입 신청 실패");
    }
  };
  // ▲▲▲ [추가] ▲▲▲

  
  return (
    <div style={{ maxWidth: 800, margin: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>클랜 목록</h2>
        {/* [수정] user 객체 존재 여부만 확인 (로그인한 유저) */}
        {user && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? '취소' : '+ 클랜 생성'}
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={create} className="card" style={{ marginTop: 20 }}>
          {/* ... (생성 폼 코드는 님의 코드와 동일) ... */}
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
        {clans.map((clan) => {
          
          // ▼▼▼ [추가] 멤버 여부 확인 로직 ▼▼▼
          // user.pk (로그인한 유저 ID)
          // clan.owner.id (클랜장 ID)
          // clan.members (ClanSerializer가 'members'를 응답에 포함해야 함 - [주의] 비효율적)
          
          // [수정] ClanSerializer가 'members' 목록을 다시 보내도록 serializers.py를 재수정합니다.
          // (가입 버튼 로직을 위해 'members' 배열이 필요합니다)
          const isOwner = user && clan.owner?.id === user.pk;
          const isMember = user && clan.members && clan.members.some(member => member.id === user.pk);
          // ▲▲▲ [추가] ▲▲▲

          return (
            <Link key={clan.id} to={`/clans/${clan.id}`} style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="card" style={{marginBottom: 10}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <h3 style={{margin: 0}}>{clan.name}</h3>
                  <span style={{fontSize: '0.9em', color: '#666'}}>클랜장: {clan.owner?.nickname ?? '정보 없음'}</span>
                </div>
                <p style={{color: '#666', marginTop: '10px'}}>{clan.description || '클랜 설명이 없습니다.'}</p>
                <div style={{
                    marginTop: '15px', borderTop: '1px solid var(--light-gray)', 
                    paddingTop: '10px', fontSize: '0.9em',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' // [추가] 가입 버튼을 위한 flex
                }}>
                  {/* ▼▼▼ [수정] member_count 사용 ▼▼▼ */}
                  <span>
                    멤버: {clan.member_count ?? 0}명
                  </span>
                  {/* ▲▲▲ [수정] ▲▲▲ */}

                  {/* ▼▼▼ [추가] 가입신청 버튼 ▼▼▼ */}
                  {user && !isOwner && !isMember && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={(e) => requestJoin(e, clan.id)}
                    >
                      가입신청
                    </button>
                  )}
                  {/* ▲▲▲ [추가] ▲▲▲ */}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  );
};


export default ClanHome;