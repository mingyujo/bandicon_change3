// [전체 코드] src/features/auth/LoginForm.js
/*
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiPost } from "../../api/api";

const LoginForm = ({ onLogin, installPrompt }) => {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

const handleLogin = async (e) => {
  e.preventDefault();
  console.log("===== 로그인 버튼 클릭! handleLogin 함수 실행 시작 ====="); // <-- 이 줄을 추가!
  setError("");
  try {
      const res = await apiPost("/login", { id, password });
      if (res.id) {
        onLogin(res);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "로그인 중 오류가 발생했습니다.";
      setError(errorMessage);
    }
  };

  return (
    <div className="form-container">
      <h2 className="page-title">로그인</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>아이디</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            required
            className="input-field"
          />
        </div>
        <div>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
        </div>
        {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
                {/* ===== 여기부터 추가 ===== *//*}*/
        /*{installPrompt && (
          <button 
            type="button" 
            onClick={() => installPrompt.prompt()}
            className="btn btn-secondary"
            style={{width: '100%', marginTop: '10px', background: '#4caf50', color: 'white'}}
          >
            📱 앱 설치하고 편하게 사용하기
          </button>
        )}
        {/* ===== 여기까지 추가 ===== *//*}*/
        /*<button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '10px'}}>
          로그인
        </button>
      </form>
      <p style={{textAlign: 'center', marginTop: '20px'}}>
        계정이 없으신가요? <Link to="/signup" style={{color: 'var(--primary-color)'}}>회원가입</Link>
      </p>
    </div>
  );
};

export default LoginForm;*/
// [전체 코드] src/features/auth/LoginForm.js (Django 마이그레이션 수정 완료)

import React, { useState } from "react";
import { Link } from "react-router-dom";
// --- 👇 apiGet을 import에 추가합니다 ---
import { apiPost, apiGet } from "../../api/api";

const LoginForm = ({ onLogin, installPrompt }) => {
  // --- 👇 'id' state를 'username'으로 변경 ---
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      // --- 1단계: 토큰 발급 (POST /users/token/) ---
      // [!] api.js의 apiPost를 사용합니다.
      const tokenResponse = await apiPost("/users/token/", { 
        username: username, // [!] 'id'에서 'username'으로 키 변경
        password: password 
      });
      
      if (tokenResponse.access) {
        // --- 2단계: 토큰을 localStorage에 저장 ---
        // (이후 api.js의 인터셉터가 모든 요청에 이 토큰을 사용합니다)
        localStorage.setItem('accessToken', tokenResponse.access);
        localStorage.setItem('refreshToken', tokenResponse.refresh);

        // --- 3단계: 유저 정보 요청 (GET /users/me/) ---
        // (App.js의 onLogin(user)을 호출하기 위해)
        const profileResponse = await apiGet("/users/me/");

        if (profileResponse.id) {
          // --- 4단계: App.js의 onLogin에 유저 정보 전달 ---
          onLogin(profileResponse);
        } else {
          throw new Error("로그인 후 프로필 정보를 가져오는데 실패했습니다.");
        }
      }
    } catch (err) {
      // [!] Django/DRF는 401(Unauthorized) 오류 시 "detail" 필드에
      // "No active account found with the given credentials"를 반환합니다.
      // "아이디 또는 비밀번호가 올바르지 않습니다."로 통일하는 것이 좋습니다.
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
      const errorMessage = err.response?.data?.detail || err.message || "로그인 중 오류가 발생했습니다.";
      console.error("로그인 실패:", errorMessage);
    }
  };

  return (
    <div className="form-container">
      <h2 className="page-title">로그인</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>아이디</label>
          <input
            type="text"
            value={username} // [!] id -> username
            onChange={(e) => setUsername(e.target.value)} // [!] setId -> setUsername
            required
            className="input-field"
          />
        </div>
        <div>
          <label>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="input-field"
          />
        </div>
        {error && <p style={{ color: "red", textAlign: 'center' }}>{error}</p>}
        
        {/* ... (installPrompt 버튼은 그대로 유지) ... */}
        {installPrompt && (
          <button 
            type="button" 
            onClick={() => installPrompt.prompt()}
            className="btn btn-secondary"
            style={{width: '100%', marginTop: '10px', background: '#4caf50', color: 'white'}}
          >
            📱 앱 설치하고 편하게 사용하기
          </button>
        )}
        
        <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '10px'}}>
          로그인
        </button>
      </form>
      <p style={{textAlign: 'center', marginTop: '20px'}}>
        계정이 없으신가요? <Link to="/signup" style={{color: 'var(--primary-color)'}}>회원가입</Link>
      </p>
    </div>
  );
};

export default LoginForm;