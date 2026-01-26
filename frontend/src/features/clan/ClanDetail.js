// [전체 코드] src/features/clan/ClanDetail.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // Link 추가
import { apiGet, apiPost, apiDelete, API_BASE_SERVER } from "../../api/api";
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAlert } from "../../context/AlertContext";
import './ClanCalendar.css';
import './ClanDetail.css'; // [New]
import Linkify from '../../components/Linkify';
import MobileLayout from "../../components/MobileLayout";
import GlobalHeader from "../../components/GlobalHeader";
import BottomNav from "../../components/BottomNav";
import ClanMemberView from './ClanMemberView'; // Import Dashboard

// 공지 폼 - 수정된 버전
const AnnounceForm = ({ user, clanId, isOwner, onPosted }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // isOwner prop이 (isClanAdmin으로 인해) true일 때만 이 컴포넌트가 렌더링됨
  if (!isOwner) return null;

  const postAnnounce = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }

    try {
      // ▼▼▼ [수정 3] 백엔드 API 형식에 맞춥니다. ▼▼▼
      // 1. apiPostForm (FormData) -> apiPost (JSON)
      // 2. URL: `/announcements` -> `/announcements/create/` (백엔드 urls.py와 일치)
      // 3. payload: 닉네임 제거 (백엔드에서 request.user로 자동 처리)
      await apiPost(`/clans/${clanId}/announcements/create/`, {
        title: title.trim(),
        content: content.trim()
      });
      // ▲▲▲ [수정 3] ▲▲▲

      // 성공 시 폼 초기화 및 닫기
      setOpen(false);
      setTitle("");
      setContent("");
      onPosted?.();
      alert("공지가 등록되었습니다!");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "공지 등록 실패");
    }
  };

  return (
    <div style={{ margin: "16px 0" }}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-primary"
          style={{ width: '100%' }}
        >
          공지 올리기
        </button>
      ) : (
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>제목</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#666" }}>내용</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              rows={4}
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                resize: "vertical"
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={postAnnounce}
              className="btn btn-primary"
              disabled={!title.trim() || !content.trim()}
            >
              등록
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setTitle("");
                setContent("");
              }}
              className="btn btn-secondary"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 가입 요청
const JoinRequests = ({ user, isOwner, clan, onAction }) => { // isOwner는 isClanAdmin 값을 받음
  if (!isOwner) return null;
  const pending = (clan.join_requests || []).filter((r) => r.status === "pending");

  const approve = async (reqId) => {
    try {
      // [수정] 백엔드 API 형식에 맞춥니다. 
      // URL: `/clans/${clan.id}/join-requests/${reqId}/`
      // Body: { action: 'approve' }
      await apiPost(`/clans/${clan.id}/join-requests/${reqId}/`, { action: 'approve' });
      alert("승인되었습니다.");
      onAction?.();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "승인 실패");
    }
  };
  const reject = async (reqId) => {
    try {
      await apiPost(`/clans/${clan.id}/join-requests/${reqId}/`, { action: 'reject' });
      alert("거절되었습니다.");
      onAction?.();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "거절 실패");
    }
  };

  const approveAll = async () => {
    if (!window.confirm(`${pending.length}명의 가입 요청을 모두 승인하시겠습니까?`)) return;
    try {
      // 이 API(`/clans/{clan.id}/approve-all`)는 우리가 만든 것이 맞습니다.
      const res = await apiPost(`/clans/${clan.id}/approve-all?nickname=${encodeURIComponent(user.nickname)}`);
      alert(res.message);
      onAction?.();
    } catch (e) {
      console.error(e);
      alert("일괄 승인에 실패했습니다.");
    }
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>가입 신청</h3>
        <button
          onClick={approveAll}
          style={{ padding: '4px 8px', fontSize: '0.8em', background: '#28a745', color: 'white' }}
          className="btn"
        >
          모두 승인
        </button>
      </div>
      <ul style={{ paddingLeft: 18, listStyle: 'none', margin: 0 }}>
        {pending.map((r) => (
          <li key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
            <span>{r.user?.nickname || '알 수 없음'}</span>
            <div>
              <button onClick={() => approve(r.id)} style={{ marginLeft: 8, fontSize: '0.8em', padding: '3px 6px' }}>
                승인
              </button>
              <button onClick={() => reject(r.id)} style={{ marginLeft: 6, fontSize: '0.8em', padding: '3px 6px' }}>
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// 멤버 목록
const MemberListModal = ({ user, clan, isOwner, onKicked, onClose }) => { // isOwner는 isClanAdmin 값을 받음
  const kick = async (targetNickname) => {
    // ... (기존 강퇴 로직 유지) ...
    // 강퇴 API가 nickname을 사용하는지 user_id를 사용하는지 확인 필요.
    // 기존 코드는 nickname을 사용하고 있음 (`/clans/${clan.id}/members/${targetNickname}/`)
    // backend urls.py: path('<int:clan_id>/members/<str:nickname>/', ...) -> OK
    if (!window.confirm(`${targetNickname} 님을 강퇴할까요?`)) return;
    try {
      await apiDelete(
        `/clans/${clan.id}/members/${encodeURIComponent(
          targetNickname
        )}/?nickname=${encodeURIComponent(user.nickname)}`
      );
      onKicked?.();
    } catch (e) {
      console.error(e);
      alert("강퇴 실패");
    }
  };

  const promote = async (userId, nickname) => {
    if (!window.confirm(`${nickname}님을 운영진으로 임명하시겠습니까?`)) return;
    try {
      // POST /api/v1/clans/<int:clan_id>/members/<int:user_id>/promote/
      await apiPost(`/clans/${clan.id}/members/${userId}/promote/`);
      alert(`${nickname}님을 운영진으로 임명했습니다.`);
      onKicked?.(); // 목록 새로고침 (이름은 onKicked지만 실제로는 refresh 역할)
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "권한 부여 실패");
    }
  };

  const demote = async (userId, nickname) => {
    if (!window.confirm(`${nickname}님의 운영진 권한을 해제하시겠습니까?`)) return;
    try {
      // POST /api/v1/clans/<int:clan_id>/members/<int:user_id>/demote/
      await apiPost(`/clans/${clan.id}/members/${userId}/demote/`);
      alert(`${nickname}님의 권한을 해제했습니다.`);
      onKicked?.();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "권한 해제 실패");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content member-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>멤버 ({(clan.members || []).length}명)</h3>
          <button onClick={onClose} className="close-button">&times;</button>
        </div>
        <div className="modal-body">
          <ul style={{ padding: 0, listStyle: 'none', margin: 0 }}>
            {(clan.members || []).map((m) => (
              <li key={m.nickname} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>
                  {m.nickname}
                  {m.nickname === clan.owner?.nickname && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: "blue", fontWeight: 'bold' }}>(클랜장)</span>
                  )}
                  {/* ▼▼▼ [추가] 관리자 배지 (admins 필드 사용) ▼▼▼ */}
                  {clan.admins && clan.admins.some(admin => admin.nickname === m.nickname) && m.nickname !== clan.owner?.nickname && (
                    <span style={{ marginLeft: 6, fontSize: 12, color: "green", fontWeight: 'bold' }}>(관리자)</span>
                  )}
                  {/* ▲▲▲ [추가] ▲▲▲ */}
                </span>
                {/* 관리자(소유자)만 볼 수 있는 관리 버튼들 */}
                {isOwner && m.nickname !== clan.owner?.nickname && (
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {/* 1. 강퇴 버튼 */}
                    <button onClick={() => kick(m.nickname)} className="btn btn-danger" style={{ fontSize: '0.8em', padding: '3px 8px' }}>
                      강퇴
                    </button>

                    {/* 2. 권한 관리 버튼 */}
                    {clan.admins && clan.admins.some(admin => admin.nickname === m.nickname) ? (
                      <button
                        onClick={() => demote(m.id, m.nickname)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.8em', padding: '3px 8px', background: '#e0a800', borderColor: '#d39e00', color: 'white' }}
                      >
                        권한 해제
                      </button>
                    ) : (
                      <button
                        onClick={() => promote(m.id, m.nickname)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8em', padding: '3px 8px', background: '#17a2b8', borderColor: '#17a2b8' }}
                      >
                        간부 임명
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

// 클랜 캘린더
const ClanCalendar = ({ user, clanId, isOwner, events, onAction }) => { // isOwner는 isClanAdmin 값을 받음
  const [date, setDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreateEvent = async () => {
    if (!title.trim()) return alert("일정 제목을 입력해주세요.");
    try {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      await apiPost(`/clans/${clanId}/events/`, {
        title, description, date: formattedDate,
      }, { params: { nickname: user.nickname } });
      alert("일정이 추가되었습니다.");
      onAction();
      setShowForm(false);
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error(err.response?.data);
      alert(JSON.stringify(err.response?.data) || "일정 추가 실패");
    }
  };

  // ( ... ClanCalendar의 나머지 코드는 동일 ... )
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) return;
    try {
      await apiDelete(`/clans/events/${eventId}/?nickname=${user.nickname}`);
      alert("일정이 삭제되었습니다.");
      onAction();
    } catch (err) {
      alert(err.response?.data?.detail || "일정 삭제 실패");
    }
  };

  const getEventsForDate = (d) => {
    return (events || []).filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getFullYear() === d.getFullYear() &&
        eventDate.getMonth() === d.getMonth() &&
        eventDate.getDate() === d.getDate();
    });
  }

  return (
    <div style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>
      <h3>클랜 캘린더</h3>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div className="clan-calendar-container">
          <Calendar
            onChange={setDate}
            value={date}
            tileContent={({ date, view }) => {
              if (view === 'month' && getEventsForDate(date).length > 0) {
                return <div style={{ height: '8px', width: '8px', background: 'red', borderRadius: '50%', margin: 'auto', marginTop: '4px' }}></div>;
              }
            }}
          />
          {isOwner && <button onClick={() => setShowForm(!showForm)} className="btn btn-secondary" style={{ marginTop: 10, width: '100%' }}>{showForm ? '취소' : '+ 새 일정 추가'}</button>}
        </div>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <h4>{date.toLocaleDateString()} 일정</h4>
          {getEventsForDate(date).length === 0 ? (
            <p>선택한 날짜에 일정이 없습니다.</p>
          ) : (
            <ul>
              {getEventsForDate(date).map(e => (
                <li key={e.id}>
                  <strong>{e.title}</strong>
                  {e.description && <p style={{ margin: '4px 0', color: '#666' }}>{e.description}</p>}
                  {isOwner && <button onClick={() => handleDeleteEvent(e.id)}>삭제</button>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isOwner && showForm && (
        <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 8, marginTop: 10 }}>
          <h4>{date.toLocaleDateString()} 새 일정 추가</h4>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="일정 제목" style={{ width: '100%', marginBottom: 8, padding: 8 }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="설명 (선택)" style={{ width: '100%', marginBottom: 8, padding: 8, height: 60 }} />
          <button onClick={handleCreateEvent}>추가하기</button>
        </div>
      )}
    </div>
  );
};


// 메인 컴포넌트
// 메인 컴포넌트
// ... Imports removed ...

// --- [Helper] Youtube ID Parser ---
const getYouTubeId = (url) => {
  if (!url) return null;
  // Handle standard, shortened, embed, and shorts URLs
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length >= 11) ? match[7] : null;
};

const NonMemberView = ({ clan, user, onRequestJoin, hasRequested, isOperator, onApprove, onReject }) => {
  const navigate = useNavigate();
  const youtubeId = getYouTubeId(clan.youtube_url);

  return (
    <div className="clan-detail-container">
      {/* Header */}
      <div className="clan-detail-header">
        <div onClick={() => navigate(-1)} style={{ cursor: 'pointer', marginRight: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </div>
        <h2 className="clan-detail-title">클랜</h2>
      </div>

      {/* Admin Approval Section */}
      {isOperator && clan.status === 'pending' && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', margin: '20px', borderRadius: '5px', border: '1px solid #ffeeba' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🚧 관리자 승인 대기 중</h3>
          <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>이 클랜은 승인 대기 상태입니다.</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onApprove} className="btn" style={{ background: '#28a745', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>승인</button>
            <button onClick={onReject} className="btn" style={{ background: '#dc3545', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}>거절</button>
          </div>
        </div>
      )}

      {/* Admin Rejected Section */}
      {(isOperator || clan.status === 'rejected') && clan.status === 'rejected' && (
        <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', margin: '20px', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>❌ 승인 거절됨</h3>
          <p style={{ margin: 0, fontSize: '14px' }}>이 클랜은 승인이 거절되었습니다.</p>
        </div>
      )}

      {/* Top Info */}
      <div className="clan-info-section">
        <div className="clan-info-image-wrapper">
          <img
            src={clan.image
              ? (clan.image.startsWith('http') ? clan.image : `${API_BASE_SERVER}${clan.image.startsWith('/') ? '' : '/'}${clan.image}`)
              : "https://placehold.co/80x80"}
            alt={clan.name}
            className="clan-info-img"
          />
        </div>
        <div className="clan-text-info">
          <div className="clan-name-large">{clan.name}</div>
          {/* Intro / Short Desc */}
          <div className="clan-desc-short">{clan.description}</div>
          <div className="clan-member-count-text">멤버 : {clan.member_count || (clan.members ? clan.members.length : 0)}명</div>
        </div>

        {/* Join Button */}
        {!hasRequested ? (
          <button className="clan-join-action-btn" onClick={onRequestJoin}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            클랜 신청
          </button>
        ) : (
          <button className="clan-join-action-btn completed" disabled>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
            </svg>
            신청 완료
          </button>
        )}
      </div>

      {/* Youtube Embed */}
      {youtubeId && (
        <div className="clan-youtube-section">
          <div className="youtube-embed-wrapper">
            <iframe
              className="youtube-iframe"
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="YouTube video player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};


// ... (Existing Member Components: AnnounceForm, JoinRequests, MemberListModal, ClanCalendar - Keeping them but condensed or reusing) ...
// Since I'm replacing the whole return of ClanDetail, I need to make sure I don't lose the Logic for Members.
// I will keep the sub-components definitions (AnnounceForm etc) at the top of the file (they are outside main component often, or inside).
// In previous file they were defined outside. I will preserve them. 
// BUT, I need to make sure ClanDetail renders efficiently.

// Existing subcomponents are fine. I will focus on the ClanDetail component render.

const ClanDetail = ({ user, onUpdateUser, onLogout }) => {
  const { clanId } = useParams();
  const navigate = useNavigate();
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasRequested, setHasRequested] = useState(false); // [New]

  // ... (Existing State for Member view) ...
  const [boardName, setBoardName] = useState("");
  const { showAlert } = useAlert();
  const [showMemberListModal, setShowMemberListModal] = useState(false);

  const fetchClan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/clans/${clanId}/`);
      setClan(data);

      // Check if user has pending request
      // Ideally backend returns this. If not, I can try to find myself in join_requests if I am not admin?
      // Wait, normal user cannot see join_requests.
      // So I might need a separate check or rely on 'retry' of API?
      // Or I can add a small endpoint `my_status`.
      // For now, let's assume if I click join, I get "Already requested".
      // But for Persistent UI "신청 완료", I need to know.
      // Let's try to check `data.join_requests`? 
      // If user is NOT admin/member, serializer might NOT return join_requests.
      // If so, I need another way.
      // I will assume for now I can't easily know unless I try to join.
      // BUT, let's try to fetch `/clans/${clanId}/my-request/` if I implemented it? No.
      // I will implement a quick check in `fetchClan`:
      // If I am NOT a member, try to see if I can find my status.
      // Actually, let's just use a local state 'requested' if I click it.
      // But user wants it to persits? "신청 완료"
      // I'll check `join_requests` if available.
      if (data.join_requests && Array.isArray(data.join_requests)) {
        const myReq = data.join_requests.find(r => r.user.nickname === user.nickname);
        if (myReq) setHasRequested(true);
      }

    } catch (e) {
      if (e.response && e.response.status === 401) {
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        onLogout();
      } else {
        alert("클랜 정보를 불러오지 못했습니다.");
      }
    } finally {
      setLoading(false);
    }
  }, [clanId, onLogout, user]); // User needed for nickname check

  useEffect(() => {
    fetchClan();
  }, [fetchClan]);

  // ... (Existing handlers for Member View: handleCreateBoard, handleDeleteAnnouncement, etc) ...

  // Member Check
  const isMember = user && clan && (clan.members || []).some((m) => m && m.nickname === user.nickname);
  const isOwner = user && clan && clan.owner?.nickname === user.nickname;
  const isAdmin = user && clan && clan.admins && clan.admins.some(admin => admin.nickname === user.nickname);
  const isClanAdmin = isOwner || isAdmin;

  const requestJoin = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    try {
      // POST `/clans/{pk}/join_request/`
      // I'll check my API list. Usually it was `/clans/${clanId}/join/` in previous code but comment said it was GET?
      // I will use `apiPost(`/clans/${clanId}/join/`)` as strictly defined in previous code line 490.
      await apiPost(`/clans/${clanId}/join/`);
      alert("가입 신청을 보냈습니다.");
      setHasRequested(true);
      fetchClan();
    } catch (e) {
      // If already requested
      if (e.response && e.response.status === 400 && e.response.data.detail.includes("already")) {
        setHasRequested(true);
        alert("이미 신청했습니다.");
      } else {
        alert(e?.response?.data?.detail || "가입 신청 실패");
      }
    }
  };

  // Admin Actions
  const handleApprove = async () => {
    if (!window.confirm("이 클랜을 승인하시겠습니까?")) return;
    try {
      await apiPost(`/clans/manage/${clan.id}/approve/`);
      alert("승인되었습니다.");
      fetchClan();
    } catch (e) {
      alert("승인 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const handleReject = async () => {
    if (!window.confirm("이 클랜을 거절하시겠습니까?")) return;
    try {
      await apiPost(`/clans/manage/${clan.id}/reject/`);
      alert("거절되었습니다.");
      navigate('/clans');
    } catch (e) {
      alert("거절 실패: " + (e.response?.data?.detail || e.message));
    }
  };

  const isOperator = user?.role === 'OPERATOR';

  // Render
  if (loading) return <MobileLayout><div style={{ padding: 20 }}>로딩중…</div></MobileLayout>;
  if (!clan) return <MobileLayout><div style={{ padding: 20 }}>존재하지 않는 클랜입니다.</div></MobileLayout>;

  return (
    <MobileLayout>
      <GlobalHeader user={user} />

      {/* Sub Header for Back Navigation */}
      <div className="clan-detail-header" style={{ position: 'sticky', top: '50px', padding: '10px 20px', borderBottom: '1px solid #eee', background: 'white', zIndex: 9 }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '5px', marginRight: '10px' }}>
          {/* Simple Chevron or < */}
          &lt;
        </button>
        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>클랜</span>
      </div>

      {isMember ? (
        <>
          {/* Admin/Rejected Alerts */}
          {clan.status === 'pending' && (
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '5px', border: '1px solid #ffeeba' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>🚧 승인 대기 중</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>이 클랜은 아직 관리자의 승인을 받지 못했습니다.</p>
              </div>
            </div>
          )}
          {clan.status === 'rejected' && (
            <div style={{ padding: '20px' }}>
              <div style={{ background: '#f8d7da', color: '#721c24', padding: '15px', borderRadius: '5px', border: '1px solid #f5c6cb' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>❌ 승인 거절됨</h3>
                <p style={{ margin: 0, fontSize: '14px' }}>이 클랜은 승인이 거절되어 이용할 수 없습니다.</p>
              </div>
            </div>
          )}

          {/* New Member Dashboard */}
          {clan.status !== 'rejected' && (
            <ClanMemberView clan={clan} user={user} />
          )}
        </>
      ) : (
        // --- NON-MEMBER VIEW ---
        <NonMemberView
          clan={clan}
          user={user}
          onRequestJoin={requestJoin}
          hasRequested={hasRequested}
          isOperator={isOperator}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <BottomNav />
    </MobileLayout>
  );
};

// ... (Subcomponents) ...
// I will not replace Subcomponents if I use 'replace_file_content' smartly.
// But 'replace_file_content' replaces a block. 
// The file is huge. I should probably use 'replace_file_content' to only replace the `ClanDetail` component definition
// and leave subcomponents above it alone.
// Start Line: 386 (const ClanDetail = ...)
// End Line: 736


export default ClanDetail;