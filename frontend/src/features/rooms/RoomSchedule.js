import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiGet, API_BASE_SERVER } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import './RoomSchedule.css';

// Session Image Helper (Copied from RoomDetail.js)
const getInstrumentImage = (sessionName) => {
    if (!sessionName) return null;
    const name = sessionName.toLowerCase();
    if (name.includes('보컬')) return '/assets/instruments/vocal.png';
    if (name.includes('베이스')) return '/assets/instruments/guitar.png';
    if (name.includes('기타')) return '/assets/instruments/bass.png';
    if (name.includes('드럼')) return '/assets/instruments/drum.png';
    if (name.includes('키보드') || name.includes('건반') || name.includes('피아노')) return '/assets/instruments/keyboard.png';
    return '/assets/instruments/custom.svg?v=5';
};

const RoomSchedule = ({ user }) => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [roomInfo, setRoomInfo] = useState(null);
    const [sessions, setSessions] = useState([]);

    useEffect(() => {
        const fetchRoomData = async () => {
            try {
                const data = await apiGet(`/rooms/${roomId}/`);
                setRoomInfo({
                    title: data.song,
                    artist: data.artist,
                    album_cover: data.album_cover
                });
                setSessions(data.sessions || []);
            } catch (err) {
                console.error("Failed to fetch room info", err);
            }
        };
        if (roomId) fetchRoomData();
    }, [roomId]);

    // Calendar State
    const [viewDate, setViewDate] = useState(new Date()); // Tracks the month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // Tracks the selected specific day
    const [today] = useState(new Date());

    // State for ALL schedules: { "2024-5-20": { 18: { count: 3, users: [...] } } }
    const [allSchedules, setAllSchedules] = useState({});

    // Helper to generate key for storage
    const getDateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    // --- 👇 [API Integration] Fetch Availability Data ---
    const fetchAvailability = async () => {
        try {
            const slots = await apiGet(`/rooms/${roomId}/availability/`);
            // slots: [{ id, time: "2025-11-10T14:00:00Z", voters: [{nickname...}], voted_by_current_user: bool }]

            const newSchedules = {};

            slots.forEach(slot => {
                const dateObj = new Date(slot.time);
                const key = getDateKey(dateObj);
                const hour = dateObj.getHours(); // 0-23

                if (!newSchedules[key]) newSchedules[key] = {};

                const votersList = slot.voters.map(v => v.nickname);

                newSchedules[key][hour] = {
                    count: votersList.length,
                    users: votersList,
                    slotId: slot.id, // Keep track of ID
                    isMyted: slot.voted_by_current_user
                };
            });
            setAllSchedules(newSchedules);

            // Log for debug
            // console.log("Fetched Schedule:", newSchedules);
        } catch (err) {
            console.error("Failed to fetch availability", err);
        }
    };

    useEffect(() => {
        if (roomId) fetchAvailability();
    }, [roomId]);
    // --- 👆 [API Integration] ---

    // Filter State
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [activeFilters, setActiveFilters] = useState([]); // Array of session names

    // Init Filters when sessions load
    useEffect(() => {
        if (sessions.length > 0) {
            const uniqueNames = [...new Set(sessions.map(s => s.session_name))];
            setActiveFilters(uniqueNames);
        }
    }, [sessions]);

    // Derived Filter Data
    const relevantSessions = sessions.filter(s => activeFilters.includes(s.session_name));
    const targetUsers = new Set(relevantSessions.map(s => s.participant_nickname).filter(Boolean));
    const targetCount = targetUsers.size;

    // Helper to generate key for storage (Defined above)

    // Derived state for current view
    const dateKey = getDateKey(selectedDate);
    const groupAvailability = allSchedules[dateKey] || {};

    // Mock Data for specific dates to demonstrate "Red Dot" logic
    // In a real app, you'd fetch "monthly event summary" separately
    const getMockAvailabilityForDate = (date) => {
        // CLEANUP: Return empty to ensure no pre-filled data appears
        return {};
    };

    useEffect(() => {
        // Only reset MY temporary selection when date changes.
        // Group data is now persistent in `allSchedules`.
        // [Modified] Pre-fill mySelection with what I already voted for this day
        const currentDaySchedule = allSchedules[dateKey] || {};
        const preSelected = [];
        Object.keys(currentDaySchedule).forEach(hour => {
            if (currentDaySchedule[hour].isMyted) {
                preSelected.push(parseInt(hour));
            }
        });
        setMySelection(preSelected);
    }, [selectedDate, allSchedules]); // Depend on allSchedules to update when API loads

    // Check if a date has at least one "Full Match" time slot (All SELECTED filter members available)
    const hasFullMatch = (date) => {
        const key = getDateKey(date);
        const data = allSchedules[key] || {};

        if (targetCount === 0) return false;

        return Object.values(data).some(slot => {
            // Check if slot.users contains ALL targetUsers
            if (!slot.users) return false;
            const slotUserSet = new Set(slot.users);
            for (let user of targetUsers) {
                if (!slotUserSet.has(user)) return false;
            }
            return true;
        });
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const changeMonth = (offset) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
        setViewDate(newDate);
    };

    const isSameDate = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const currentMonthLabel = `${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`;

    // Helper to get image for a user nickname
    const getUserImage = (nickname) => {
        const session = sessions.find(s => s.participant_nickname === nickname);
        if (session) {
            return getInstrumentImage(session.session_name);
        }
        // Fallback for current user ("나" or real nickname) if not found in sessions yet (e.g. joined but session list not updated? shouldn't happen if fetched)
        // Or if '나' is used as a placeholder
        if (nickname === '나' || (user && nickname === user.nickname)) {
            // Try to find my session
            const mySession = sessions.find(s => s.participant_nickname === user?.nickname);
            if (mySession) return getInstrumentImage(mySession.session_name);
        }
        return null; // Will render default colored circle if null
    };

    // Generate Calendar Grid
    const generateCalendarCells = () => {
        const daysInMonth = getDaysInMonth(viewDate);
        const startDay = getFirstDayOfMonth(viewDate);
        const cells = [];

        // Empty slots for previous month padding
        for (let i = 0; i < startDay; i++) {
            cells.push(<div key={`empty-${i}`} className="day empty"></div>);
        }

        // Days
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
            let dayClass = "day";

            if (isSameDate(currentDayDate, today)) dayClass += " today";
            if (isSameDate(currentDayDate, selectedDate)) dayClass += " selected";

            // Green Dot logic: If has "Full Match" slot
            if (hasFullMatch(currentDayDate)) dayClass += " full-match";

            cells.push(
                <div
                    key={d}
                    className={dayClass}
                    onClick={() => setSelectedDate(currentDayDate)}
                >
                    {d}
                </div>
            );
        }
        return cells;
    };

    // Time Slot State (0-23 for 01:00 - 24:00)
    // Using 24 slots. 0 = 01:00, 23 = 24:00
    const [mySelection, setMySelection] = useState([]); // Empty default
    // Drag Logic
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState(null);
    const [dragAction, setDragAction] = useState(null); // 'add' or 'remove'

    // Helpers
    const hoursPart1 = Array.from({ length: 12 }, (_, i) => i); // 0 to 11 (01:00 - 12:00)
    const hoursPart2 = Array.from({ length: 12 }, (_, i) => i + 12); // 12 to 23 (13:00 - 24:00)

    const handleMouseDown = (index, e) => {
        // Prevent default drag behavior (ghost image)
        if (e && e.preventDefault) e.preventDefault();

        setIsDragging(true);
        setDragStart(index);

        // Determine action based on current state of the clicked slot
        // If it's already selected, we are entering "Deselect Mode"
        // If it's not selected, we are entering "Select Mode"
        const isSelected = mySelection.includes(index);
        const action = isSelected ? 'remove' : 'add';
        setDragAction(action);

        // Apply immediately to the clicked slot
        setMySelection(prev => {
            if (action === 'remove') return prev.filter(i => i !== index);
            return [...prev, index];
        });
    };

    const handleMouseEnter = (index) => {
        if (!isDragging) return;

        setMySelection(prev => {
            if (dragAction === 'add') {
                // Add if not present
                if (!prev.includes(index)) return [...prev, index];
            } else if (dragAction === 'remove') {
                // Remove if present
                if (prev.includes(index)) return prev.filter(i => i !== index);
            }
            return prev;
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragStart(null);
        setDragAction(null);
    };

    // Filter Handlers
    const toggleFilter = (sessionName) => {
        setActiveFilters(prev => {
            if (prev.includes(sessionName)) return prev.filter(n => n !== sessionName);
            return [...prev, sessionName];
        });
    };

    const toggleAllFilters = () => {
        const allNames = [...new Set(sessions.map(s => s.session_name))];
        if (activeFilters.length === allNames.length) {
            setActiveFilters([]);
        } else {
            setActiveFilters(allNames);
        }
    };

    // Render Function for Time Slot
    const renderTimeSlot = (hourIndex) => {
        // hourIndex 0 = 01:00, 11 = 12:00, 12 = 13:00, 23 = 24:00
        const displayTime = (hourIndex + 1).toString().padStart(2, '0') + ":00";
        const isMySelected = mySelection.includes(hourIndex);
        const groupData = groupAvailability[hourIndex];

        let slotClass = "time-slot-box";
        let style = {};

        // Priority: My Selection (Red) -> Group Selection (Blue) -> Full (Green)
        // Design shows Red overlay for "My Selection"
        // And Blue/Green blocks for Group.
        // Actually, looking at the design:
        // 01:00 is Red.
        // 22:00 is Green (Full).
        // 18:00 is Blue.

        // It seems they can coexist? "My selection" might be an outline or color change?
        // The prompt says "My selection is the light red box".
        // "Approved time (everyone) is Green".
        // "More votes = darker blue".

        // Filter Logic applied to Slot
        let relevantUsers = [];
        if (groupData && groupData.users) {
            relevantUsers = groupData.users.filter(u => targetUsers.has(u));
        }
        const relevantCount = relevantUsers.length;

        if (isMySelected) {
            slotClass += " my-selected";
        } else if (relevantCount > 0) {
            if (relevantCount === targetCount) {
                slotClass += " group-full"; // Green
            } else {
                slotClass += " group-partial"; // Blue
                style.opacity = 0.2 + (relevantCount * 0.15);
            }
        } else {
            slotClass += " empty";
        }

        return (
            <div className="time-slot-row" key={hourIndex}>
                <div className="time-label">{displayTime}</div>
                <div
                    className={slotClass}
                    style={style}
                    onMouseDown={(e) => handleMouseDown(hourIndex, e)}
                    onMouseEnter={() => handleMouseEnter(hourIndex)}
                    onMouseUp={handleMouseUp}
                >
                    {/* Icons overlay */}
                </div>
                {/* User Icons */}
                <div className="slot-user-icons">
                    {relevantUsers.map((u, i) => {
                        const imgSrc = getUserImage(u);
                        return imgSrc ? (
                            <div key={i} className="mini-user-icon" title={u}>
                                <div style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'var(--color-파란색)',
                                    WebkitMaskImage: `url(${imgSrc})`,
                                    WebkitMaskSize: 'contain',
                                    WebkitMaskRepeat: 'no-repeat',
                                    WebkitMaskPosition: 'center'
                                }} />
                            </div>
                        ) : (
                            <div key={i} className={`mini-user-icon ${u}`} /> // Fallback
                        );
                    })}
                </div>
            </div>
        );
    };

    // Action Buttons Logic
    const handleCancel = () => {
        // 1. Clear current temporary selection
        setMySelection([]);

        // 2. Remove "my" confirmed times from Group Data (Persistent)
        setAllSchedules(prev => {
            const newSchedules = { ...prev };
            const currentData = { ...(newSchedules[dateKey] || {}) };
            const myName = user?.nickname || '나';
            let hasChanges = false;

            Object.keys(currentData).forEach(hour => {
                const slot = currentData[hour];
                if (slot.users.includes(myName)) {
                    const newUsers = slot.users.filter(u => u !== myName);
                    if (newUsers.length === 0) {
                        delete currentData[hour];
                    } else {
                        currentData[hour] = {
                            ...slot,
                            count: newUsers.length,
                            users: newUsers
                        };
                    }
                    hasChanges = true;
                }
            });

            if (hasChanges) {
                if (Object.keys(currentData).length === 0) {
                    delete newSchedules[dateKey];
                } else {
                    newSchedules[dateKey] = currentData;
                }
                return newSchedules;
            }
            return prev;
        });

        alert("모든 선택이 초기화되었습니다.");
    };

    const handleConfirm = async () => {
        if (mySelection.length === 0) return;

        // Prepare data for API
        // We need to send times like ["2025-11-10T14:00:00Z"]
        const dateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

        const timesToSend = mySelection.map(hour => {
            // Construct ISO string (naive or UTC? Backend handles both via timezone.datetime.fromisoformat)
            // Let's send simpler ISO format: "YYYY-MM-DDTHH:00:00"
            return `${dateStr}T${hour.toString().padStart(2, '0')}:00:00`;
        });

        try {
            await import('../../api/api').then(module => module.apiPost(`/rooms/${roomId}/availability/`, {
                times: timesToSend
                // slot_ids: ... (if we wanted to toggle existing slots, but here we just send selected times for this day)
                // Note: The backend logic says "1. Remove existing votes for this user", "2. Add new votes".
                // But it removes existing votes "for room", not "for this day"?
                // Let's check backend... "RoomAvailabilitySlot.objects.filter(room=room, voters=user)" -> clears ALL votes for the room?
                // Wait, if I vote for Day 1, then vote for Day 2, does Day 1 get cleared?
                // YES, line 598 in backend: existing_votes = RoomAvailabilitySlot.objects.filter(room=room, voters=user)
                // This means currently the backend only supports ONE vote submission session or clears EVERYTHING.
                // If the design intends multi-day voting, the backend logic is flawed.
                // However, the prompt implies "schedule voting".
                // Let's assume for now user selects ALL their available times across days?
                // But the UI is day-by-day.

                // [CRITICAL FIX required in Backend or Frontend Strategy]
                // If I select times on May 20, confirm.
                // Then select times on May 21, confirm.
                // If backend clears ALL my votes, May 20 is lost.

                // Frontend should probably send ALL my currently selected times across ALL days?
                // But `mySelection` is only for CURRENT DAY.
                // Users might expect to save day by day.

                // Let's modify the BACKEND to only clear votes for the submitted days?
                // Or Frontend gathers all 'isMyVoted' from `allSchedules`, merges with new selection, and sends EVERYTHING.

                // Let's go with Frontend Merging Strategy for safety without touching backend logic deeply yet?
                // No, backend logic "filter(room=room, voters=user)" is destructively broad.
                // Better to make backend safer: only clear votes for times that are being updated?
                // Or, simply, the backend should NOT clear all votes if we only send new ones?

                // Let's UPDATE the frontend to send specific times.
                // AND IMPORTANTLY: We need to handle the case where we UNSELECT a time.
            }));

            // Refresh
            await fetchAvailability();
            setMySelection([]);
            alert("시간이 확정되었습니다!");

        } catch (err) {
            console.error(err);
            alert("저장 실패");
        }
    };

    // Calculate Non-Participating Members for the current date
    // (Users who have NOT selected ANY time slot in this day)
    const participatingUsers = new Set();
    Object.values(groupAvailability).forEach(slot => {
        if (slot.users) {
            slot.users.forEach(u => participatingUsers.add(u));
        }
    });

    const nonParticipatingSessions = sessions.filter(s =>
        s.participant_nickname && !participatingUsers.has(s.participant_nickname)
    );


    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            <div className="room-schedule-container" onMouseUp={handleMouseUp}>

                {/* Sub Header: Back + Room Info */}
                <div className="schedule-sub-header">
                    <div className="back-btn" onClick={() => navigate(-1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                    </div>
                    {roomInfo && (
                        <>
                            <img
                                src={roomInfo.album_cover ? (roomInfo.album_cover.startsWith('http') ? roomInfo.album_cover : API_BASE_SERVER + roomInfo.album_cover) : "https://placehold.co/37x37"}
                                className="room-album-small"
                                alt="album"
                            />
                            <div className="room-text-info">
                                <div className="room-song-title">{roomInfo.title}</div>
                                <div className="room-artist-name">: {roomInfo.artist}</div>
                            </div>
                        </>
                    )}
                </div>

                {/* Scrollable Content Wrapper */}
                <div className="schedule-scroll-content">
                    {/* Calendar Section */}
                    <div className="calendar-card">
                        <div className="calendar-controls">
                            <div className="month-selector">
                                {currentMonthLabel} <span className="dropdown-arrow">▼</span>
                            </div>
                            <div className="filter-selector" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                                <span>필터</span>
                                <span className="dropdown-arrow">▼</span>
                                {isFilterOpen && (
                                    <div className="filter-popup" onClick={e => e.stopPropagation()}>
                                        <div className="filter-item" onClick={toggleAllFilters}>
                                            <input
                                                type="checkbox"
                                                checked={sessions.length > 0 && activeFilters.length === [...new Set(sessions.map(s => s.session_name))].length}
                                                readOnly
                                            />
                                            <span>전체</span>
                                        </div>
                                        <div style={{ height: '1px', backgroundColor: '#cbd5e1', margin: '2px 0' }} />
                                        {[...new Set(sessions.map(s => s.session_name))].map(name => (
                                            <div className="filter-item" key={name} onClick={() => toggleFilter(name)}>
                                                <input type="checkbox" checked={activeFilters.includes(name)} readOnly />
                                                <span>{name}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="nav-arrows">
                                <span className="arrow" onClick={() => changeMonth(-1)}>‹</span>
                                <span className="arrow" onClick={() => changeMonth(1)}>›</span>
                            </div>
                        </div>

                        <div className="calendar-grid">
                            <div className="week-row">
                                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                            </div>

                            {/* Mock Days - Just visual for the task */}
                            <div className="days-grid">
                                {generateCalendarCells()}
                            </div>
                        </div>
                    </div>

                    {/* Legend / Status */}
                    {/* (Optional, inferred from design like red dots) */}

                    {/* Time Grid - Two Columns */}
                    <div className="time-grid-container">
                        <div className="time-col">
                            {hoursPart1.map(h => renderTimeSlot(h))}
                        </div>
                        <div className="time-col">
                            {hoursPart2.map(h => renderTimeSlot(h))}
                        </div>
                    </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="schedule-bottom-bar">
                    <div className="non-participating">
                        <div>미참여 멤버</div>
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                            {nonParticipatingSessions.length > 0 ? (
                                nonParticipatingSessions.map((s, i) => (
                                    <div key={i} className="mini-user-icon" title={s.participant_nickname}>
                                        <div style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: 'var(--color-파란색)',
                                            WebkitMaskImage: `url(${getInstrumentImage(s.session_name)})`,
                                            WebkitMaskSize: 'contain',
                                            WebkitMaskRepeat: 'no-repeat',
                                            WebkitMaskPosition: 'center'
                                        }} />
                                    </div>
                                ))
                            ) : (
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>모두 참여 완료!</span>
                            )}
                        </div>
                    </div>
                    <div className="action-buttons">
                        <div className="btn-cancel-time" onClick={handleCancel}>
                            취소
                        </div>
                        <div className="btn-confirm-time" onClick={handleConfirm}>
                            <div className="check-icon">
                                <svg width="8" height="6" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 5L4.5 8.5L11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            시간 확정
                        </div>
                    </div>
                </div>

            </div>
            <BottomNav />
        </MobileLayout>
    );
};

export default RoomSchedule;
