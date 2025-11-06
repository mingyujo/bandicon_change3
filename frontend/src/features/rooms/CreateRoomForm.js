import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../../api/api";

export default function CreateRoomForm({ user }) {
  const [title, setTitle] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [sessions, setSessions] = useState([]);
  const [customSessionName, setCustomSessionName] = useState(""); // 1. 커스텀 세션 입력용 state
  const [error, setError] = useState("");
  const location = useLocation();
  const [selectedClanId, setSelectedClanId] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.clanId) {
      setSelectedClanId(location.state.clanId);
    }
  }, [location.state]);

  const availableSessions = ["보컬", "리드기타", "리듬기타", "베이스", "드럼", "키보드"];

  const toggleSession = (session) => {
    setSessions((prev) =>
      prev.includes(session) ? prev.filter((s) => s !== session) : [...prev, session]
    );
  };

  // 2. 커스텀 세션을 추가하는 함수
  const handleAddCustomSession = () => {
    const newSession = customSessionName.trim();
    if (newSession && !sessions.includes(newSession)) {
      setSessions([...sessions, newSession]);
      setCustomSessionName(""); // 입력창 비우기
    } else if (sessions.includes(newSession)) {
      setError("이미 추가된 세션입니다.");
      setTimeout(() => setError(""), 2000); // 2초 후 에러 메시지 사라짐
    }
  };

  // 3. 세션을 목록에서 제거하는 함수
  const handleRemoveSession = (sessionToRemove) => {
    setSessions(sessions.filter((session) => session !== sessionToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !song || !artist) {
      setError("방제, 곡 제목, 아티스트는 반드시 입력해야 합니다.");
      return;
    }
    if (sessions.length === 0) {
      setError("세션을 하나 이상 선택해야 합니다.");
      return;
    }

    try {
      const data = {
        title,
        song,
        artist,
        description,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        sessions,
        clan_id: selectedClanId ? parseInt(selectedClanId) : null,
      };

      const res = await apiPost(`/rooms?nickname=${encodeURIComponent(user.nickname)}`, data);
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

  return (
    <div style={{ padding: "20px", maxWidth: '600px', margin: 'auto' }}>
      <h2>방 생성</h2>
      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        {/* 방제, 곡 제목, 아티스트 등 기존 입력 필드는 그대로 유지 */}
        <div style={{marginBottom: '10px'}}>
          <label>방제:</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}} />
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>곡 제목: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={song} onChange={(e) => setSong(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>아티스트: <span style={{fontSize: '0.8em', color: '#666'}}>철자를 틀리지 않게 유의해주세요.</span></label>
          <input value={artist} onChange={(e) => setArtist(e.target.value)} required style={{width: '100%', padding: '8px', boxSizing: 'border-box'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>방 설명:</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{width: '100%', padding: '8px', boxSizing: 'border-box', height: '80px'}}/>
        </div>
        <div style={{marginBottom: '10px'}}>
          <label>
            <input type="checkbox" checked={isPrivate} onChange={(e) => { setIsPrivate(e.target.checked); if (!e.target.checked) setPassword(""); }} />
            비밀방
          </label>
          {isPrivate && ( <input type="password" placeholder="비밀번호" value={password} onChange={(e) => setPassword(e.target.value)} required style={{marginLeft: '10px'}} /> )}
        </div>

        {/* --- 👇 [핵심 수정] 세션 선택 UI 전체 --- */}
        <div className="card" style={{padding: '15px', marginBottom: '20px'}}>
          <h3 style={{marginTop: 0}}>세션 구성</h3>
          
          {/* 1. 기본 세션 체크박스 */}
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

          {/* 2. 커스텀 세션 입력 필드 */}
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
          
          {/* 3. 현재 추가된 전체 세션 목록 */}
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
        {/* --- 👆 UI 수정 끝 --- */}

        <button type="submit" style={{width: '100%', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>방 생성하기</button>
      </form>
    </div>
  );
}