import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiPost } from "../../api/api.js";
import "./FindIdPage.css";
import logoBandicon from "../../assets/logo_bandicon.png";

const FindIdPage = () => {
    const navigate = useNavigate();
    const [phone, setPhone] = useState("");
    const [authCode, setAuthCode] = useState("");
    const [serverMessage, setServerMessage] = useState("");
    const [isVerified, setIsVerified] = useState(false);
    const [foundUsername, setFoundUsername] = useState("");
    const [showResult, setShowResult] = useState(false);

    const handleSendCode = async (e) => {
        if (e) e.preventDefault();
        if (phone.length < 10) {
            setServerMessage("올바른 전화번호를 입력해주세요.");
            return;
        }
        setServerMessage("인증번호 발송 중...");

        try {
            const response = await apiPost("/users/find-id/send-code/", {
                phone_number: phone
            });
            if (response.success) {
                setServerMessage("인증번호가 발송되었습니다.");
            }
        } catch (error) {
            console.error("발송 실패:", error);
            let msg = "발송 실패";
            if (error.response && error.response.data && error.response.data.detail) {
                msg = error.response.data.detail;
            }
            setServerMessage(msg);
        }
    };

    const handleVerify = async (e) => {
        if (e) e.preventDefault();
        if (authCode.length < 4) return;

        try {
            const response = await apiPost("/users/find-id/verify/", {
                phone_number: phone,
                code: authCode
            });
            if (response.success) {
                setIsVerified(true);
                setFoundUsername(response.username);
                setServerMessage("인증되었습니다.");
            }
        } catch (error) {
            console.error("인증 실패:", error);
            let msg = "인증 실패";
            if (error.response && error.response.data && error.response.data.detail) {
                msg = error.response.data.detail;
            }
            setServerMessage(msg);
        }
    };

    const handleNext = (e) => {
        if (e) e.preventDefault();
        if (!isVerified) return;
        setShowResult(true);
    };

    return (
        <div className="find-id-container">
            <div className="find-id-content-wrapper">
                {/* Header */}
                <div className="header-wrapper">
                    <Link to="/login" className="header-link">로그인</Link>
                    <Link to="/signup" className="header-link">회원가입</Link>
                </div>

                {/* Logo */}
                <div className="logo-section">
                    <img src={logoBandicon} alt="Bandicon Logo" className="logo-image" />
                    <div className="brand-title">Bandicon</div>
                    <div className="brand-subtitle">세상에서 가장 쉬운 밴드</div>
                </div>

                {/* Content Area: Either Form Card or Result Popup */}
                {!showResult ? (
                    <div className="find-id-card">
                        <div className="card-title-left">아이디 찾기</div>

                        <div className="input-row-group">
                            <label className="input-label">전화번호</label>
                            <div className="phone-flex-row">
                                <input
                                    type="text"
                                    placeholder="- 없이 11자리"
                                    className="input-gray-box"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                />
                                <button type="button" className="btn-get-code" onClick={handleSendCode}>
                                    인증번호 받기
                                </button>
                            </div>
                        </div>

                        <div className="input-row-group">
                            <label className="input-label">인증번호</label>
                            <div className="wrapper-relative">
                                <input
                                    type="text"
                                    placeholder="6자리 숫자"
                                    className="input-gray-box"
                                    value={authCode}
                                    onChange={(e) => setAuthCode(e.target.value)}
                                />
                                <button type="button" className="btn-verify-small" onClick={handleVerify}>
                                    인증
                                </button>
                            </div>
                        </div>

                        <div className="message-text" style={{ color: isVerified ? 'var(--color-파란색)' : 'var(--color-빨간색)' }}>
                            {serverMessage}
                        </div>

                        <button
                            type="button"
                            className={`btn-next-action ${isVerified ? 'active' : ''}`}
                            onClick={handleNext}
                            disabled={!isVerified}
                        >
                            다음
                        </button>
                    </div>
                ) : (
                    // Result Popup
                    <div className="result-popup-container">
                        <div className="result-popup-text">아이디는 {foundUsername}입니다.</div>
                        <div className="result-popup-btn" onClick={() => navigate('/login')}>
                            확인
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FindIdPage;
