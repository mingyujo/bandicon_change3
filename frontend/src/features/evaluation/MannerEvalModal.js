import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "../../api/api";
import "./MannerEval.css"; // Reuse existing styles or create new modal styles

const MannerEvalModal = ({ isOpen, onClose, roomId, user }) => {
    const [participants, setParticipants] = useState([]);
    const [scores, setScores] = useState({});
    const [moodMaker, setMoodMaker] = useState("");
    const [error, setError] = useState("");
    const [roomTitle, setRoomTitle] = useState("");

    useEffect(() => {
        if (!isOpen || !roomId) return;

        const fetchRoomForEval = async () => {
            try {
                const roomData = await apiGet(`/rooms/${roomId}/`); // [수정] Trailing slash 추가
                if (!roomData || !roomData.title) {
                    throw new Error("Invalid room data");
                }
                setRoomTitle(roomData.title);

                const sessions = roomData.sessions || [];
                const allParticipants = new Set(sessions
                    .map(s => s.participant_nickname)
                    .filter(name => name)
                );
                if (roomData.manager_nickname) {
                    allParticipants.add(roomData.manager_nickname);
                }

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
    }, [isOpen, roomId, user.nickname]);

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
            const evaluationData = participants.map(nickname => ({
                target_nickname: nickname,
                score: scores[nickname] || 50,
                comment: "",
                is_mood_maker: nickname === moodMaker
            }));

            await apiPost(`/rooms/${roomId}/evaluate/`, {
                evaluations: evaluationData
            });

            alert(participants.length > 0 ? "평가가 완료되었습니다! 감사합니다." : "확인되었습니다.");
            onClose(); // Close modal on success
        } catch (err) {
            setError(err.response?.data?.detail || "평가 제출 중 오류가 발생했습니다.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '420px' }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        color: '#9ca3af',
                        padding: '4px',
                        lineHeight: '1',
                        transition: 'color 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#4b5563'}
                    onMouseOut={(e) => e.target.style.color = '#9ca3af'}
                >
                    &times;
                </button>
                <h2 style={{ marginBottom: '24px', fontSize: '1.5rem' }}>'{roomTitle}' 합주 평가</h2>
                {error && <p style={{ color: "#ef4444", textAlign: 'center', background: '#fee2e2', padding: '10px', borderRadius: '8px' }}>{error}</p>}

                {participants.length === 0 ? (
                    <div>
                        <p style={{ color: '#6b7280' }}>평가할 다른 팀원이 없습니다.</p>
                        <button onClick={handleSubmit} className="btn btn-primary" style={{ marginTop: "20px", width: '100%', padding: '12px', borderRadius: '12px' }}>
                            확인
                        </button>
                    </div>
                ) : (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                        {participants.map((nickname) => (
                            <div key={nickname} style={{ marginBottom: "16px", border: '1px solid #f3f4f6', padding: '20px', borderRadius: '16px', background: '#f9fafb', textAlign: 'left' }}>
                                <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#1f2937' }}>
                                    {nickname}님 매너 점수: <span style={{ color: '#7c3aed' }}>{scores[nickname] || 50}점</span>
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max="100"
                                    value={scores[nickname] || 50}
                                    onChange={(e) => handleScoreChange(nickname, e.target.value)}
                                    style={{ width: '100%', accentColor: '#7c3aed', height: '6px', borderRadius: '3px' }}
                                />
                            </div>
                        ))}
                        <div style={{ marginTop: "24px", border: '1px solid #e5e7eb', padding: '20px', borderRadius: '16px', textAlign: 'left' }}>
                            <label style={{ color: '#374151', fontWeight: '600', display: 'block', marginBottom: '8px' }}>분위기 메이커 (선택)</label>
                            <select
                                value={moodMaker}
                                onChange={(e) => setMoodMaker(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid #d1d5db',
                                    outline: 'none'
                                }}
                            >
                                <option value="">선택 안 함</option>
                                {participants.map((nickname) => (
                                    <option key={nickname} value={nickname}>
                                        {nickname}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div className="modal-actions" style={{ marginTop: '32px' }}>
                    <button onClick={handleSubmit} className="btn btn-primary" style={{ flex: 1, padding: '14px', borderRadius: '12px', fontSize: '1rem' }}>
                        평가 완료 및 제출
                    </button>
                </div>

            </div>
        </div>
    );
};

export default MannerEvalModal;
