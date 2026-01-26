import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { apiPost } from "../../api/api";
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import "./CreateRoomForm.css";

const ChevronBackIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CreateRoomForm({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [title, setTitle] = useState("");
  const [song, setSong] = useState("");
  const [artist, setArtist] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [customSessionName, setCustomSessionName] = useState("");

  const [error, setError] = useState("");
  const [selectedClanId, setSelectedClanId] = useState(null);

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

  const handleAddCustomSession = () => {
    const newSession = customSessionName.trim();
    if (newSession && !sessions.includes(newSession)) {
      setSessions([...sessions, newSession]);
      setCustomSessionName("");
    } else if (sessions.includes(newSession)) {
      alert("이미 추가된 세션입니다.");
    }
  };

  const handleRemoveSession = (sessionToRemove) => {
    setSessions(sessions.filter((session) => session !== sessionToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!title || !song || !artist) {
      alert("방제, 곡 제목, 아티스트는 반드시 입력해야 합니다.");
      return;
    }

    if (sessions.length === 0) {
      alert("세션을 하나 이상 선택해야 합니다.");
      return;
    }

    if (isPrivate && !password) {
      alert('비공개 방은 비밀번호가 필요합니다.');
      return;
    }

    try {
      const dataToSend = {
        title, song, artist, description, sessions,
        is_private: isPrivate,
        password: isPrivate ? password : null,
        clan_id: selectedClanId ? parseInt(selectedClanId) : null,
      };

      let res;
      if (selectedClanId) {
        res = await apiPost(`/clans/${selectedClanId}/rooms/`, dataToSend);
      } else {
        res = await apiPost('/rooms/', dataToSend);
      }

      if (!res.id) throw new Error("No ID returned");

      alert("방이 성공적으로 생성되었습니다!");
      setTimeout(() => {
        navigate(selectedClanId ? `/clans/${selectedClanId}` : `/rooms/${res.id}`);
      }, 500);

    } catch (err) {
      console.error("방 생성 실패:", err);
      let msg = "방 생성 중 오류가 발생했습니다.";
      if (err.response?.data?.detail) msg = err.response.data.detail;
      alert(msg);
    }
  };

  return (
    <MobileLayout>
      <GlobalHeader user={user} />
      <div className="create-room-header">
        <div className="create-room-back-btn" onClick={() => navigate(-1)}>
          <ChevronBackIcon />
        </div>
        <div className="create-room-title">방 생성</div>
      </div>

      <div className="create-room-container">
        <div className="form-group" style={{ marginTop: '20px' }}>
          <label className="form-label">방제</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">곡 제목</label>
          <input className="form-input" value={song} onChange={e => setSong(e.target.value)} placeholder="철자를 틀리지 않게 주의하세요" />
        </div>

        <div className="form-group">
          <label className="form-label">아티스트</label>
          <input className="form-input" value={artist} onChange={e => setArtist(e.target.value)} placeholder="철자를 틀리지 않게 주의하세요" />
        </div>

        <div className="form-group">
          <label className="form-label">방 세부 설명</label>
          <textarea className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">기본 세션 구성</label>
          <div className="session-grid">
            {availableSessions.map(sess => (
              <div key={sess} className="checkbox-label" onClick={() => toggleSession(sess)}>
                <div className={`custom-checkbox ${sessions.includes(sess) ? 'checked' : ''}`}>
                  {sessions.includes(sess) && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span>{sess}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">커스텀 세션 추가</label>
          <div className="custom-session-row">
            <input
              className="form-input"
              value={customSessionName}
              onChange={e => setCustomSessionName(e.target.value)}
              placeholder="추가할 세션 이름 입력 (예: 보컬2, 바이올린)"
              style={{ fontSize: '12px' }}
            />
            <button className="btn-add" onClick={handleAddCustomSession}>추가</button>
          </div>

          {/* Added Custom Sessions Display */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '10px' }}>
            {sessions.filter(s => !availableSessions.includes(s)).map(s => (
              <div key={s} style={{ background: '#0EA5E9', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                {s}
                <span onClick={() => handleRemoveSession(s)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>×</span>
              </div>
            ))}
          </div>
        </div>

        <div className="private-room-row">
          <div className="checkbox-label" onClick={() => setIsPrivate(!isPrivate)}>
            <div className={`custom-checkbox ${isPrivate ? 'checked' : ''}`}>
              {isPrivate && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <span>비밀방</span>
          </div>
          {isPrivate && (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginLeft: '10px' }}>
              <input
                className="form-input"
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>

        <button className="btn-submit" onClick={handleSubmit}>방 생성</button>
      </div>
      <BottomNav />
    </MobileLayout>
  );
}