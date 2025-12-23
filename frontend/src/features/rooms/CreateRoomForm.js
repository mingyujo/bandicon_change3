import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../../api/api"; // [수정] apiPost 사용

export default function CreateRoomForm({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  // --- 1. State 정의 (복원됨) ---
  const [title, setTitle] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  
  // 세션 관련 State
  const [sessions, setSessions] = useState([]); 
  const [customSessionName, setCustomSessionName] = useState("");
  
  const [error, setError] = useState("");
  const [selectedClanId, setSelectedClanId] = useState(null);

  // --- 2. 초기화 (클랜 ID 확인) ---
  useEffect(() => {
    if (location.state?.clanId) {
      setSelectedClanId(location.state.clanId);
    }
  }, [location.state]);

  // --- 3. 세션 관리 함수들 (복원됨) ---
  const availableSessions = ["보컬", "리드기타", "리듬기타", "베이스", "드럼", "키보드"];

  // 기본 세션 토글
  const toggleSession = (session) => {
    setSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  // 커스텀 세션 추가
  const handleAddCustomSession = () => {
    const newSession = customSessionName.trim();
    if (newSession && !sessions.includes(newSession)) {
      setSessions([...sessions, newSession]);
      setCustomSessionName(""); 
    } else if (sessions.includes(newSession)) {
      setError("이미 추가된 세션입니다.");
      setTimeout(() => setError(""), 2000);
    }
  };

  // 세션 삭제
  const handleRemoveSession = (sessionToRemove) => {
    setSessions(sessions.filter((session) => session !== sessionToRemove));
  };

  // --- 4. 폼 제출 핸들러 (API 분기 로직 적용) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // 유효성 검사
    if (!title || !song || !artist) {
      setError("방제, 곡 제목, 아티스트는 반드시 입력해야 합니다.");
      return;
    }
    
    if (sessions.length === 0) {
      setError("세션을 하나 이상 선택해야 합니다.");
      return;
    }
    
    if (isPrivate && !password) {
      setError('비공개 방은 비밀번호가 필요합니다.');
      return;
    }

    try {
      // 전송할 데이터
      const dataToSend = {
        title,
        song,
        artist,
        description,
        sessions, // 배열 그대로 전송
        is_private: isPrivate,
        password: isPrivate ? password : null,
        // clan_id는 URL로 구분하므로 body에는 필수는 아니지만, 명시적으로 보냄
        clan_id: selectedClanId ? parseInt(selectedClanId) : null,
      };

      let res;

      // ▼▼▼ [핵심] 클랜 ID 유무에 따라 API 주소 분기 ▼▼▼
      if (selectedClanId) {
        // [CASE 1] 클랜 합주방 생성 (/api/v1/clans/<id>/rooms/)
        // 백엔드 ClanRoomListAPIView가 처리하며 자동으로 클랜과 연결됨
        console.log(`클랜(${selectedClanId}) 방 생성 요청...`);
        res = await apiPost(`/clans/${selectedClanId}/rooms/`, dataToSend);
      } else {
        // [CASE 2] 일반 합주방 생성 (/api/v1/rooms/)
        console.log("일반 방 생성 요청...");
        res = await apiPost('/rooms/', dataToSend);
      }
      // ▲▲▲ [분기 종료] ▲▲▲

      console.log("✅ 방 생성 응답:", res);

      if (!res.id) {
        throw new Error("서버로부터 방 ID를 받지 못했습니다.");
      }

      alert("방이 성공적으로 생성되었습니다!");
      
      // 이동 로직 분기
      setTimeout(() => {
        if (selectedClanId) {
          // 클랜 방이면 클랜 홈으로 이동
          navigate(`/clans/${selectedClanId}`);
        } else {
          // 일반 방이면 해당 방 상세 페이지로 이동
          navigate(`/rooms/${res.id}`);
        }
      }, 500);

    } catch (err) {
      console.error("방 생성 실패:", err);
      let errorMessage = "방 생성 중 오류가 발생했습니다.";
      
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail) && errorDetail[0]?.msg) {
        errorMessage = errorDetail[0].msg;
      }
      setError(errorMessage);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: '600px', margin: 'auto' }}>
      <h2 className="page-title">
        {selectedClanId ? "클랜 합주방 만들기" : "새 합주방 만들기"}
      </h2>
      
      {selectedClanId && (
        <div style={{ padding: '10px', background: '#e3f2fd', color: '#01579b', borderRadius: '5px', marginBottom: '15px' }}>
          🔒 <strong>클랜 전용 방</strong>으로 생성됩니다. (일반 목록 미노출)
        </div>
      )}

      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      
      <form onSubmit={handleSubmit} className="card">
        {/* 기본 정보 입력 */}
        <div style={{marginBottom: '10px'}}>
          <label>방제:</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" placeholder="예: 토요일 저녁 합주" />
        </div>
        
        <div style={{display: 'flex', gap: '10px', marginBottom: '10px'}}>
            <div style={{flex: 1}}>
                <label>곡 제목:</label>
                <input value={song} onChange={(e) => setSong(e.target.value)} required className="input-field" placeholder="예: Time is running out"/>
            </div>
            <div style={{flex: 1}}>
                <label>아티스트:</label>
                <input value={artist} onChange={(e) => setArtist(e.target.value)} required className="input-field" placeholder="예: Muse"/>
            </div>
        </div>

        <div style={{marginBottom: '10px'}}>
          <label>방 설명:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" style={{height: '80px'}} placeholder="자유롭게 적어주세요."/>
        </div>

        <div style={{marginBottom: '10px'}}>
          <label>
            <input type="checkbox" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); if (!e.target.checked) setPassword(""); }} />
            비밀방 설정
          </label>
          {isPrivate && ( <input type="password" placeholder="비밀번호 4자리" value={password} onChange={(e) => setPassword(e.target.value)} required style={{marginLeft: '10px', padding: '5px'}} /> )}
        </div>

        {/* --- 세션 구성 UI (복원됨) --- */}
        <div className="card" style={{padding: '15px', marginBottom: '20px', background: '#f8f9fa'}}>
          <h3 style={{marginTop: 0, fontSize: '1.1em'}}>세션 구성</h3>
          
          {/* 기본 세션 체크박스 */}
          <div style={{marginBottom: '15px'}}>
            <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9em', color: '#666'}}>기본 세션 선택:</p>
            {availableSessions.map((session) => (
              <label key={session} style={{ marginRight: '15px', marginBottom: '5px', display: 'inline-block', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sessions.includes(session)}
                  onChange={() => toggleSession(session)}
                  style={{marginRight: '5px'}}
                />
                {session}
              </label>
            ))}
          </div>

          {/* 커스텀 세션 입력 */}
          <div style={{marginBottom: '15px'}}>
            <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold', fontSize: '0.9em', color: '#666'}}>직접 입력 추가:</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <input
                type="text"
                value={customSessionName}
                onChange={(e) => setCustomSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSession())}
                placeholder="예: 코러스, 색소폰"
                className="input-field"
                style={{flex: 1, margin: 0}}
              />
              <button type="button" onClick={handleAddCustomSession} className="btn btn-secondary">
                추가
              </button>
            </div>
          </div>
          
          {/* 선택된 세션 목록 */}
          {sessions.length > 0 && (
            <div style={{borderTop: '1px solid #ddd', paddingTop: '10px'}}>
              <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold'}}>현재 구성: ({sessions.length}명)</p>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {sessions.map(session => (
                  <div key={session} style={{background: 'var(--primary-color)', color: 'white', padding: '5px 12px', borderRadius: '20px', display: 'flex', alignItems: 'center', fontSize: '0.9em'}}>
                    <span>{session}</span>
                    <button type="button" onClick={() => handleRemoveSession(session)} style={{background: 'transparent', border: 'none', color: 'white', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold', padding: 0}}>
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '12px', fontSize: '1.1em'}}>
            {selectedClanId ? "클랜 방 생성하기" : "합주방 생성하기"}
        </button>
      </form>
    </div>
  );
}