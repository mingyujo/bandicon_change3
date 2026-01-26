import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>← 뒤로가기</button>
      <h2>이용약관</h2>
      
      {/* 이 아래 P 태그 안에 나중에 찾은 이용약관 전문을 붙여넣으시면 됩니다. */}
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
        제1조 (목적)
        이 약관은 밴디콘이 제공하는 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
        
        ... (이하 약관 내용) ...
      </p>
    </div>
  );
};

export default TermsPage;