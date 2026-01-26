import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost, apiGet } from "../../api/api.js";
import "./LoginForm.css";
import logoBandicon from "../../assets/logo_bandicon.png";

const LoginForm = ({ onLogin, installPrompt }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("===== 로그인 요청 시작 =====");
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setError("");

    try {
      const tokenResponse = await apiPost("/users/token/", {
        username: username,
        password: password
      });

      if (tokenResponse.access) {
        localStorage.setItem('accessToken', tokenResponse.access);
        localStorage.setItem('refreshToken', tokenResponse.refresh);

        const profileResponse = await apiGet("/users/me/");
        if (profileResponse.id) {
          onLogin(profileResponse);
        } else {
          throw new Error("회원 정보를 불러오지 못했습니다.");
        }
      }
    } catch (err) {
      console.error("로그인 에러:", err);
      let msg = "로그인 중 오류가 발생했습니다.";
      if (err.response) {
        if (err.response.status === 404) {
          msg = "서버 연결 오류: 주소를 찾을 수 없습니다.";
        } else if (err.response.status === 401) {
          msg = "아이디 또는 비밀번호가 일치하지 않습니다.";
        } else {
          msg = err.response.data?.detail || JSON.stringify(err.response.data);
        }
      }
      setError(msg);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content-wrapper">
        {/* Header Tabs */}
        <div className="login-header">
          <span className="header-link active">로그인</span>
          <Link to="/signup" className="header-link">회원가입</Link>
        </div>

        {/* Logo & Branding */}
        <div className="logo-section">
          <img src={logoBandicon} alt="Bandicon Logo" className="logo-image" />
          <div className="brand-title">Bandicon</div>
          <div className="brand-subtitle">세상에서 가장 쉬운 밴드</div>
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          <h2 className="card-center-title">로그인</h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="input-label">아이디</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="input-gray-bar"
              />
            </div>
            <div>
              <label className="input-label">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-gray-bar"
              />
            </div>

            {error && <p style={{ color: "var(--color-빨간색)", textAlign: 'center', fontSize: '13px', margin: 0 }}>{error}</p>}

            <button type="submit" className="btn-login">
              로그인
            </button>
          </form>

          <div className="divider-text">다른 로그인</div>

          <button type="button" className="btn-kakao">
            Kakao 로그인
          </button>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <Link to="/find-id" className="footer-link">아이디 찾기</Link>
          <Link to="/find-password" className="footer-link">비밀번호 찾기</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;