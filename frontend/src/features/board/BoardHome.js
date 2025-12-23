// [전체 코드] src/features/board/BoardHome.js
import React from 'react';
import { Link } from 'react-router-dom';

const BoardHome = () => {
    return (
        <div style={{ maxWidth: '800px', margin: 'auto', textAlign: 'center' }}>
            <h2 className="page-title">게시판</h2>
            <p>이야기를 나누고 싶은 게시판을 선택해주세요.</p>
            <div style={{ 
                marginTop: '30px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '15px', 
                alignItems: 'center' 
            }}>
                <Link to="/boards/general" style={{width: '100%', maxWidth: '300px'}}>
                    {/* [수정] 공용 버튼 클래스를 적용합니다. */}
                    <button className="btn btn-primary" style={{ width: '100%', padding: "15px 30px", fontSize: '1.2em' }}>
                        자유 게시판
                    </button>
                </Link>
                <Link to="/boards/beginner" style={{width: '100%', maxWidth: '300px'}}>
                    {/* [수정] 공용 버튼 클래스를 적용합니다. */}
                    <button className="btn btn-primary" style={{ width: '100%', padding: "15px 30px", fontSize: '1.2em' }}>
                        초보자 게시판
                    </button>
                </Link>
            </div>
        </div>
    );
};

export default BoardHome;