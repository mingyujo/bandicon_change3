import React, { useState, useEffect } from 'react';
import './SettlementModal.css';

const SettlementModal = ({ clanMembers = [], onClose, onSubmit }) => {
    const [bank, setBank] = useState('');
    const [account, setAccount] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [items, setItems] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Initialize or Update items from clanMembers
    useEffect(() => {
        setItems(prevItems => {
            // Create a map of current state to preserve inputs
            const stateMap = new Map();
            prevItems.forEach(i => {
                if (i.id) stateMap.set(i.id, { amount: i.amount, isChecked: i.isChecked });
            });

            return clanMembers.map(m => {
                const id = m.id || m.username || m.nickname; // Robust ID fallback
                const savedState = stateMap.get(id);

                return {
                    id: id,
                    nickname: m.nickname || m.username || "Unknown",
                    avatar: m.image || m.profile_image || null,
                    amount: savedState ? savedState.amount : 0,
                    isChecked: savedState ? savedState.isChecked : true
                };
            });
        });
    }, [clanMembers]);

    // Distribute total amount when it changes
    useEffect(() => {
        const total = parseInt(totalAmount) || 0;
        const checkedCount = items.filter(i => i.isChecked).length;
        if (checkedCount === 0) return;

        const baseAmount = Math.floor(total / checkedCount);
        // Remainder handling? For now simpler floor.

        setItems(prev => prev.map(item => {
            if (item.isChecked) {
                return { ...item, amount: baseAmount };
            }
            return { ...item, amount: 0 };
        }));
    }, [totalAmount]); // Only trigger on Total change (Top-down)

    // Handle check toggle
    const toggleCheck = (idx) => {
        const newItems = [...items];
        newItems[idx].isChecked = !newItems[idx].isChecked;

        // Re-calculate distribution if total exists
        const total = parseInt(totalAmount) || 0;
        const checkedCount = newItems.filter(i => i.isChecked).length;

        if (checkedCount > 0) {
            const baseAmount = Math.floor(total / checkedCount);
            newItems.forEach(item => {
                if (item.isChecked) item.amount = baseAmount;
                else item.amount = 0;
            });
        }

        setItems(newItems);
    };

    // Handle individual amount change
    const handleAmountChange = (idx, value) => {
        // Allow empty string for better UX (clearing field)
        if (value === '') {
            setItems(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], amount: '' };
                return next;
            });
            return;
        }

        const val = parseInt(value);
        if (!isNaN(val)) {
            setItems(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], amount: val };
                return next;
            });
        }
    };

    const handleSubmit = () => {
        if (!bank || !account) {
            alert('은행과 계좌번호를 입력해주세요.');
            return;
        }
        // Filter those involved
        const participants = items.filter(i => i.isChecked).map(i => ({
            nickname: i.nickname,
            amount: Number(i.amount) || 0
        })).filter(p => p.amount > 0);

        onSubmit({
            bank,
            account,
            total: totalAmount,
            participants
        });
    };

    const filteredItems = items.map((item, idx) => ({ ...item, originalIdx: idx }))
        .filter(item => item.nickname.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="settlement-overlay" onClick={onClose}>
            <div className="settlement-container" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="settlement-header">
                    <button className="settlement-back" onClick={onClose}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                        <span>뒤로 가기</span>
                    </button>
                    <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', color: '#083344', paddingRight: '20px' }}>
                        정산하기
                    </div>
                </div>

                {/* Inputs */}
                <div className="settlement-inputs">
                    <div className="sett-input-group">
                        <input
                            className="sett-input"
                            placeholder="은행 선택"
                            value={bank}
                            onChange={e => setBank(e.target.value)}
                        />
                    </div>
                    <div className="sett-input-group">
                        <input
                            className="sett-input"
                            placeholder="계좌번호 입력"
                            value={account}
                            onChange={e => setAccount(e.target.value)}
                        />
                    </div>
                    <div className="sett-input-group" style={{ backgroundColor: '#F8FAFC' }}>
                        <span style={{ color: '#64748B', marginRight: '4px' }}>₩</span>
                        <input
                            type="number"
                            className="sett-input"
                            placeholder="금액 입력"
                            value={totalAmount}
                            onChange={e => setTotalAmount(e.target.value)}
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="sett-search-area">
                    <svg className="sett-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                    <input
                        className="sett-search-input"
                        placeholder="이름 검색"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* List */}
                <div className="sett-list-scroll">
                    {filteredItems.map((item) => (
                        <div key={item.originalIdx} className="sett-item">
                            <div className="sett-item-left">
                                <div
                                    className={`sett-check-circle ${item.isChecked ? 'checked' : ''}`}
                                    onClick={() => toggleCheck(item.originalIdx)}
                                >
                                    {item.isChecked && <svg className="sett-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>}
                                </div>
                                <div className="sett-avatar">
                                    {/* Placeholder avatar logic */}
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#eee"><circle cx="12" cy="12" r="12" /></svg>
                                </div>
                                <div className="sett-name">{item.nickname}</div>
                            </div>
                            <div className="sett-item-right">
                                <input
                                    className="sett-amount-val"
                                    value={item.amount}
                                    type="number"
                                    onChange={(e) => handleAmountChange(item.originalIdx, e.target.value)}
                                    // Stop propagation to avoid toggling check
                                    onClick={e => e.stopPropagation()}
                                    onFocus={e => e.target.select()}
                                />
                                <span style={{ fontSize: '11px', color: '#083344' }}>원</span>
                                <svg className="sett-edit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Submit */}
                <button className="sett-submit-btn" onClick={handleSubmit}>
                    정산하기
                </button>
            </div>
        </div>
    );
};

export default SettlementModal;
