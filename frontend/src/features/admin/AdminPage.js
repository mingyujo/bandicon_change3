// [전체 코드] src/features/admin/AdminPage.js
import React, { useEffect, useState, useCallback } from "react";
// [수정] adminPost 대신 adminPostForm을 가져옵니다.
import { adminGet, adminPostForm, adminPost, adminPut } from "../../api/api";
import { useNavigate } from 'react-router-dom';

const roles = ["멤버", "간부", "운영자"];

export default function AdminPage({ user }) {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "OPERATOR";
  const [popupAnnouncements, setPopupAnnouncements] = useState([]);
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupContent, setPopupContent] = useState('');
  const [showAnnouncementSection, setShowAnnouncementSection] = useState(false);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await adminGet("/admin/pending-users");
      setPending(data || []);
    } catch (e) {
      alert(e.response?.data?.detail || "대기 사용자 조회 실패");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const approve = async (nickname) => {
    try {
      // [수정] FormData를 사용하여 닉네임을 서류 양식에 담아 보냅니다.
      const formData = new FormData();
      formData.append('nickname', nickname);
      await adminPostForm(`/admin/approve-user`, formData);
      alert(`승인 완료: ${nickname}`);
      load();
    } catch (e) {
      // [수정] 복잡한 에러 객체 대신 간단한 메시지를 표시합니다.
      alert(e.response?.data?.detail || "승인에 실패했습니다.");
    }
  };

  const setRole = async (nickname, role) => {
    try {
      // [수정] FormData를 사용하여 닉네임과 역할을 서류 양식에 담아 보냅니다.
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('role', role);
      await adminPostForm(`/admin/set-role`, formData);
      alert(`역할 변경 완료: ${nickname} → ${role}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "역할 변경에 실패했습니다.");
    }
  };

  const loadPopupAnnouncements = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await adminGet("/admin/popup-announcements");
      setPopupAnnouncements(data || []);
    } catch (e) {
      console.error("팝업 공지 조회 실패:", e);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      load();
      loadPopupAnnouncements();
    }
  }, [load, loadPopupAnnouncements, isAdmin]);

  const createPopupAnnouncement = async (e) => {
    e.preventDefault();
    if (!popupTitle.trim() || !popupContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await adminPost(`/admin/popup-announcements?nickname=${encodeURIComponent(user.nickname)}`, {
        title: popupTitle.trim(),
        content: popupContent.trim()
      });

      alert("팝업 공지가 생성되었습니다!");
      setPopupTitle('');
      setPopupContent('');
      setShowCreatePopup(false);
      loadPopupAnnouncements();
    } catch (e) {
      alert(e.response?.data?.detail || "팝업 공지 생성에 실패했습니다.");
    }
  };

  const deactivatePopupAnnouncement = async (announcementId) => {
    if (!window.confirm("이 공지를 비활성화하시겠습니까?")) {
      return;
    }

    try {
      await adminPut(`/admin/popup-announcements/${announcementId}/deactivate`);
      alert("공지가 비활성화되었습니다.");
      loadPopupAnnouncements();
    } catch (e) {
      alert(e.response?.data?.detail || "비활성화에 실패했습니다.");
    }
  };

  if (!isAdmin) {
    return <div style={{ maxWidth: 800, margin: "40px auto" }}>운영자만 접근 가능합니다.</div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: "30px auto" }}>
      <h1>운영자 페이지</h1>

      <section style={{ marginTop: 24 }}>
        <h2>승인 대기 사용자</h2>
        {loading ? (
          <p>불러오는 중...</p>
        ) : pending.length === 0 ? (
          <div style={{ padding: 16, border: "1px solid #eee", borderRadius: 8 }}>대기 중인 사용자가 없습니다.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ textAlign: "left", padding: 8 }}>닉네임</th>
                <th style={{ textAlign: "left", padding: 8 }}>아이디</th>
                <th style={{ textAlign: "left", padding: 8 }}>요청 역할</th>
                <th style={{ textAlign: "left", padding: 8 }}>상태</th>
                <th style={{ padding: 8 }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((u) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{u.nickname}</td>
                  <td style={{ padding: 8 }}>{u.username}</td>
                  <td style={{ padding: 8 }}>{u.role}</td>
                  <td style={{ padding: 8 }}>{u.status}</td>
                  <td style={{ padding: 8 }}>
                    <button onClick={() => approve(u.nickname)} style={{ marginRight: 8 }}>승인</button>
                    <select
                      defaultValue={u.role}
                      onChange={(e) => setRole(u.nickname, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>피드백/문의 관리</h2>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin/support')}
        >
          피드백/문의 확인하기
        </button>
      </section>

      <section style={{ marginTop: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          padding: '12px 0',
          borderBottom: '1px solid #eee'
        }}>
          <h2 style={{ margin: 0 }}> 밴디콘 전체 공지</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.9em',
              color: '#666',
              backgroundColor: '#f8f9fa',
              padding: '4px 8px',
              borderRadius: '12px'
            }}>
              {popupAnnouncements.length}개
            </span>
            <button
              onClick={() => setShowAnnouncementSection(!showAnnouncementSection)}
              style={{
                backgroundColor: showAnnouncementSection ? '#dc3545' : '#6c757d',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9em'
              }}
            >
              {showAnnouncementSection ? '숨기기' : '관리하기'}
            </button>
          </div>
        </div>

        {showAnnouncementSection && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>공지 목록</h3>
              <button
                onClick={() => setShowCreatePopup(!showCreatePopup)}
                style={{
                  backgroundColor: showCreatePopup ? '#dc3545' : '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {showCreatePopup ? '취소' : '+ 새 공지 작성'}
              </button>
            </div>

            {showCreatePopup && (
              <form onSubmit={createPopupAnnouncement} style={{
                border: '1px solid #ddd',
                padding: 16,
                borderRadius: 8,
                marginBottom: 16,
                backgroundColor: '#f8f9fa'
              }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>제목</label>
                  <input
                    type="text"
                    value={popupTitle}
                    onChange={(e) => setPopupTitle(e.target.value)}
                    placeholder="공지 제목을 입력하세요"
                    style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 4 }}>내용</label>
                  <textarea
                    value={popupContent}
                    onChange={(e) => setPopupContent(e.target.value)}
                    placeholder="공지 내용을 입력하세요"
                    rows={4}
                    style={{ width: '100%', padding: 8, border: '1px solid #ccc', borderRadius: 4, resize: 'vertical' }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 4,
                    cursor: 'pointer',
                    marginRight: 8
                  }}
                >
                  공지 생성
                </button>
              </form>
            )}

            <div style={{ border: '1px solid #ddd', borderRadius: 8 }}>
              {popupAnnouncements.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: '#666' }}>
                  생성된 팝업 공지가 없습니다.
                </div>
              ) : (
                <div>
                  {popupAnnouncements.map((announcement, index) => (
                    <div key={announcement.id} style={{
                      padding: 16,
                      borderBottom: index < popupAnnouncements.length - 1 ? '1px solid #eee' : 'none'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', color: announcement.is_active ? '#000' : '#999' }}>
                            {announcement.title}
                            {!announcement.is_active && <span style={{ color: '#dc3545', fontSize: '0.8em', marginLeft: 8 }}>(비활성화됨)</span>}
                          </h4>
                          <div style={{ fontSize: '0.85em', color: '#666' }}>
                            작성: {announcement.created_by} | {new Date(announcement.created_at).toLocaleString('ko-KR')}
                          </div>
                        </div>
                        {announcement.is_active && (
                          <button
                            onClick={() => deactivatePopupAnnouncement(announcement.id)}
                            style={{
                              backgroundColor: '#ffc107',
                              color: '#000',
                              border: 'none',
                              padding: '4px 8px',
                              borderRadius: 4,
                              cursor: 'pointer',
                              fontSize: '0.8em'
                            }}
                          >
                            비활성화
                          </button>
                        )}
                      </div>
                      <div style={{
                        backgroundColor: '#f8f9fa',
                        padding: 12,
                        borderRadius: 4,
                        whiteSpace: 'pre-wrap',
                        color: announcement.is_active ? '#000' : '#666'
                      }}>
                        {announcement.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>빠른 역할 변경</h2>
        <QuickRoleSetter onSet={setRole} />
      </section>
    </div>
  );
}

function QuickRoleSetter({ onSet }) {
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("멤버");

  const submit = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    await onSet(nickname.trim(), role);
    setNickname("");
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8 }}>
      <input
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        style={{ flex: 1, padding: 8 }}
      />
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        {roles.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>
      <button type="submit">변경</button>
    </form>
  );
}