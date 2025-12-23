// [전체 코드] src/features/evaluation/MannerEval.js
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiGet, apiPost } from "../../api/api";

const MannerEval = ({ user }) => {
  const navigate = useNavigate();
  const { roomId } = useParams();

  const [participants, setParticipants] = useState([]);
  const [scores, setScores] = useState({});
  const [moodMaker, setMoodMaker] = useState("");
  const [error, setError] = useState("");
  const [roomTitle, setRoomTitle] = useState("");

  useEffect(() => {
    const fetchRoomForEval = async () => {
      try {
        const roomData = await apiGet(`/rooms/${roomId}`);
        setRoomTitle(roomData.title);
        
        const allParticipants = new Set(roomData.sessions
          .map(s => s.participant_nickname)
          .filter(name => name)
        );
        allParticipants.add(roomData.manager_nickname);

        const otherParticipants = [...allParticipants].filter(name => name !== user.nickname);

        setParticipants(otherParticipants);
        const defaultScores = {};
        otherParticipants.forEach((p) => {
          defaultScores[p] = 50;
        });
        setScores(defaultScores);
      } catch (err) {
        console.error("평가 대상 방 정보 불러오기 실패", err);
        setError("평가 정보를 불러올 수 없습니다.");
      }
    };
    fetchRoomForEval();
  }, [roomId, user.nickname]);

  const handleScoreChange = (nickname, value) => {
    setScores((prev) => ({
      ...prev,
      [nickname]: parseInt(value),
    }));
  };

  const handleSubmit = async () => {
    setError("");
    if (participants.length > 0 && Object.keys(scores).length !== participants.length) {
      alert("모든 팀원의 점수를 입력해주세요.");
      return;
    }

    try {
      // [수정] API 호출 주소를 '/evaluations' (복수형)으로 변경
      await apiPost("/evaluations", {
        room_id: parseInt(roomId),
        evaluator: user.nickname,
        scores,
        mood_maker: moodMaker || null,
      });
      
      const alertMessage = participants.length > 0 ? "평가가 완료되었습니다! 감사합니다." : "확인되었습니다.";
      alert(alertMessage);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "평가 제출 중 오류가 발생했습니다.");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: '600px', margin: 'auto' }}>
      <h2>'{roomTitle}' 합주 평가</h2>
      {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
      
      {participants.length === 0 ? (
        <div>
          <p>평가할 다른 팀원이 없습니다.</p>
          <button onClick={handleSubmit} style={{ marginTop: "20px", padding: '10px', width: '100%' }}>
            확인 및 창 닫기
          </button>
        </div>
      ) : (
        <>
          {participants.map((nickname) => (
            <div key={nickname} style={{ marginBottom: "20px", border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
              <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                {nickname}님 매너 점수: {scores[nickname] || 50}점
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={scores[nickname] || 50}
                onChange={(e) => handleScoreChange(nickname, e.target.value)}
                style={{width: '100%'}}
              />
            </div>
          ))}
          <div style={{ marginTop: "20px", border: '1px solid #eee', padding: '15px', borderRadius: '5px' }}>
            <label><strong>분위기 메이커</strong>를 한 명 선택해주세요 (선택사항):</label>
            <select value={moodMaker} onChange={(e) => setMoodMaker(e.target.value)} style={{marginLeft: '10px', padding: '5px'}}>
              <option value="">선택 안 함</option>
              {participants.map((nickname) => (
                <option key={nickname} value={nickname}>
                  {nickname}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleSubmit} style={{ width: '100%', padding: '10px', marginTop: "20px", background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1.1em' }}>
            평가 완료 및 제출
          </button>
        </>
      )}
    </div>
  );
};

export default MannerEval;