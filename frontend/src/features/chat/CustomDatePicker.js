import React, { useState, useEffect, useRef } from 'react';
import './CustomDatePicker.css';

const CustomDatePicker = ({ initialDate, onClose, onConfirm }) => {
    // Parse initial date or default to now
    const parseInitial = () => {
        if (!initialDate) return new Date();
        return new Date(initialDate);
    };

    const [selectedDate, setSelectedDate] = useState(parseInitial());
    const [viewDate, setViewDate] = useState(parseInitial()); // For navigation (month/year)

    // Time states
    const [hour, setHour] = useState(parseInitial().getHours());
    const [minute, setMinute] = useState(parseInitial().getMinutes());

    // Refs for scrolling
    const hourListRef = useRef(null);
    const minuteListRef = useRef(null);

    useEffect(() => {
        // Update selected date time when hour/minute changes
        const newDate = new Date(selectedDate);
        newDate.setHours(hour);
        newDate.setMinutes(minute);
        setSelectedDate(newDate);
    }, [hour, minute]); // Only depend on hour/minute changes to update selectedDate

    useEffect(() => {
        // Initial scroll to selected time
        if (hourListRef.current) {
            const selectedEl = hourListRef.current.querySelector(`.cdp-time-cell[data-value="${hour}"]`);
            if (selectedEl) selectedEl.scrollIntoView({ block: 'center' });
        }
        if (minuteListRef.current) {
            const selectedEl = minuteListRef.current.querySelector(`.cdp-time-cell[data-value="${minute}"]`);
            if (selectedEl) selectedEl.scrollIntoView({ block: 'center' });
        }
    }, []); // Run once on mount

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDayClick = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        newDate.setHours(hour);
        newDate.setMinutes(minute);
        setSelectedDate(newDate);
    };

    const handleConfirm = () => {
        // Return ISO string
        const offsetDate = new Date(selectedDate.getTime() - (selectedDate.getTimezoneOffset() * 60000));
        const isoString = offsetDate.toISOString().slice(0, 16);
        onConfirm(isoString);
    };

    const generateDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);

        const days = [];
        // Empty slots
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="cdp-day empty"></div>);
        }
        // Days
        for (let d = 1; d <= totalDays; d++) {
            const isSelected =
                selectedDate.getDate() === d &&
                selectedDate.getMonth() === month &&
                selectedDate.getFullYear() === year;

            days.push(
                <div
                    key={d}
                    className={`cdp-day ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleDayClick(d)}
                >
                    {d}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="cdp-overlay" onClick={onClose}>
            <div className="cdp-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="cdp-header">
                    <span className="cdp-title">날짜 및 시간 선택</span>
                    <button className="cdp-close-btn" onClick={onClose}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                {/* Calendar Header */}
                <div className="cdp-calendar-header">
                    <button className="cdp-nav-btn" onClick={handlePrevMonth}>&lt;</button>
                    <span>{viewDate.getFullYear()}년 {viewDate.getMonth() + 1}월</span>
                    <button className="cdp-nav-btn" onClick={handleNextMonth}>&gt;</button>
                </div>

                {/* Days Grid */}
                <div className="cdp-weekdays">
                    <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
                </div>
                <div className="cdp-days-grid">
                    {generateDays()}
                </div>

                {/* Time Selection - Scrollable Columns */}
                <div className="cdp-time-section">
                    <div className="cdp-time-column" ref={hourListRef}>
                        {Array.from({ length: 24 }, (_, i) => (
                            <div
                                key={i}
                                className={`cdp-time-cell ${hour === i ? 'selected' : ''}`}
                                data-value={i}
                                onClick={() => setHour(i)}
                            >
                                {i.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                    <div className="cdp-time-separator">:</div>
                    <div className="cdp-time-column" ref={minuteListRef}>
                        {Array.from({ length: 60 }, (_, i) => (
                            <div
                                key={i}
                                className={`cdp-time-cell ${minute === i ? 'selected' : ''}`}
                                data-value={i}
                                onClick={() => setMinute(i)}
                            >
                                {i.toString().padStart(2, '0')}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Confirm */}
                <button className="cdp-confirm-btn" onClick={handleConfirm}>
                    확인
                </button>
            </div>
        </div>
    );
};

export default CustomDatePicker;
