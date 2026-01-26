import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet, apiPost } from '../../api/api';
import './CustomerCenter.css';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import MobileLayout from '../../components/MobileLayout';
import SubHeader from '../../components/SubHeader';

const CustomerCenter = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('feedback'); // 'feedback' or 'inquiry'
    const [isFolded, setIsFolded] = useState(false); // Default expanded
    const [history, setHistory] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Fetch current user from API to ensure fresh data (e.g. nickname changes)
        // Endpoint: /users/me/
        const fetchUser = async () => {
            try {
                const userData = await apiGet('/users/me/');
                setUser(userData);
            } catch (error) {
                console.error("Failed to fetch user:", error);
                // Fallback to localStorage if API fails, or redirect to login
                const storedUser = localStorage.getItem('user');
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            }
        };
        fetchUser();
    }, []);

    useEffect(() => {
        if (user) {
            fetchHistory();
        }
    }, [user, activeTab]);

    const fetchHistory = async () => {
        try {
            // Fetch history correctly using token-based authentication
            // Endpoint: /support/my/
            const data = await apiGet('/support/my/');
            if (Array.isArray(data)) {
                // Filter by activeTab type on frontend if backend returns mixed
                // Or backend might already filter. Let's assume backend returns all and we filter.
                // Based on models, type is 'feedback' or 'inquiry'. 
                // Check if 'inquiry' maps to specific string in DB. 
                // Using 'feedback' vs 'inquiry' as keys for now.
                const filtered = data.filter(item => item.type === activeTab);
                setHistory(filtered);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            alert("제목과 내용을 모두 입력해주세요.");
            return;
        }

        try {
            const payload = {
                type: activeTab,
                title: title,
                content: content
            };

            await apiPost('/support/create/', payload);
            alert("전송되었습니다.");
            setTitle('');
            setContent('');
            fetchHistory(); // Refresh history
        } catch (error) {
            console.error("Submission failed:", error);
            alert("전송 중 오류가 발생했습니다.");
        }
    };

    return (
        <MobileLayout>
            {/* Header */}
            {/* 1. Global Header */}
            <GlobalHeader user={user} />

            {/* 2. Sub Header */}
            <SubHeader title="고객센터" />

            {/* Tabs */}
            {/* Using a relative container to position under header */}
            <div className="tab-container">
                <div
                    className={`tab-item ${activeTab === 'feedback' ? 'active' : 'inactive'}`}
                    onClick={() => setActiveTab('feedback')}
                >
                    피드백
                </div>
                <div
                    className={`tab-item ${activeTab === 'inquiry' ? 'active' : 'inactive'}`}
                    onClick={() => setActiveTab('inquiry')}
                >
                    문의사항
                </div>

                {/* Tab Indicator: Adjust position based on active tab */}
                {/* 
                        Total width ~393px. Center is 50%.
                        Gap 40px. Item width approx 60px.
                        Left item center: 50% - 20px - 30px = 50% - 50px? 
                        Right item center: 50% + 20px + 30px = 50% + 50px?
                        Let's use simple style overrides for indicator position 
                    */}
                <div
                    className="tab-indicator"
                    style={{
                        left: activeTab === 'feedback' ? 'calc(50% - 50px)' : 'calc(50% + 50px)'
                    }}
                />
            </div>

            <div className="content-area-scroll">
                {/* History Section */}
                <div className="section-title-row">
                    <div className="section-title">내 상담 내역</div>
                    <div
                        className={`fold-btn ${isFolded ? 'folded' : 'unfolded'}`}
                        onClick={() => setIsFolded(!isFolded)}
                    >
                        {isFolded ? '펼치기' : '접어두기'}
                    </div>
                </div>

                <div className="history-list" style={{ maxHeight: isFolded ? '0px' : '1000px' }}>
                    {history.length === 0 ? (
                        <div className="history-item">
                            <div className="history-content">내역이 없습니다.</div>
                        </div>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="history-item">
                                {item.status === 'answered' && (
                                    <div className="answer-badge">답변 완료</div>
                                )}
                                <div className="history-title">{item.title}</div>
                                <div className="history-content">{item.content}</div>
                                <div className="history-date">
                                    {new Date(item.created_at).toLocaleDateString()}
                                </div>

                                {/* Admin Reply */}
                                {item.replies && item.replies.length > 0 && (
                                    <div className="admin-reply">
                                        <div className="admin-title">관리자 답변</div>
                                        <div className="history-content">{item.replies[0].content}</div>
                                        <div className="history-date">
                                            {new Date(item.replies[0].created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Write Form Section */}
                <div className="write-form-container">
                    <div className="form-label">
                        {activeTab === 'feedback' ? '피드백 작성하기' : '문의사항 작성하기'}
                    </div>

                    <input
                        type="text"
                        className="input-field"
                        placeholder="제목을 입력하세요."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />

                    <textarea
                        className="textarea-field"
                        placeholder="내용을 입력하세요."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />

                    <button className="submit-btn" onClick={handleSubmit}>
                        전송하기
                    </button>
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default CustomerCenter;
