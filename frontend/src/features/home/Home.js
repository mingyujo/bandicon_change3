// [전체 코드] src/features/home/Home.js
import React from "react";
import { Link } from "react-router-dom";

export default function Home({ user }) {
  return (
    <div>
      <div className="home-hero">
        {/* [수정] 인라인 스타일을 제거하고 CSS 클래스에 스타일링을 위임합니다. */}
        <h1>Bandicon</h1>
        <p>"세상에서 가장 쉬운 밴드"</p>
      </div>

      <div className="feature-grid">
        <Link to="/rooms" style={{textDecoration: 'none'}}>
          <div className="card feature-card">
            <div className="icon">🎸</div>
            <h3>자유 합주방 보기</h3>
            <p>지금 바로 참여 가능한 합주방을 찾아보세요!</p>
          </div>
        </Link>
        <Link to="/my-rooms" style={{textDecoration: 'none'}}>
          <div className="card feature-card">
            <div className="icon">🚪</div>
            <h3>내 방 가기</h3>
            <p>내가 참여하고 있는 합주방으로 바로 이동합니다.</p>
          </div>
        </Link>
        <Link to="/boards" style={{textDecoration: 'none'}}>
          <div className="card feature-card">
            <div className="icon">📝</div>
            <h3>게시판 가기</h3>
            <p>자유롭게 소통하고 정보를 공유하는 공간입니다.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}