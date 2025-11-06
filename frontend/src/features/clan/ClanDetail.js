// [전체 코드] src/features/clan/ClanDetail.js
import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom"; // Link 추가
import { apiGet, apiPost, apiDelete, apiPostForm } from "../../api/api";
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

  if (!isOwner) return null;

  const postAnnounce = async () => {
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 모두 입력해주세요.");
      return;
    }
    
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("content", content.trim());
      fd.append("nickname", user.nickname);
      
      await apiPostForm(`/clans/${clanId}/announcements`, fd);
      
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
          onClick={() => setOpen(true)} // ✅ 폼을 여는 기능으로 변경
          className="btn btn-primary" 
          style={{width: '100%'}}
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
              onClick={postAnnounce} // ✅ 실제 등록 기능
              className="btn btn-primary"
              disabled={!title.trim() || !content.trim()} // 빈 값일 때 비활성화
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
const JoinRequests = ({ user, isOwner, clan, onAction }) => {
  if (!isOwner) return null;
  const pending = (clan.join_requests || []).filter((r) => r.status === "pending");

  const approve = async (reqId) => {
    try {
      await apiPost(`/clans/requests/${reqId}/approve?nickname=${encodeURIComponent(user.nickname)}`);
      onAction?.();
    } catch (e) {
      console.error(e);
      alert("승인 실패");
    }
  };
  const reject = async (reqId) => {
    try {
      await apiPost(`/clans/requests/${reqId}/reject?nickname=${encodeURIComponent(user.nickname)}`);
      onAction?.();
    } catch (e) {
      console.error(e);
      alert("거절 실패");
    }
  };

  // 👇 [추가] '모두 승인' 버튼을 눌렀을 때 실행될 함수
  const approveAll = async () => {
    if (!window.confirm(`${pending.length}명의 가입 요청을 모두 승인하시겠습니까?`)) return;
    try {
      const res = await apiPost(`/clans/${clan.id}/approve-all?nickname=${encodeURIComponent(user.nickname)}`);
      alert(res.message);
      onAction?.(); // 성공 후 클랜 정보 새로고침
    } catch (e) {
      console.error(e);
      alert("일괄 승인에 실패했습니다.");
    }
  };

  if (pending.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      {/* 👇 [수정] 제목 옆에 '모두 승인' 버튼을 추가합니다. */}
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
const MemberListModal = ({ user, clan, isOwner, onKicked, onClose }) => {
    const kick = async (targetNickname) => {
        if (!window.confirm(`${targetNickname} 님을 강퇴할까요?`)) return;
        try {
            await apiDelete(
                `/clans/${clan.id}/members/${encodeURIComponent(
                    targetNickname
                )}?nickname=${encodeURIComponent(user.nickname)}`
            );
            onKicked?.(); // 성공 시 부모 컴포넌트의 데이터 새로고침
        } catch (e) {
            console.error(e);
            alert("강퇴 실패");
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
                                </span>
                                {isOwner && m.nickname !== clan.owner?.nickname && (
                                    <button onClick={() => kick(m.nickname)} className="btn btn-danger" style={{ fontSize: '0.8em', padding: '3px 8px' }}>
                                        강퇴
                                    </button>
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
const ClanCalendar = ({ user, clanId, isOwner, events, onAction }) => {
    const [date, setDate] = useState(new Date());
    const [showForm, setShowForm] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");

    const handleCreateEvent = async () => {
        if (!title.trim()) return alert("일정 제목을 입력해주세요.");
        try {
            const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
            await apiPost(`/clans/${clanId}/events`, {
                title, description, date: utcDate.toISOString(),
            }, { params: { nickname: user.nickname }});
            alert("일정이 추가되었습니다.");
            onAction();
            setShowForm(false);
            setTitle("");
            setDescription("");
        } catch (err) {
            alert(err.response?.data?.detail || "일정 추가 실패");
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm("이 일정을 삭제하시겠습니까?")) return;
        try {
            await apiDelete(`/clans/events/${eventId}?nickname=${user.nickname}`);
            alert("일정이 삭제되었습니다.");
            onAction();
        } catch(err) {
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
                                    {e.description && <p style={{margin: '4px 0', color: '#666'}}>{e.description}</p>}
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
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="설명 (선택)" style={{ width: '100%', marginBottom: 8, padding: 8, height: 60 }}/>
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
  const [boardName, setBoardName] = useState(""); // 게시판 이름 state 추가
  const { showAlert } = useAlert(); // <<< 이 줄을 추가해주세요.
  const [showMemberListModal, setShowMemberListModal] = useState(false);

  const fetchClan = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet(`/clans/${clanId}`);
      setClan(data);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        // 401 (인증 만료) 에러면 onLogout을 호출
        alert("세션이 만료되었습니다. 다시 로그인해주세요.");
        onLogout();
    } else {
        // 그 외 다른 에러 (404 등)
        alert("클랜 정보를 불러오지 못했습니다.");
    }
    } finally {
      setLoading(false);
    }
  }, [clanId]);

  useEffect(() => {
    fetchClan();
  }, [fetchClan]);

  const handleCreateBoard = async () => {
    if (!boardName.trim()) return alert("게시판 이름을 입력해주세요.");
    try {
      await apiPost(`/clans/${clanId}/boards?nickname=${user.nickname}`, { name: boardName });
      alert("새로운 게시판이 생성되었습니다.");
      setBoardName("");
      fetchClan(); // 클랜 정보 새로고침
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
                  // 백엔드에 삭제 요청을 보냅니다.
                  await apiDelete(`/clans/announcements/${announcementId}?nickname=${user.nickname}`);
                  alert("공지를 삭제했습니다.");
                  fetchClan(); // 공지 목록을 새로고침합니다.
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
                await apiDelete(`/clans/boards/${boardId}?nickname=${encodeURIComponent(user.nickname)}`);
                showAlert("성공", "게시판이 삭제되었습니다.", fetchClan, false);
            } catch (e) {
                showAlert("오류", e.response?.data?.detail || "삭제 실패", () => {}, false);
            }
        }
    );
  };

  const isOwner = user && clan && clan.owner?.nickname === user.nickname;
  const isMember = user && clan && (clan.members || []).some((m) => m.nickname === user.nickname);

  const requestJoin = async () => {
    if (!user) return alert("로그인이 필요합니다.");
    try {
      const res = await apiPost(`/clans/${clanId}/join?nickname=${encodeURIComponent(user.nickname)}`);
      alert(res?.message || "가입 신청을 보냈습니다.");
        
        // --- 👇 [핵심 수정] 이 부분이 최신 사용자 정보를 다시 불러오는 코드입니다. ---
        // 비밀번호 없이 ID만으로 로그인 API를 다시 호출하여 최신 유저 정보를 받아옵니다.
        // 이를 위해선 백엔드 login API에 password가 없는 경우를 처리하는 로직이 필요하지만,
        // 현재 구조에서는 onUpdateUser를 통해 App.js의 상태를 갱신하는 것이 좋습니다.
        // 다만, login API를 그대로 사용하면 비밀번호가 필요하므로,
        // 여기서는 fetchClan()을 호출하여 클랜 정보만 갱신합니다.
        // 더 확실한 방법은 사용자 정보를 다시 불러오는 API를 호출하는 것입니다.
        // 지금은 fetchClan()을 통해 클랜 정보만이라도 최신으로 유지합니다.
      fetchClan();

        // 사용자 정보를 갱신하기 위해 App.js에 있는 onUpdateUser 함수를 호출합니다.
        // 이를 위해선 App.js에서 onUpdateUser를 이 컴포넌트로 전달해줘야 합니다.
        // (이 부분은 App.js 수정이 필요할 수 있습니다)
        // 만약 onUpdateUser가 없다면, 페이지를 새로고침하여 정보를 갱신할 수 있습니다.
      window.location.reload();

    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.detail || "가입 신청 실패");
    }
  };


  if (loading) return <div style={{ padding: 20 }}>로딩중…</div>;
  if (!clan) return <div style={{ padding: 20 }}>존재하지 않는 클랜입니다.</div>;

  return (
    <div style={{ padding: 20 }}>
      {/* --- 👇 [핵심] div에 className을 적용하고, 버튼의 style을 삭제합니다. --- */}
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">← 뒤로</button>

        {isMember && (
          <Link to={`/clans/${clanId}/dashboard`}>
              <button className="btn btn-primary">합주방 리스트 보기</button>
          </Link>
        )}

        {!isMember && ( // [수정] isOwner 조건 제거, 멤버가 아닐 때만 가입신청 보이기
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
        
              {/* --- 버튼 그룹 --- */}
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
            {/* --- 👇 [핵심] 이 버튼과 Link를 추가하세요. --- */}
            <Link to={`/clans/${clanId}/activity`} style={{ textDecoration: 'none' }}>
                <button 
                    className="btn" 
                    style={{width: '100%', background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529', textAlign: 'left', padding: '12px 15px'}}
                >
                    <span style={{fontWeight: 'bold'}}>클랜원 활동 현황</span>
                    <span style={{float: 'right', color: '#6c757d'}}>&gt;</span>
                </button>
            </Link>

            <button 
              onClick={() => setShowMemberListModal(true)} 
              className="btn" 
              style={{width: '100%', marginTop: '15px', background: '#f8f9fa', border: '1px solid #dee2e6', color: '#212529', textAlign: 'left', padding: '12px 15px'}}
            >
              <span style={{fontWeight: 'bold'}}>전체 멤버 보기</span>
              <span style={{float: 'right', color: '#6c757d'}}>{(clan.members || []).length}명 &gt;</span>
            </button>
        </>
      )}

      <div style={{borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10}}>
          {/* Members 컴포넌트는 삭제되었으므로, JoinRequests만 남깁니다. */}
          <JoinRequests user={user} isOwner={isOwner} clan={clan} onAction={fetchClan} />
      </div>
      
      {/* [수정] isMember일 경우에만 공지사항과 캘린더를 보여줍니다. */}
      {isMember && (
        <>
          {/* --- 공지사항 섹션 --- */}
          <div style={{borderTop: '1px solid #eee', marginTop: 10, paddingTop: 10}}>
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
                          {isOwner && (
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

            <AnnounceForm user={user} clanId={clan.id} isOwner={isOwner} onPosted={fetchClan} />
          </div>
          
          {/* --- 클랜 게시판 섹션 --- */}
          <div style={{borderTop: '1px solid #eee', marginTop: 20, paddingTop: 10}}>
              <h3>클랜 게시판</h3>
              {isOwner && (
                  <div className="card" style={{marginBottom: '15px'}}>
                      <h4 style={{marginTop: 0}}>새 게시판 만들기</h4>
                      <input value={boardName} onChange={e => setBoardName(e.target.value)} placeholder="게시판 이름" className="input-field" style={{margin: 0}} />
                      <button onClick={handleCreateBoard} className="btn btn-primary" style={{marginTop: '10px'}}>생성</button>
                  </div>
              )}
              
              {(clan.boards || []).length === 0 ? (
                <p>아직 생성된 게시판이 없습니다.</p>
              ) : (
                (clan.boards || []).map(board => (
                  <div key={board.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <Link to={`/boards/clan/${board.id}`} style={{textDecoration: 'none', flex: 1}}>
                        <div className="card" style={{margin: 0}}>
                            {board.name}
                        </div>
                    </Link>
                    {isOwner && (
                        <button 
                            onClick={() => handleDeleteBoard(board.id, board.name)}
                            className="btn btn-danger"
                            style={{ padding: '8px 12px' }}
                        >
                            삭제
                        </button>
                    )}
                  </div>
                ))
              )}
          </div>

          {/* --- 클랜 캘린더 섹션 --- */}
          <ClanCalendar user={user} clanId={clan.id} isOwner={isOwner} events={clan.events || []} onAction={fetchClan} />
        </>
      )}
      {showMemberListModal && (
          <MemberListModal
              user={user}
              clan={clan}
              isOwner={isOwner}
              onKicked={fetchClan}
              onClose={() => setShowMemberListModal(false)}
          />
      )}
    </div>
  );
};      

export default ClanDetail;