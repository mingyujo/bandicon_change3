// frontend/src/features/rooms/CreateRoomForm.js

import React, { useState, useEffect } from "react"; // useEffect 추가
import { useNavigate, useLocation } from "react-router-dom";
// --- 👇 [수정] apiPostForm -> apiPost ---
import { apiPost } from "../../api/api";

export default function CreateRoomForm({ user }) {
  // --- 1. 원본 UI의 State로 복원 ---
  const [title, setTitle] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState([]); // <-- 복원
  const [customSessionName, setCustomSessionName] = useState(""); // <-- 복원
  const [error, setError] = useState("");
  const location = useLocation();
  const [selectedClanId, setSelectedClanId] = useState(null); // <-- 복원
  const navigate = useNavigate();

  useEffect(() => { // <-- 복원
    if (location.state?.clanId) {
      setSelectedClanId(location.state.clanId);
    }
  }, [location.state]);

  // --- 2. 원본 UI의 헬퍼 함수 복원 ---
  const availableSessions = ["보컬", "리드기타", "리듬기타", "베이스", "드럼", "키보드"];

  const toggleSession = (session) => { // <-- 복원
    setSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  const handleAddCustomSession = () => { // <-- 복원
    const newSession = customSessionName.trim();
    if (newSession && !sessions.includes(newSession)) {
      setSessions([...sessions, newSession]);
      setCustomSessionName(""); // 입력창 비우기
    } else if (sessions.includes(newSession)) {
      setError("이미 추가된 세션입니다.");
      setTimeout(() => setError(""), 2000);
    }
  };

  const handleRemoveSession = (sessionToRemove) => { // <-- 복원
    setSessions(sessions.filter((session) => session !== sessionToRemove));
  };
  // --- 👆 함수 복원 끝 ---

  // --- 3. APPEND_SLASH 오류가 해결된 handleSubmit (수정됨) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !song || !artist) {
      setError("방제, 곡 제목, 아티스트는 반드시 입력해야 합니다.");
      return;
    }
    
    // [수정] state가 input이 아닌 sessions 배열을 직접 사용
    if (sessions.length === 0) {
      setError("세션을 하나 이상 선택해야 합니다.");
      return;
    }
    if (new Set(sessions).size !== sessions.length) {
        setError('중복된 세션 이름이 있습니다.');
        return;
    }

    if (isPrivate && !password) {
      setError('비공개 방은 비밀번호가 필요합니다.');
      return;
    }

    try {
      // [수정] 전송할 데이터 구성
      const dataToSend = {
        title,
        song,
        artist,
        description,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        clan_id: selectedClanId ? parseInt(selectedClanId) : null,
        sessions: sessions // state 배열 사용
      };

      // [수정] apiPost 사용 및 URL 끝에 '/' 추가
      const res = await apiPost('/rooms/', dataToSend);
      
      alert("방이 성공적으로 생성되었습니다.");
      navigate(`/rooms/${res.id}`);

    } catch (err) {
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
  // --- 👆 handleSubmit 끝 ---

  return (
    <div style={{ padding: "20px", maxWidth: '600px', margin: 'auto' }}>
      <h2 className="page-title">새 합주방 생성</h2>
      
      {selectedClanId && ( // <-- 복원
        <div style={{ padding: '10px', background: '#e3f2fd', color: '#01579b', borderRadius: '5px', marginBottom: '15px' }}>
          클랜 전용 방으로 생성됩니다. (일반 목록에 노출되지 않음)
        </div>
      )}

      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      <form onSubmit={handleSubmit} className="card">
        {/* 방제, 곡 제목, 아티스트 등 기존 입력 필드는 그대로 유지 */}
        <div style={{marginBottom: '10px'}}>
          <label>방제:</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>곡 제목: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={song} onChange={(e) => setSong(e.target.value)} required className="input-field"/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>아티스트: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required className="input-field"/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>방 설명:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field" style={{height: '80px'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>
            <input type="checkbox" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); if (!e.target.checked) setPassword(""); }} />
            비밀방
          </label>
          {isPrivate && ( <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{marginLeft: '10px'}} /> )}
        </div>

        {/* --- 4. 원본 UI의 JSX로 복원 --- */}
        <div className="card" style={{padding: '15px', marginBottom: '20px', background: '#f8f9fa'}}>
          <h3 style={{marginTop: 0}}>세션 구성</h3>
          
          <div style={{marginBottom: '15px'}}>
            <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold'}}>기본 세션:</p>
            {availableSessions.map((session) => (
              <label key={session} style={{ marginRight: '15px', display: 'inline-block' }}>
                <input
                  type="checkbox"
                  checked={sessions.includes(session)}
                  onChange={() => toggleSession(session)}
                />
                {session}
              </label>
            ))}
          </div>

          <div style={{marginBottom: '15px'}}>
            <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold'}}>커스텀 세션 추가:</p>
            <div style={{display: 'flex', gap: '10px'}}>
              <input
                type="text"
                value={customSessionName}
                onChange={(e) => setCustomSessionName(e.target.value)}
                placeholder="세션 이름 입력 (예: 코러스)"
                className="input-field"
                style={{flex: 1, margin: 0}}
              />
              <button type="button" onClick={handleAddCustomSession} className="btn btn-secondary">
                추가
              </button>
            </div>
          </div>
          
          {sessions.length > 0 && (
            <div style={{borderTop: '1px solid var(--light-gray)', paddingTop: '10px'}}>
              <p style={{marginTop: 0, marginBottom: '10px', fontWeight: 'bold'}}>현재 구성된 세션: ({sessions.length}개)</p>
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                {sessions.map(session => (
                  <div key={session} style={{background: 'var(--primary-color)', color: 'white', padding: '5px 10px', borderRadius: '15px', display: 'flex', alignItems: 'center'}}>
                    <span>{session}</span>
                    <button type="button" onClick={() => handleRemoveSession(session)} style={{background: 'transparent', border: 'none', color: 'white', marginLeft: '8px', cursor: 'pointer', fontWeight: 'bold'}}>
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* --- 👆 JSX 복원 끝 --- */}

        <button type="submit" className="btn btn-primary" style={{width: '100%', padding: '10px'}}>방 생성하기</button>
      </form>
    </div>
  );
}