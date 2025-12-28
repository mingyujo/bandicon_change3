// [전체 코드] src/features/clan/ClanDetail.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // Link 추가
import { apiGet, apiPost, apiDelete } from "../../api/api"; // apiPost가 이미 import 되어 있습니다.
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useAlert } from "../../context/AlertContext";
import './ClanCalendar.css';
import Linkify from '../../components/Linkify';

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
                {/* 운영자(소유자)만 볼 수 있는 관리 버튼들 */}
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
const ClanDetail = ({ user, onUpdateUser, onLogout }) => {
  const { clanId } = useParams();
  const navigate = useNavigate();
  const [clan, setClan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [boardName, setBoardName] = useState("");
  const { showAlert } = useAlert();
  const [showMemberListModal, setShowMemberListModal] = useState(false);

  const fetchClan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/clans/${clanId}/`);
      setClan(data);
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
  }, [clanId, onLogout]);

  useEffect(() => {
    fetchClan();
  }, [fetchClan]);

  const handleCreateBoard = async () => {
    if (!boardName.trim()) return alert("게시판 이름을 입력해주세요.");
    try {
      // [API 확인 필요] 3순위 기능 (미구현)
      await apiPost(`/clans/${clanId}/boards/`, { name: boardName });
      alert("새로운 게시판이 생성되었습니다.");
      setBoardName("");
      fetchClan();
    } catch (err) {
      alert(err.response?.data?.detail || "게시판 생성 실패");
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    showAlert(
      "공지 삭제 확인",
      "정말로 이 공지를 삭제하시겠습니까?",
      async () => {
        try {
          // [API 확인 필요] 3순위 기능 (미구현)
          await apiDelete(`/clans/announcements/${announcementId}/?nickname=${user.nickname}`);
          alert("공지를 삭제했습니다.");
          fetchClan();
        } catch (err) {
          alert(err.response?.data?.detail || "공지 삭제에 실패했습니다.");
        }
      }
    );
  };

  const handleDeleteBoard = async (boardId, boardName) => {
    showAlert(
      "게시판 삭제",
      `'${boardName}' 게시판을 정말로 삭제하시겠습니까?\n게시판 안의 모든 글이 사라집니다.`,
      async () => {
        try {
          // [API 확인 필요] 3순위 기능 (미구현)
          await apiDelete(`/clans/boards/${boardId}/?nickname=${encodeURIComponent(user.nickname)}`);
          showAlert("성공", "게시판이 삭제되었습니다.", fetchClan, false);
        } catch (e) {
          showAlert("오류", e.response?.data?.detail || "삭제 실패", () => { }, false);
        }
      }
    );
  };

  // ▼▼▼ [수정 1] 'isOwner' 외 'isClanAdmin' 로직 추가 ▼▼▼
  const isOwner = user && clan && clan.owner?.nickname === user.nickname;
  // 'clan.admins' 배열을 확인하여 현재 user가 관리자인지 확인
  const isAdmin = user && clan && clan.admins && clan.admins.some(admin => admin.nickname === user.nickname);
  // [최종] 소유자(Owner)이거나 관리자(Admin)이면 isClanAdmin = true
  const isClanAdmin = isOwner || isAdmin;

  // [디버깅] 권한 확인 로그
  console.log("DEBUG: ClanDetail Permissions", {
    userNickname: user?.nickname,
    ownerNickname: clan?.owner?.nickname,
    isOwner,
    isAdmin,
    isClanAdmin,
    admins: clan?.admins
  });
  // ▲▲▲ [수정 1] ▲▲▲

  const isMember = user && clan && (clan.members || []).some((m) => m.nickname === user.nickname);

  const requestJoin = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    try {
      // [API 확인 필요] 이 API(`/clans/{clanId}/join/`)는 POST가 아니라 GET이었습니다.
      // 우리가 만든 API는 POST `/clans/{pk}/join_request/` 입니다.
      const res = await apiPost(`/clans/${clanId}/join/`);

      alert(res?.message || "가입 신청을 보냈습니다.");
      fetchClan();
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "가입 신청 실패");
    }
  };


  if (loading) return <div style={{ padding: 20 }}>로딩중…</div>;
  if (!clan) return <div style={{ padding: 20 }}>존재하지 않는 클랜입니다.</div>;

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

  return (
    <div style={{ padding: 20 }}>
      {clan.status === 'pending' && (
        <div style={{ background: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '5px', marginBottom: '20px', border: '1px solid #ffeeba' }}>
          <h3 style={{ margin: '0 0 10px 0' }}>🚧 승인 대기 중</h3>
          <p style={{ margin: 0 }}>이 클랜은 아직 운영자의 승인을 받지 못했습니다. 승인 전까지는 공개적으로 모집할 수 없습니다.</p>
          {user?.role === 'OPERATOR' && (
            <div style={{ marginTop: '15px' }}>
              <button onClick={handleApprove} className="btn" style={{ marginRight: '10px', background: '#28a745', color: 'white', padding: '8px 16px' }}>승인</button>
              <button onClick={handleReject} className="btn" style={{ background: '#dc3545', color: 'white', padding: '8px 16px' }}>거절</button>
            </div>
          )}
        </div>
      )}

      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">← 뒤로</button>

        {isMember && (
          <Link to={`/clans/${clanId}/dashboard`}>
            <button className="btn btn-primary">합주방 리스트 보기</button>
          </Link>
        )}

        {!isMember && (
          <button onClick={requestJoin}>클랜 가입 신청</button>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h2 style={{ margin: 0 }}>{clan.name}</h2>
        {clan.description && (
          <div style={{ color: "#666", marginTop: 4, marginBottom: '10px' }}>
            <Linkify>{clan.description}</Linkify>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: '10px' }}>
          {isMember && (
            <Link to={`/chats/clan/${clanId}`} style={{ flex: 1 }}>
              <button className="btn btn-primary" style={{ width: '100%' }}>단체 채팅</button>
            </Link>
          )}
          {isMember && (
            <Link to={`/clans/${clanId}/rooms`} style={{ flex: 1, textDecoration: 'none' }}>
              <button className="btn btn-secondary" style={{ width: '100%' }}>
                클랜 합주방
              </button>
            </Link>
          )}
        </div>
      </div>

      {isMember && (
        <>
          <Link to={`/clans/${clanId}/activity`} style={{ textDecoration: 'none' }}>
            <button
              className="btn"
              style={{ width: '100%', background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529', textAlign: 'left', padding: '12px 15px' }}
            >
              <span style={{ fontWeight: 'bold' }}>클랜원 활동 현황</span>
              <span style={{ float: 'right', color: '#6c757d' }}>&gt;</span>
            </button>
          </Link>

          <button
            onClick={() => setShowMemberListModal(true)}
            className="btn"
            style={{ width: '100%', marginTop: '15px', background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529', textAlign: 'left', padding: '12px 15px' }}
          >
            <span style={{ fontWeight: 'bold' }}>전체 멤버 보기</span>
            <span style={{ float: 'right', color: '#6c757d' }}>{(clan.members || []).length}명 &gt;</span>
          </button>
        </>
      )}

      <div style={{ borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10 }}>
        {/* ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 전달 ▼▼▼ */}
        <JoinRequests user={user} isOwner={isClanAdmin} clan={clan} onAction={fetchClan} />
        {/* ▲▲▲ [수정 2] ▲▲▲ */}
      </div>

      {isMember && (
        <>
          <div style={{ borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10 }}>
            <h3 style={{ marginTop: 20, marginBottom: 15 }}>📢 공지사항</h3>
            {(clan.announcements || []).length === 0 ? (
              <div className="card" style={{ padding: '20px', textAlign: 'center', color: '#888', background: '#f8f9fa' }}>
                아직 등록된 공지가 없습니다.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(clan.announcements || [])
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((a, index) => (
                    <div key={a.id} style={{
                      background: 'var(--primary-color-light)',
                      borderLeft: '4px solid var(--primary-color)',
                      borderRadius: '8px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.1em', color: 'var(--text-color)' }}>
                          {a.title}
                        </span>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {index === 0 && (
                            <span style={{
                              background: 'var(--primary-color)', color: 'white',
                              padding: '2px 8px', borderRadius: '12px',
                              fontSize: '0.7em', fontWeight: 'bold'
                            }}>
                              NEW
                            </span>
                          )}
                          {/* ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 변경 ▼▼▼ */}
                          {isClanAdmin && (
                            <button
                              onClick={() => handleDeleteAnnouncement(a.id)}
                              style={{
                                background: 'transparent', border: 'none', color: '#dc3545',
                                cursor: 'pointer', fontSize: '0.8em', fontWeight: 'bold', padding: '0'
                              }}
                            >
                              삭제
                            </button>
                          )}
                          {/* ▲▲▲ [수정 2] ▲▲▲ */}
                        </div>
                      </div>
                      <div style={{ color: '#333', marginBottom: '12px', lineHeight: '1.6' }}>
                        <Linkify>{a.content}</Linkify>
                      </div>
                      <div style={{ fontSize: '0.8em', color: "#666", textAlign: 'right' }}>
                        {new Date(a.created_at).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 전달 ▼▼▼ */}
            <AnnounceForm user={user} clanId={clan.id} isOwner={isClanAdmin} onPosted={fetchClan} />
            {/* ▲▲▲ [수정 2] ▲▲▲ */}
          </div>

          <div style={{ borderTop: '1px solid #eee', marginTop: 20, paddingTop: 10 }}>
            <h3>클랜 게시판</h3>
            {/* ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 변경 ▼▼▼ */}
            {isClanAdmin && (
              <div className="card" style={{ marginBottom: '15px' }}>
                <h4 style={{ marginTop: 0 }}>새 게시판 만들기</h4>
                <input value={boardName} onChange={e => setBoardName(e.target.value)} placeholder="게시판 이름" className="input-field" style={{ margin: 0 }} />
                <button onClick={handleCreateBoard} className="btn btn-primary" style={{ marginTop: '10px' }}>생성</button>
              </div>
            )}
            {/* ▲▲▲ [수정 2] ▲▲▲ */}

            {(clan.boards || []).length === 0 ? (
              <p>아직 생성된 게시판이 없습니다.</p>
            ) : (
              (clan.boards || []).map(board => (
                <div key={board.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  {/* ▼▼▼ [수정] Link에 state={{ clanId: clan.id }} 추가 ▼▼▼ */}
                  <Link
                    to={`/boards/clan/${board.id}`}
                    state={{ clanId: clan.id }} // [핵심] 여기서 출입증을 발급합니다!
                    style={{ textDecoration: 'none', flex: 1 }}
                  >
                    <div className="card" style={{ margin: 0 }}>
                      {board.title}
                    </div>
                  </Link>
                  {/* ▲▲▲ [수정 완료] ▲▲▲ */}
                  {isClanAdmin && (
                    <button
                      onClick={() => handleDeleteBoard(board.id, board.title)}
                      className="btn btn-danger"
                      style={{ padding: '8px 12px' }}
                    >
                      삭제
                    </button>
                  )}
                  {/* ▲▲▲ [수정 2] ▲▲▲ */}
                </div>
              ))
            )}
          </div>

          {/* ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 전달 ▼▼▼ */}
          <ClanCalendar user={user} clanId={clan.id} isOwner={isClanAdmin} events={clan.events || []} onAction={fetchClan} />
          {/* ▲▲▲ [수정 2] ▲▲▲ */}
        </>
      )}
      {showMemberListModal && (
        <MemberListModal
          user={user}
          clan={clan}
          // ▼▼▼ [수정 2] isOwner -> isClanAdmin으로 전달 ▼▼▼
          isOwner={isOwner}
          // ▲▲▲ [수정 2] ▲▲▲
          onKicked={fetchClan}
          onClose={() => setShowMemberListModal(false)}
        />
      )}
    </div>
  );
};

export default ClanDetail;