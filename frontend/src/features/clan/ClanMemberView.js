import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/api';
import { startOfWeek, addDays, format, isSameDay, isToday, parseISO } from 'date-fns'; // Added imports
import './ClanMemberView.css';

// Helper to format date
const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
};

const ClanMemberView = ({ clan, user }) => {
    const [notices, setNotices] = useState([]);
    const [rooms, setRooms] = useState([]);
    const [events, setEvents] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch sub-data in parallel
                const [noticesRes, roomsRes, eventsRes, postsRes] = await Promise.all([
                    apiGet(`/clans/${clan.id}/announcements/`).catch(() => ({ results: [] })),
                    apiGet(`/clans/${clan.id}/rooms/?sort=latest`).catch(() => ({ results: [] })),
                    apiGet(`/clans/${clan.id}/events/`).catch(() => ({ results: [] })),
                    apiGet(`/clans/${clan.id}/boards/`).catch(() => ({ results: [] })),
                ]);

                // Handle pagination or direct array
                setNotices(noticesRes.results || noticesRes);
                setRooms(roomsRes.results || roomsRes);
                setEvents(eventsRes.results || eventsRes);
                setPosts(postsRes.results || postsRes);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [clan.id]);

    // --- Calendar Logic ---
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday start
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfCurrentWeek, i));

    // Get today's events
    const todaysEvents = events.filter(event => isSameDay(parseISO(event.date), today));
    const todayScheduleText = todaysEvents.length > 0
        ? `${todaysEvents.length}개의 일정`
        : "오늘 일정 없음";

    // Day styling helper
    const getDayStyle = (day) => {
        const isSun = day.getDay() === 0;
        const isSat = day.getDay() === 6;
        if (isSun) return 'text-red-500';
        if (isSat) return 'text-blue-500';
        return 'text-cyan-950';
    };

    return (
        <div className="clan-member-dashboard">
            {/* 1. Header Section */}
            <div className="cmd-header">
                <div className="cmd-profile-left">
                    <img
                        src={clan.image || 'https://placehold.co/77x77'}
                        alt={clan.name}
                        className="cmd-profile-img"
                    />
                    <div className="cmd-profile-info">
                        <h1 className="cmd-clan-name">{clan.name}</h1>
                        <p className="cmd-clan-desc">{clan.description || "동국대학교 중앙 락밴드 동아리"}</p>
                        <p className="cmd-member-count">멤버 : {clan.member_count}명</p>
                    </div>
                </div>
                <div className="cmd-profile-right">
                    <Link to={`/chats/clan/${clan.id}`} className="cmd-btn-small">
                        {/* Chat Icon (MessageSquare) */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        단체 채팅
                        {/* Logic: Only show badge if unreadCount > 0. Currently 0 (no chat). */}
                        {0 > 0 && <div className="cmd-badge">1</div>}
                    </Link>
                    <Link to={`/clans/${clan.id}/members`} className="cmd-btn-small">
                        {/* Members Icon (Users) */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        멤버 현황
                        {/* [New] Join Request Badge */}
                        {(() => {
                            // Determine user role
                            const isOwner = user && clan.owner?.id === user.id;
                            const isAdmin = user && clan.admins?.some(admin => admin.id === user.id);

                            // Only Owner/Admin can see pending requests
                            if (isOwner || isAdmin) {
                                const pendingCount = (clan.join_requests || []).filter(r => r.status === 'pending').length;
                                if (pendingCount > 0) {
                                    return <div className="cmd-badge">{pendingCount > 99 ? '99+' : pendingCount}</div>;
                                }
                            }
                            return null;
                        })()}
                    </Link>
                </div>
            </div>

            {/* 2. Notice Section (Blue Header + White Body) */}
            <div className="cmd-notice-card">
                <div className="cmd-notice-header">
                    <div className="flex-align-center gap-5">
                        <span className="bell-icon">🔔</span>
                        <h3 className="notice-header-title">공지</h3>
                    </div>
                    <Link to={`/clans/${clan.id}/announcements`} className="notice-more-link">더보기</Link>
                </div>
                <div className="cmd-notice-body">
                    <ul className="cmd-notice-list">
                        {notices.slice(0, 3).map((notice) => (
                            <li key={notice.id} className="cmd-notice-item">
                                <span className="cmd-notice-bullet">•</span>
                                <span className="cmd-notice-text">{notice.title}</span>
                                <span className="cmd-notice-date">{formatDate(notice.created_at)}</span>
                            </li>
                        ))}
                        {notices.length === 0 && <li className="empty-msg">등록된 공지가 없습니다.</li>}
                    </ul>
                </div>
            </div>

            {/* 3. Rooms Section */}
            <div className="cmd-section">
                <div className="cmd-section-header-row">
                    <h3 className="section-title">클랜 합주방</h3>
                    <Link to={`/clans/${clan.id}/rooms`} className="more-link">더보기</Link>
                </div>
                <div className="cmd-room-scroll">
                    {rooms.length > 0 ? rooms.slice(0, 5).map((room) => (
                        <div key={room.id} className="cmd-room-card">
                            {/* Song Title and Artist */}
                            <h4 className="room-title">{room.song || room.title}</h4>
                            <p className="room-sub">{room.artist || "아티스트 미정"}</p>
                            <div className="room-tags">
                                {room.sessions && room.sessions.map(s => (
                                    <span key={s.id} className={`inst-badge ${s.participant_nickname ? 'filled' : 'empty'}`}>
                                        {s.session_name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="empty-box">현재 열린 합주방이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* 4. Calendar Section (Real Logic) */}
            <div className="cmd-section">
                <div className="cmd-section-header-row">
                    <h3 className="section-title">클랜 캘린더</h3>
                    <Link to={`/clans/${clan.id}/events`} className="more-link">캘린더 보기</Link>
                </div>
                <div className="cmd-calendar-preview">
                    <div className="current-date-row">
                        {/* 12/27 (S) format */}
                        <span className="date-highlight" style={{ marginRight: '8px' }}>
                            {format(today, 'MM/dd')} ({format(today, 'eee').charAt(0)})
                        </span>
                        <span className="today-sched">{todayScheduleText}</span>
                    </div>
                    <div className="week-grid">
                        {weekDays.map((day, i) => {
                            const dayHasEvent = events.some(e => isSameDay(parseISO(e.date), day));
                            const isTodayDay = isToday(day);

                            return (
                                <div key={i} className={`week-day ${isTodayDay ? 'today' : ''}`}>
                                    <div className={`day-char ${isTodayDay ? 'text-sky-500 font-bold' : getDayStyle(day)}`}>
                                        {format(day, 'eeeee')} {/* S, M, T... */}
                                    </div>
                                    {dayHasEvent && <div className="event-dot"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* 5. Board Section */}
            <div className="cmd-section">
                <div className="cmd-section-header-row">
                    <h3 className="section-title">클랜 게시판</h3>
                    <Link to={`/clans/${clan.id}/boards`} className="more-link">더보기</Link>
                </div>
                <div className="cmd-board-list">
                    {posts.slice(0, 1).map((post) => (
                        <div key={post.id} className="cmd-board-item">
                            <h4 className="board-title">&lt;{post.title}&gt;</h4>
                            <p className="board-content-preview">{post.content.substring(0, 30)}...</p>
                            <div className="board-meta">
                                <div className="board-meta-item">
                                    <svg width="12" height="12" viewBox="0 0 8 10" fill="none" stroke="#666">
                                        <path d="M4 5C5.10457 5 6 4.10457 6 3C6 1.89543 5.10457 1 4 1C2.89543 1 2 1.89543 2 3C2 4.10457 2.89543 5 4 5Z" strokeWidth="1" />
                                        <path d="M1 9C1 7.34315 2.34315 6 4 6C5.65685 6 7 7.34315 7 9" strokeWidth="1" strokeLinecap="round" />
                                    </svg>
                                    <span className="board-author-name">{post.author_nickname || "익명"}</span>
                                </div>
                                <div className="board-meta-item">
                                    <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="#666">
                                        <path d="M2.5 9V4.5M2.5 4.5H1.5C1.22386 4.5 1 4.72386 1 5V8.5C1 8.77614 1.22386 9 1.5 9H2.5ZM2.5 4.5H5.5C6.05228 4.5 6.5 4.05228 6.5 3.5V2C6.5 1.44772 6.05228 1 5.5 1H4C4 2 3 3 2.5 4.5Z" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M2.5 9H8C8.27614 9 8.5 8.77614 8.5 8.5V5.5C8.5 5.22386 8.27614 5 8 5H6.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    <span className="board-like-count">({post.likes || 0})</span>
                                </div>
                                <span className="board-date right">{formatDate(post.created_at)}</span>
                            </div>
                        </div>
                    ))}
                    {posts.length === 0 && <div className="empty-box">게시글이 없습니다.</div>}
                </div>
            </div>
        </div>
    );
};

export default ClanMemberView;
