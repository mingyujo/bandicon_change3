import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, apiPost, apiDelete, API_BASE_SERVER } from '../../api/api';
import { format, startOfWeek, endOfWeek, addDays, getDaysInMonth, startOfMonth, endOfMonth, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import ConfirmationModal from '../../components/ConfirmationModal';
import './ClanCalendarPage.css';

const ClanCalendarPage = ({ user }) => {
    const { clanId } = useParams();
    const navigate = useNavigate();
    const [clan, setClan] = useState(null);
    const [events, setEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [newEventTitle, setNewEventTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    // Fetch Clan Info & Events
    const fetchData = async () => {
        try {
            const [clanRes, eventsRes] = await Promise.all([
                apiGet(`/clans/${clanId}/`),
                apiGet(`/clans/${clanId}/events/`)
            ]);
            setClan(clanRes);
            setEvents(eventsRes.results || eventsRes || []);
        } catch (err) {
            console.error("Failed to load calendar data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [clanId]);

    // Handlers
    const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    const handleDateClick = (day) => {
        setSelectedDate(day);
    };

    const handleCreateEvent = async () => {
        if (!newEventTitle.trim()) return alert("일정 내용을 입력해주세요.");
        try {
            const formattedDate = format(selectedDate, 'yyyy-MM-dd');
            await apiPost(`/clans/${clanId}/events/`, {
                title: newEventTitle,
                description: "", // Simple event for now
                date: formattedDate
            });
            setNewEventTitle("");
            fetchData(); // Refresh events
        } catch (err) {
            alert("일정 추가 실패: " + (err.response?.data?.detail || err.message));
        }
    };

    const handleDeleteEvent = (eventId) => {
        setEventToDelete(eventId);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        try {
            await apiDelete(`/clans/events/${eventToDelete}/`);
            fetchData();
            setIsDeleteModalOpen(false);
            setEventToDelete(null);
        } catch (err) {
            alert("삭제 실패");
        }
    };

    // Calendar Generation
    const renderCalendarGrid = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd); // Last day of the visual grid

        const dateFormat = "d";
        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        // Iterate weeks until we pass the end date
        // Note: endDate calculation might need adjustment to ensure we cover the visual grid properly
        // Let's just Loop 6 weeks to ensure constant height like most calendars
        const totalDays = 42; // 6 weeks * 7 days

        for (let i = 0; i < totalDays; i++) {
            formattedDate = format(day, dateFormat);
            const cloneDay = day;
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayEvents = events.filter(e => isSameDay(new Date(e.date), day));
            const hasEvent = dayEvents.length > 0;
            const isTodayDate = isSameDay(day, new Date());

            // Determine styles based on state
            let containerClass = "day-container";
            let textClass = "day-text";

            if (!isCurrentMonth) {
                textClass += " text-slate-300"; // Faint text for other months
            } else {
                textClass += " text-slate-500";
            }

            if (isSelected) {
                containerClass += " selected-day-bg"; // Blue Circle
                textClass = "day-text-selected"; // White or Blue Text? Design shows White text in Blue circle usually
            } else if (hasEvent && isCurrentMonth) {
                // If event exists but not selected? Design shows red dot.
            }

            if (isTodayDate && !isSelected) {
                textClass += " text-sky-500 font-bold";
            }

            days.push(
                <div
                    className={`calendar-day-cell ${!isCurrentMonth ? 'other-month' : ''}`}
                    key={day}
                    onClick={() => handleDateClick(cloneDay)}
                >
                    <div className={`day-circle ${isSelected ? 'selected' : ''}`}>
                        {isCurrentMonth ? (
                            <>
                                <span className={textClass}>{formattedDate}</span>
                                {/* Red Dot Logic */}
                                {(hasEvent && !isSelected) && <div className="event-dot-red"></div>}
                                {/* Selected day event dot? Design shows date inside blue circle, maybe dot overrides or is hidden? */}
                                {(hasEvent && isSelected) && <div className="event-dot-white"></div>}
                            </>
                        ) : null}
                    </div>
                </div>
            );

            day = addDays(day, 1);

            // Push row every 7 days
            if (days.length === 7) {
                rows.push(
                    <div className="calendar-week-row" key={day}>
                        {days}
                    </div>
                );
                days = [];
            }
        }
        return rows;
    };

    // Filter events for list
    const selectedEvents = events.filter(e => isSameDay(new Date(e.date), selectedDate));

    // Permission Check
    const isOwnerOrAdmin = clan && user && (clan.owner?.id === user.id || clan.admins?.some(a => a.id === user.id));

    return (
        <MobileLayout>
            <GlobalHeader user={user} />

            <div className="clan-calendar-page-container">
                {/* Header */}
                <div className="cc-header">
                    <div onClick={() => navigate(-1)} className="cc-back-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    </div>
                    <div className="cc-title">클랜 캘린더</div>

                </div>

                {/* Main Calendar Card */}
                <div className="calendar-card-ui">
                    {/* Month Selector */}
                    <div className="cc-month-selector">
                        <div className="month-label">{format(currentDate, 'yyyy년 M월')}</div>
                        <div className="month-nav">
                            <button onClick={handlePrevMonth} className="nav-arrow">‹</button>
                            <button onClick={handleNextMonth} className="nav-arrow">›</button>
                        </div>
                    </div>

                    <div className="cc-days-header">
                        <div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>
                    </div>

                    {/* Grid */}
                    <div className="cc-grid">
                        {renderCalendarGrid()}
                    </div>
                </div>

                {/* Event List */}
                <div className="event-list-section">
                    {selectedEvents.length > 0 ? (
                        selectedEvents.map(event => (
                            <div key={event.id} className="event-item">
                                <div className="event-bullet">•</div>
                                <div className="event-content">{event.title}</div>
                                {isOwnerOrAdmin && (
                                    <div className="event-delete-btn" onClick={() => handleDeleteEvent(event.id)}>
                                        {/* Red Minus Icon */}
                                        <div className="red-minus-icon">−</div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="no-events">일정이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* Bottom Input (Footer) - Stick to bottom above Nav */}
            {isOwnerOrAdmin && (
                <div className="footer-input-container">
                    <input
                        type="text"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                        placeholder="추가할 일정을 입력하세요."
                        className="footer-input"
                    />
                    <button className="footer-add-btn" onClick={handleCreateEvent}>추가</button>
                </div>
            )}

            <BottomNav />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="일정 삭제"
                message="이 일정을 정말 삭제하시겠습니까?"
                confirmText="삭제"
                isDanger={true}
            />
        </MobileLayout>
    );
};

export default ClanCalendarPage;
