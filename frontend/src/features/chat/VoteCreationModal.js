import React, { useState } from 'react';
import './VoteCreationModal.css';
import CustomDatePicker from './CustomDatePicker';

const VoteCreationModal = ({ onClose, onSubmit }) => {
    const [title, setTitle] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [deadline, setDeadline] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16));
    const [showDatePicker, setShowDatePicker] = useState(false);

    /* ... handlers ... */
    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        if (options.length <= 2) return;
        const newOptions = options.filter((_, i) => i !== index);
        setOptions(newOptions);
    };

    const handleSubmit = () => {
        if (!title.trim()) {
            alert("투표 제목을 입력해주세요.");
            return;
        }
        const validOptions = options.filter(opt => opt.trim());
        if (validOptions.length < 2) {
            alert("최소 2개의 항목을 입력해주세요.");
            return;
        }

        onSubmit({
            title,
            options: validOptions,
            allowMultiple,
            isAnonymous,
            deadline
        });
    };

    const formatDisplayDate = (isoString) => {
        const d = new Date(isoString);
        return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, 0)}.${d.getDate().toString().padStart(2, 0)} ${d.getHours().toString().padStart(2, 0)}:${d.getMinutes().toString().padStart(2, 0)}`;
    };

    const handleDateClick = () => {
        setShowDatePicker(true);
    };

    const handleDateConfirm = (newDateStr) => {
        setDeadline(newDateStr);
        setShowDatePicker(false);
    };

    return (
        <div className="vote-modal-overlay" onClick={onClose}>
            <div className="vote-modal-container" onClick={e => e.stopPropagation()}>
                {/* Back / Close */}
                <div className="vote-header" onClick={onClose}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    <span>뒤로 가기</span>
                </div>

                {/* Title */}
                <input
                    className="vote-input-title"
                    placeholder="투표 제목 입력"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />

                {/* Options */}
                <div className="vote-options-list">
                    {options.map((opt, idx) => (
                        <div key={idx} className="vote-option-item">
                            <input
                                className="vote-input-option"
                                placeholder={`${idx + 1}. 투표 항목 입력`}
                                value={opt}
                                onChange={e => handleOptionChange(idx, e.target.value)}
                            />
                            {options.length > 2 && (
                                <button className="vote-delete-btn" onClick={() => removeOption(idx)}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Add Button */}
                <div className="vote-add-btn-wrapper">
                    <button className="vote-add-btn" onClick={addOption}>
                        항목 추가
                    </button>
                </div>

                {/* Settings & Time */}
                <div className="vote-settings-area">
                    <div className="vote-checks">
                        <div className="vote-check-item" onClick={() => setAllowMultiple(!allowMultiple)}>
                            <div className={`vote-checkbox ${allowMultiple ? 'checked' : ''}`}>
                                {allowMultiple && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span>복수 선택 허용</span>
                        </div>
                        <div className="vote-check-item" onClick={() => setIsAnonymous(!isAnonymous)}>
                            <div className={`vote-checkbox ${isAnonymous ? 'checked' : ''}`}>
                                {isAnonymous && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span>익명</span>
                        </div>
                    </div>

                    <div className="vote-time-section">
                        <div className="vote-time-label">투표 종료 시간</div>
                        <div className="vote-time-display" onClick={handleDateClick}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            <span>{formatDisplayDate(deadline)}</span>
                        </div>
                    </div>
                </div>

                {/* Submit */}
                <button className="vote-submit-btn" onClick={handleSubmit}>
                    투표 올리기
                </button>

                {showDatePicker && (
                    <CustomDatePicker
                        initialDate={deadline}
                        onClose={() => setShowDatePicker(false)}
                        onConfirm={handleDateConfirm}
                    />
                )}
            </div>
        </div>
    );
};

export default VoteCreationModal;
