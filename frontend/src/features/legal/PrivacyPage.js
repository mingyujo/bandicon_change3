import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPage = () => {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>← 뒤로가기</button>
      <h2>개인정보 처리방침</h2>

      {/* 이 아래 P 태그 안에 나중에 찾은 개인정보 처리방침 전문을 붙여넣으시면 됩니다. */}
      <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
        1. 개인정보의 수집 항목 및 이용 목적
        회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
        
        ... (이하 방침 내용) ...
      </p>
    </div>
  );
};

export default PrivacyPage;