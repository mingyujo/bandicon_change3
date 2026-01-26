// src/features/admin/AdminPage.js
import React, { useEffect, useState, useCallback } from "react";
import { apiGet, apiPostForm, apiPost, apiPut } from "../../api/api";
import { useNavigate } from 'react-router-dom';

const roles = ["멤버", "간부", "관리자"];

export default function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(false);
  const isAdmin = user?.role === "OPERATOR";
  const [popupAnnouncements, setPopupAnnouncements] = useState([]);

  // Announcement States
  const [showCreatePopup, setShowCreatePopup] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupContent, setPopupContent] = useState('');

  const navigate = useNavigate();

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const data = await apiGet("/admin/pending-users");
      setPending(data || []);
    } catch (e) {
      // alert(e.response?.data?.detail || "대기 사용자 조회 실패");
      console.error("대기 사용자 조회 실패", e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const loadPopupAnnouncements = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await apiGet("/admin/popup-announcements");
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

  const approve = async (nickname) => {
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      await apiPostForm(`/admin/approve-user`, formData);
      alert(`승인 완료: ${nickname}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "승인에 실패했습니다.");
    }
  };

  const setRole = async (nickname, role) => {
    try {
      const formData = new FormData();
      formData.append('nickname', nickname);
      formData.append('role', role);
      await apiPostForm(`/admin/set-role`, formData);
      alert(`역할 변경 완료: ${nickname} → ${role}`);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "역할 변경에 실패했습니다.");
    }
  };

  const createPopupAnnouncement = async (e) => {
    e.preventDefault();
    if (!popupTitle.trim() || !popupContent.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      await apiPost(`/admin/popup-announcements?nickname=${encodeURIComponent(user.nickname)}`, {
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
      await apiPut(`/admin/popup-announcements/${announcementId}/deactivate`);
      alert("공지가 비활성화되었습니다.");
      loadPopupAnnouncements();
    } catch (e) {
      alert(e.response?.data?.detail || "비활성화에 실패했습니다.");
    }
  };

  if (!isAdmin) {
    return <div style={{ maxWidth: 800, margin: "40px auto", textAlign: 'center' }}>관리자만 접근 가능합니다.</div>;
  }

  // --- Render Functions for Tabs ---

  const renderDashboard = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '16px' }}>승인 대기 사용자</h3>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>
          {pending.length} <span style={{ fontSize: '16px', color: '#666', fontWeight: 'normal' }}>명</span>
        </div>
        <button
          onClick={() => setActiveTab('users')}
          style={{ marginTop: '15px', padding: '8px 16px', border: '1px solid #007bff', background: 'white', color: '#007bff', borderRadius: '4px', cursor: 'pointer' }}
        >
          관리하기
        </button>
      </div>
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '16px' }}>활성 상태 공지</h3>
        <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>
          {popupAnnouncements.filter(a => a.is_active).length} <span style={{ fontSize: '16px', color: '#666', fontWeight: 'normal' }}>개</span>
        </div>
        <button
          onClick={() => setActiveTab('announcements')}
          style={{ marginTop: '15px', padding: '8px 16px', border: '1px solid #28a745', background: 'white', color: '#28a745', borderRadius: '4px', cursor: 'pointer' }}
        >
          관리하기
        </button>
      </div>
      <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#666', fontSize: '16px' }}>고객 지원</h3>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '15px' }}>
          사용자 문의 및 피드백 확인
        </div>
        <button
          onClick={() => setActiveTab('support')}
          style={{ marginTop: '5px', padding: '8px 16px', border: '1px solid #6c757d', background: 'white', color: '#6c757d', borderRadius: '4px', cursor: 'pointer' }}
        >
          바로가기
        </button>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div>
      <div className="card" style={{ marginBottom: '24px' }}>
        <h3 style={{ marginTop: 0 }}>빠른 역할 변경</h3>
        <QuickRoleSetter onSet={setRole} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>승인 대기 사용자 목록</h3>
          <button onClick={load} className="btn btn-secondary" style={{ fontSize: '12px' }}>새로고침</button>
        </div>

        {loading ? (
          <p>불러오는 중...</p>
        ) : pending.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>대기 중인 사용자가 없습니다.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #eee", backgroundColor: '#f8f9fa' }}>
                  <th style={{ textAlign: "left", padding: '12px 8px', color: '#495057' }}>닉네임</th>
                  <th style={{ textAlign: "left", padding: '12px 8px', color: '#495057' }}>아이디</th>
                  <th style={{ textAlign: "left", padding: '12px 8px', color: '#495057' }}>요청 역할</th>
                  <th style={{ textAlign: "left", padding: '12px 8px', color: '#495057' }}>상태</th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', color: '#495057' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f1f1" }}>
                    <td style={{ padding: '12px 8px' }}>{u.nickname}</td>
                    <td style={{ padding: '12px 8px' }}>{u.username}</td>
                    <td style={{ padding: '12px 8px' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '12px', backgroundColor: '#e9ecef', fontSize: '12px' }}>{u.role}</span>
                    </td>
                    <td style={{ padding: '12px 8px' }}>{u.status}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                      <button className="btn btn-primary" onClick={() => approve(u.nickname)} style={{ padding: '4px 12px', fontSize: '12px', marginRight: '8px' }}>승인</button>
                      <select
                        defaultValue={u.role}
                        onChange={(e) => setRole(u.nickname, e.target.value)}
                        style={{ padding: '4px', borderRadius: '4px', border: '1px solid #ced4da' }}
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
          </div>
        )}
      </div>
    </div>
  );

  const renderAnnouncements = () => (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>전체 팝업 공지 관리</h3>
        <button
          onClick={() => setShowCreatePopup(!showCreatePopup)}
          className={`btn ${showCreatePopup ? 'btn-danger' : 'btn-success'}`}
        >
          {showCreatePopup ? '작성 취소' : '+ 새 공지 작성'}
        </button>
      </div>

      {showCreatePopup && (
        <form onSubmit={createPopupAnnouncement} style={{
          padding: 24,
          borderRadius: 8,
          marginBottom: 24,
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: 16 }}>새 공지 작성</h4>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: '14px' }}>제목</label>
            <input
              type="text"
              value={popupTitle}
              onChange={(e) => setPopupTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              className="input-field"
              style={{ width: '100%', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 8, fontSize: '14px' }}>내용</label>
            <textarea
              value={popupContent}
              onChange={(e) => setPopupContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={5}
              className="input-field"
              style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
            />
          </div>
          <div style={{ textAlign: 'right' }}>
            <button type="submit" className="btn btn-primary">공지 생성</button>
          </div>
        </form>
      )}

      <div>
        {popupAnnouncements.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
            생성된 팝업 공지가 없습니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {popupAnnouncements.map((announcement) => (
              <div key={announcement.id} style={{
                padding: 20,
                border: '1px solid #eee',
                borderRadius: '8px',
                backgroundColor: announcement.is_active ? '#fff' : '#f8f9fa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {announcement.is_active ?
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e6f4ea', color: '#1e7e34', fontWeight: 'bold' }}>ACTIVE</span>
                        :
                        <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e9ecef', color: '#495057', fontWeight: 'bold' }}>INACTIVE</span>
                      }
                      <h4 style={{ margin: 0, fontSize: '18px', color: announcement.is_active ? '#000' : '#666' }}>
                        {announcement.title}
                      </h4>
                    </div>
                    <div style={{ fontSize: '13px', color: '#888' }}>
                      작성자: {announcement.created_by} | 작성일: {new Date(announcement.created_at).toLocaleString('ko-KR')}
                    </div>
                  </div>
                  {announcement.is_active && (
                    <button
                      onClick={() => deactivatePopupAnnouncement(announcement.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      비활성화
                    </button>
                  )}
                </div>
                <div style={{
                  backgroundColor: announcement.is_active ? '#f8f9fa' : '#eee',
                  padding: 16,
                  borderRadius: 6,
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: announcement.is_active ? '#333' : '#666'
                }}>
                  {announcement.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
      <h3>피드백 및 문의 관리</h3>
      <p style={{ color: '#666', marginBottom: '24px' }}>
        사용자들이 보낸 다양한 문의사항과 피드백을 확인하고 답변할 수 있습니다.
      </p>
      <button
        className="btn btn-primary"
        onClick={() => navigate('/admin/support')}
        style={{ padding: '12px 24px', fontSize: '16px' }}
      >
        피드백/문의 게시판 이동
      </button>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "30px auto", padding: '0 20px' }}>
      <header style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>관리자 페이지</h1>
        <p style={{ color: '#666', margin: 0 }}>전체 시스템 현황 및 사용자 관리</p>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '24px' }}>
        {[
          { id: 'dashboard', label: '대시보드' },
          { id: 'users', label: '사용자 관리' },
          { id: 'announcements', label: '공지 관리' },
          { id: 'support', label: '고객 지원' }
        ].map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              color: activeTab === tab.id ? '#007bff' : '#495057',
              borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'announcements' && renderAnnouncements()}
        {activeTab === 'support' && renderSupport()}
      </div>
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
    <form onSubmit={submit} style={{ display: "flex", gap: 10, alignItems: 'center', backgroundColor: '#f8f9fa', padding: '16px', borderRadius: '6px' }}>
      <div style={{ flex: 1 }}>
        <input
          placeholder="닉네임 입력"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="input-field"
          style={{ width: '100%', margin: 0, boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input-field"
          style={{ margin: 0, height: '42px', cursor: 'pointer' }}
        >
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn btn-primary" style={{ height: '42px' }}>변경</button>
    </form>
  );
}