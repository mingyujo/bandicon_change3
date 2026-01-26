import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiPost } from "../../api/api";
import "./SignupForm.css";
import logoBandicon from "../../assets/logo_bandicon.png";

export default function SignupForm() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [serverMessage, setServerMessage] = useState("");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("멤버");
  const [skills, setSkills] = useState({ 보컬: 1, 기타: 1, 베이스: 1, 드럼: 1, 키보드: 1 });
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketingAgreed, setMarketingAgreed] = useState(false);

  // --- Functions ---
  const handleAgreeAll = () => {
    setTermsAgreed(true);
    setPrivacyAgreed(true);
    setMarketingAgreed(true);
  };

  const isSignupDisabled = !termsAgreed || !privacyAgreed;

  const handleSkillChange = (session, value) => {
    setSkills((prev) => ({ ...prev, [session]: Math.max(1, Math.min(5, Number(value))), }));
  };

  const handleSendCode = async () => {
    setError("");
    setServerMessage("");
    if (phone.length < 10 || !/^\d+$/.test(phone)) {
      setError("휴대폰 번호는 - 없이 10자리 또는 11자리 숫자여야 합니다.");
      return;
    }
    // Mocking
    alert("[개발 모드] 인증번호가 발송된 척 합니다.\n인증번호 입력칸에 '123456'을 입력하세요.");
    setServerMessage("인증번호가 발송되었습니다. (인증번호: 123456)");
  };

  const handleVerifyAndNext = async () => {
    setError("");
    // Mocking
    if (verificationCode === "123456") {
      setIsVerified(true);
      setStep(2);
      setServerMessage("인증되었습니다! (개발 모드)");
      setError("");
    } else {
      setError("인증번호가 일치하지 않습니다. (개발용 정답: 123456)");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Signup submit triggered"); // Debug
    setError("");

    // Check validation
    if (!id || !password || !nickname || !email) {
      alert("아이디, 비밀번호, 닉네임, 이메일은 모두 필수 항목입니다.");
      return;
    }

    if (isSignupDisabled) {
      alert("필수 약관에 동의해주세요.");
      return;
    }

    try {
      console.log("Sending signup data..."); // Debug
      const signupData = {
        username: id,
        password,
        nickname,
        email,
        phone_number: phone,
        role: role === '간부' ? 'OPERATOR' : 'USER',
        marketing_consent: marketingAgreed,
        instruments: skills,
      };

      await apiPost("/users/signup/", signupData);

      if (role === '간부') {
        alert("간부 가입 신청이 완료되었습니다. 관리자의 승인을 기다려주세요.");
      } else {
        alert("회원가입이 완료되었습니다. 로그인해주세요.");
      }
      navigate("/login");
    } catch (err) {
      console.error("Signup Error:", err);
      let errorMessage = "회원가입 중 문제가 발생했습니다.";
      if (err.response?.data) {
        const data = err.response.data;
        if (data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'object') {
          errorMessage = Object.values(data).flat().join(", ");
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      alert("가입 실패: " + errorMessage); // Explicit alert
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-content-wrapper">
        {/* Header Tabs */}
        <div className="signup-header">
          <Link to="/login" className="header-link">로그인</Link>
          <span className="header-link active">회원가입</span>
        </div>

        {/* Logo & Branding - Only for Step 1 */}
        {step === 1 && (
          <div className="logo-section">
            <img src={logoBandicon} alt="Bandicon Logo" className="logo-image" />
            <div className="brand-title">Bandicon</div>
            <div className="brand-subtitle">세상에서 가장 쉬운 밴드</div>
          </div>
        )}

        {/* Form Card */}
        <div className="signup-card">
          {step === 1 ? (
            <>
              <div className="card-title">회원가입</div>

              <div className="input-group">
                <label className="input-label">전화번호</label>
                <div className="phone-row">
                  <input
                    type="text"
                    placeholder="- 없이 11자리"
                    className="input-gray-bar"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`btn-verify ${phone.length === 11 ? 'active' : ''}`}
                    onClick={handleSendCode}
                  >
                    인증번호 받기
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">인증번호</label>
                <div className="verification-row">
                  <div className="verification-input-wrapper">
                    <input
                      type="text"
                      placeholder="6자리 숫자"
                      className="input-gray-bar"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                    />
                    {/* Small button kept but visual emphasis moved to bottom button per request */}
                    <button type="button" className="btn-confirm-small" onClick={handleVerifyAndNext}>
                      인증
                    </button>
                  </div>
                </div>
              </div>

              {serverMessage && <div style={{ color: 'green', fontSize: '14px', textAlign: 'center' }}>{serverMessage}</div>}
              {error && <div style={{ color: 'red', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

              <button
                className={`btn-next ${verificationCode.length >= 6 ? 'primary' : ''}`}
                onClick={handleVerifyAndNext}
                disabled={verificationCode.length < 6}
              >
                인증하고 다음으로
              </button>
            </>
          ) : (
            /* --- STEP 2: Detailed Info --- */
            <form className="form-step-2" onSubmit={handleSubmit}>

              {/* Title & Verified Badge */}
              <div className="step2-header">
                <div className="card-title">회원가입</div>
                <div className="verified-badge">인증완료</div>
              </div>

              {/* Scrollable Content Area */}
              <div className="step2-scroll-area">

                {/* ID */}
                <div className="input-group-step2">
                  <label className="input-label">아이디</label>
                  <input
                    type="text"
                    className="input-gray-box-step2"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Password */}
                <div className="input-group-step2">
                  <label className="input-label">비밀번호</label>
                  <input
                    type="password"
                    className="input-gray-box-step2"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Nickname */}
                <div className="input-group-step2">
                  <label className="input-label">닉네임</label>
                  <input
                    type="text"
                    className="input-gray-box-step2"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Email */}
                <div className="input-group-step2">
                  <label className="input-label">이메일</label>
                  <input
                    type="email"
                    className="input-gray-box-step2"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                  />
                </div>

                {/* Skills Section */}
                <div className="skills-section">
                  <div className="skills-header">
                    <span className="skills-title">세션별 실력</span>
                    <span className="skills-subtitle">(자가평가)</span>
                  </div>

                  {/* Skill Rows */}
                  {/* Skill Rows */}
                  {Object.keys(skills).map((session) => {
                    const percentage = ((skills[session] - 1) / 4) * 100;
                    const sliderStyle = {
                      background: `linear-gradient(to right, var(--color-파란색) ${percentage}%, #f1f4f8 ${percentage}%)`
                    };

                    return (
                      <div key={session} className="skill-row">
                        <div className="skill-label-text">
                          {session} : {skills[session]}
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="5"
                          value={skills[session]}
                          onChange={(e) => handleSkillChange(session, e.target.value)}
                          className="skill-range-input"
                          style={sliderStyle}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Agreements */}
                <div className="agreements-section">
                  <label className="checkbox-row">
                    <input type="checkbox" checked={marketingAgreed} onChange={(e) => setMarketingAgreed(e.target.checked)} />
                    <span className="checkbox-text"><span className="text-gray">[선택]</span> 마케팅 정보 수신 동의</span>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                    <span className="checkbox-text"><span className="text-gray">[필수]</span> 이용약관에 동의합니다.</span>
                  </label>
                  <label className="checkbox-row">
                    <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} />
                    <span className="checkbox-text"><span className="text-gray">[필수]</span> 개인정보 처리방침에 동의합니다.</span>
                  </label>
                </div>

              </div>

              {/* Submit Button */}
              <button type="submit" className="btn-final-signup" disabled={isSignupDisabled}>
                밴디콘 가입하기
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}