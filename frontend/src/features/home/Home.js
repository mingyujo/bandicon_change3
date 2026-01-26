// [전체 코드] src/features/home/Home.js
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, API_BASE_SERVER } from "../../api/api";
import "./Home.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Home({ user }) {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await apiGet("/users/home/");
        setDashboardData(data);
      } catch (err) {
        console.error("Failed to fetch home data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="home-container" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>Loading...</div>;
  if (!dashboardData) return null;

  const { user: userInfo, banners, my_room, my_clan, schedules } = dashboardData;
  const todayIndex = new Date().getDay(); // 0: Sun, 1: Mon ...

  // 배너 (첫번째 것만 표시)
  const mainBanner = banners && banners.length > 0 ? banners[0] : null;

  return (
    <div className="home-container">

      {/* --- Top Bar (Sticky Global) --- */}
      <div className="home-top-bar">
        <Link to="/" className="home-brand" style={{ textDecoration: 'none' }}>Bandicon</Link>
        <div className="home-profile-area">
          <Link to="/profile" className="home-profile-name" style={{ textDecoration: 'none' }}>{userInfo.nickname} 님</Link>
          {/* 채팅 버튼 (기존 프로필 이미지 위치) */}
          <Link to="/chats" style={{ display: 'block' }}>
            <div className="home-profile-img" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#ddd', cursor: 'pointer' }}>
              {/* 사용자 요청: 아무 이미지나 채워넣기 (추후 변경) */}
              <span style={{ fontSize: '8px' }}>Chat</span>
            </div>
          </Link>
        </div>
      </div>

      {/* --- Section 1: Banner --- */}
      <div className="home-snap-section-1">
        <div className="home-banner-wrapper">
          {mainBanner ? (
            <a href={mainBanner.link || "#"} target="_blank" rel="noopener noreferrer" style={{ width: '100%', height: '100%', display: 'block' }}>
              <img src={mainBanner.image} alt={mainBanner.title} className="home-banner-img" />
            </a>
          ) : (
            <div className="home-banner-placeholder">
              광고 배너 영역 (Admin에서 업로드)
            </div>
          )}
        </div>

      </div>


      {/* --- Section 2: Main Content --- */}
      <div className="home-snap-section-2">
        <div className="home-content-inner">
          {/* Schedule Section */}
          <div className="home-section-title">다가오는 합주 일정</div>
          <div className="home-schedule-container">
            <div className="schedule-header-row">
              {WEEKDAYS.map((day, idx) => (
                <div key={day} className="schedule-day-header">{day}</div>
              ))}
            </div>
            <div className="schedule-slots-row">
              {WEEKDAYS.map((day, idx) => {
                const isToday = idx === todayIndex;
                const hasEvent = schedules.some(s => new Date(s.date).getDay() === idx); // Mock logic
                return (
                  <div key={day} className={`schedule-slot ${isToday ? 'today' : ''} ${hasEvent ? 'event' : ''}`}>
                    <div className="schedule-slot-content">
                      {isToday && <span className="schedule-today-label">Today</span>}
                      {hasEvent && <span style={{ fontSize: '9px', marginTop: '2px' }}>공연</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* My Ensemble (Room) */}
          <div className="home-section-title">내 합주</div>
          <div className="home-card-box">
            {my_room ? (
              <div className="active-item-row">
                {/* 이미지 등은 나중에 룸에서 가져오거나 기본 이미지 */}
                <div
                  className="active-item-img"
                  style={{
                    backgroundImage: my_room.image
                      ? `url(${my_room.image.startsWith('http') ? my_room.image : API_BASE_SERVER + my_room.image}?v=${Date.now()})`
                      : 'none',
                    backgroundColor: my_room.image ? 'transparent' : '#c2ffd9',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                ></div>
                <div className="active-item-info">
                  <div className="active-item-title">{my_room.title}</div>
                  <div className="active-item-sub">{my_room.status === 'manager' ? '방장' : '참여자'}</div>
                </div>
                <Link to="/my-rooms" className="btn-more-text">더보기</Link>
              </div>
            ) : (
              <>
                <div className="empty-state-text">참여 중인 방이 없습니다</div>
                <Link to="/rooms" className="btn-action-small">합주방 보러 가기</Link>
              </>
            )}
          </div>

          {/* My Clan */}
          <div className="home-section-title">내 클랜</div>
          <div className="home-card-box">
            {my_clan ? (
              <div className="active-item-row">
                <div className="active-item-img" style={{ background: '#ff6b6b' }}></div>
                <div className="active-item-info">
                  <div className="active-item-title">{my_clan.name}</div>
                  <div className="active-item-sub">멤버 : {my_clan.member_count}명</div>
                </div>
                <Link to="/clans/my" className="btn-more-text">더보기</Link>
              </div>
            ) : (
              <>
                <div className="empty-state-text">소속된 클랜이 없습니다</div>
                <Link to="/clans" className="btn-action-small">클랜 보러 가기</Link>
              </>
            )}
          </div>

          {/* My Practice Room (Placeholder) */}
          <div className="home-section-title">내 연습실</div>
          <div className="practice-placeholder">
            준비 중인 기능입니다
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="home-bottom-nav">
          {/* 1. 자유합주방 -> /rooms */}
          <Link to="/rooms" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
              <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
            </svg>
          </Link>
          {/* 2. 게시판 -> /boards */}
          <Link to="/boards" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
            </svg>
          </Link>
          {/* 3. 홈화면 -> / */}
          <Link to="/" className="nav-item" style={{ color: 'var(--color-파란색)' }}>
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </Link>
          {/* 4. 클랜 -> /clans */}
          <Link to="/clans" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </Link>
          {/* 5. 엠버서더 화면 -> /ambassador (임시 라우트) */}
          <Link to="/ambassador" className="nav-item">
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </Link>
        </div>
      </div>

    </div>
  );
}