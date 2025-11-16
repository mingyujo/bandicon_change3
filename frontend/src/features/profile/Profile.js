// frontend/src/features/profile/Profile.js

import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
// --- (수정) apiPostForm, apiPut 임포트 추가 ---
import { apiGet, apiPostForm, apiPut, API_BASE_SERVER } from "../../api/api";
// --- (수정) ---

const Profile = ({ user, onLogout, onUpdateUser }) => {
  const [profile, setProfile] = useState(null);
  const [file, setFile] = useState(null);
  const [newNickname, setNewNickname] = useState("");
  const navigate = useNavigate();
  
  const { nickname } = useParams();
  const targetNickname = nickname || user?.nickname; // (user가 null일 수 있으므로 user?.nickname)
  const isMyProfile = !nickname || nickname === user?.nickname;

  const fetchProfile = useCallback(async () => {
    if (!targetNickname) return;
    try {
      // --- 👇 [수정] URL에 '/users/' 추가 및 맨 뒤에 '/' 추가 ---
      const data = await apiGet(`/users/profile/${encodeURIComponent(targetNickname)}/`);
      setProfile(data);
    } catch (e) {
      console.error(e);
      if(isMyProfile) {
        alert("세션이 만료되었거나 사용자를 찾을 수 없습니다. 다시 로그인해주세요.");
        onLogout();
      } else {
        alert("프로필을 불러오지 못했습니다.");
      }
    }
  }, [targetNickname, isMyProfile, onLogout]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const uploadImage = async () => {
    // (수정) FormData 및 API 호출 로직 추가 (기존 alert 제거)
    if (!file) {
      alert("파일을 먼저 선택해주세요.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      // --- 👇 [수정] URL에 '/users/' 추가 및 맨 뒤에 '/' 추가 ---
      const updatedUser = await apiPostForm(
        `/users/profile/${encodeURIComponent(targetNickname)}/upload-image/`,
        formData
      );
      
      onUpdateUser(updatedUser); // App.js의 user 상태 업데이트
      setProfile(updatedUser);   // 현재 페이지의 profile 상태 업데이트
      alert("프로필 이미지가 변경되었습니다.");
      setFile(null); // 파일 선택 초기화
      
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.detail || "이미지 업로드에 실패했습니다.");
    }
  };

  const handleNicknameChange = async () => {
    if (!newNickname.trim()) {
        alert("새 닉네임을 입력해주세요.");
        return;
    }
    if (newNickname.trim() === user.nickname) {
        alert("현재 닉네임과 동일합니다.");
        return;
    }
    if (!window.confirm(`닉네임을 '${newNickname}'(으)로 변경하시겠습니까?`)) {
        return;
    }

    try {
        // --- 👇 [수정] URL에 '/users/' 추가 및 맨 뒤에 '/' 추가 ---
        const updatedUser = await apiPut('/users/profile/update-nickname/', {
            current_nickname: user.nickname,
            new_nickname: newNickname.trim()
        });
        onUpdateUser(updatedUser); // App.js의 user 상태 업데이트
        alert("닉네임이 성공적으로 변경되었습니다.");
        setNewNickname("");
        // 변경된 닉네임의 프로필 페이지로 이동
        navigate(`/profile/${updatedUser.nickname}`);
    } catch (e) {
        alert(e.response?.data?.detail || "닉네임 변경에 실패했습니다.");
    }
  };

  if (!profile) return <div style={{ padding: 20 }}>로딩중…</div>;

  // (이하 렌더링 부분은 동일)
  return (
    <div style={{ padding: 20, maxWidth: '700px', margin: 'auto' }}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 className="page-title" style={{textAlign: 'left', margin: 0}}>{isMyProfile ? "내 프로필" : `${targetNickname}님의 프로필`}</h2>
        {isMyProfile && (
            <button className="btn btn-danger" onClick={onLogout}>로그아웃</button>
        )}
      </div>
      
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 12, marginTop: 20 }}>
        <img
          src={
            profile.profile_img
              ? profile.profile_img.startsWith('http') 
                ? profile.profile_img 
                : profile.profile_img.startsWith('/') 
                  ? `${API_BASE_SERVER}${profile.profile_img}`
                  : `${API_BASE_SERVER}/${profile.profile_img}`
              : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23e0e0e0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='14'%3ENO IMG%3C/text%3E%3C/svg%3E"
          }
          alt="profile"
          style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "1px solid #eee" }}
        />
        <div>
          <div style={{ fontWeight: 600, fontSize: 18 }}>{profile.nickname}</div>
          {/* (수정) id -> username으로 변경 */}
          <div style={{ fontSize: 13, color: "#666" }}>ID: {profile.id}</div> 
          <div style={{ fontSize: 13, color: "#666" }}>역할: {profile.role}</div>
          <div style={{ fontSize: 13, color: "#666" }}>
            {/* (수정) clans로 변경 */}
            소속: {profile.clans && profile.clans.length > 0 ? (
                profile.clans.map(c => (
                    <Link key={c.id} to={`/clans/${c.id}`} style={{ marginRight: '8px' }}>{c.name}</Link>
                ))
            ) : "없음"}
          </div>
          {/* (수정) profile.score -> profile.introduction */}
          <div style={{ fontSize: 13, color: "#666" }}>소개: {profile.introduction || "없음"}</div>
        </div>
      </div>

      {isMyProfile && (
        <>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>프로필 이미지 변경</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  style={{
                    position: 'absolute',
                    left: '-9999px',
                    opacity: 0
                  }}
                  id="profile-file-input"
                />
                <label
                  htmlFor="profile-file-input"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#495057',
                    transition: 'all 0.2s ease',
                    userSelect: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e9ecef';
                    e.target.style.borderColor = '#adb5bd';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#dee2e6';
                  }}
                >
                   {file ? file.name : '파일 선택'}
                </label>
              </div>
              
              <button onClick={uploadImage} className="btn btn-secondary" disabled={!file}>
                업로드
              </button>
            </div>
          </div>

          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>닉네임 변경</h3>
            <div style={{display: 'flex', gap: '8px'}}>
              <input 
                type="text" 
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                placeholder="새 닉네임"
                className="input-field"
                style={{flex: 1, margin: 0}}
              />
              <button onClick={handleNicknameChange} className="btn btn-primary">
                변경
              </button>
            </div>
          </div>

          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>고객 지원</h3>
            <button 
              onClick={() => navigate('/support')}
              className="btn btn-secondary"
            >
              문의/피드백 남기기
            </button>
          </div>

          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>스크랩한 글</h3>
              <Link to="/my-scraps">
                  <button className="btn btn-secondary">내 스크랩 바로가기</button>
              </Link>
          </div>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>내가 쓴 글</h3>
              <Link to="/my-posts">
                  <button className="btn btn-secondary">내가 쓴 글 바로가기</button>
              </Link>
          </div>
          <div className="card" style={{marginTop: 20}}>
            <h3 style={{marginTop: 0}}>내가 쓴 댓글</h3>
              <Link to="/my-comments">
                  <button className="btn btn-secondary">내가 쓴 댓글 바로가기</button>
              </Link>
          </div>
        </>
      )}
    </div>
  );
};

export default Profile;