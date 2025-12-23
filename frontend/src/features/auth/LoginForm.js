import React, { useState } from "react";
import { Link } from "react-router-dom";
// .js 확장자를 붙여서 경로 오류를 방지합니다.
import { apiPost, apiGet } from "../../api/api.js";

const LoginForm = ({ onLogin, installPrompt }) => {
  // Django는 'id' 대신 'username'을 사용합니다.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("===== 로그인 요청 시작 =====");
    setError("");
    
    try {
      // 1. 토큰 발급 요청 (주소: /users/token/, 데이터: username, password)
      const tokenResponse = await apiPost("/users/token/", { 
        username: username, 
        password: password 
      });
      
      console.log("토큰 발급 성공:", tokenResponse);

      if (tokenResponse.access) {
        // 2. 토큰 저장 (localStorage)
        localStorage.setItem('accessToken', tokenResponse.access);
        localStorage.setItem('refreshToken', tokenResponse.refresh);

        // 3. 토큰을 이용해 내 정보(Profile) 가져오기
        // (api.js 내부에서 자동으로 accessToken을 헤더에 실어 보냅니다)
        const profileResponse = await apiGet("/users/me/");
        console.log("내 정보 조회 성공:", profileResponse);

        if (profileResponse.id) {
          // 4. 로그인 완료 처리
          onLogin(profileResponse);
        } else {
          throw new Error("회원 정보를 불러오지 못했습니다.");
        }
      }
    } catch (err) {
      console.error("로그인 에러:", err);
      
      // 에러 메시지 사용자 친화적으로 변환
      let msg = "로그인 중 오류가 발생했습니다.";
      
      if (err.response) {
        if (err.response.status === 404) {
          msg = "서버 연결 오류: 주소를 찾을 수 없습니다. (/users/token/)";
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
    <div className="form-container">
      <h2 className="page-title">로그인</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label>아이디</label>
          <input
            type="text"
            // 변수명 username 사용
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="input-field"
            placeholder="아이디를 입력하세요"
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
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        
        {error && <p style={{ color: "red", textAlign: 'center', fontSize: '0.9em', marginTop: '10px' }}>{error}</p>}
        
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