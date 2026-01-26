import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, API_BASE_SERVER } from "../../api/api";
import defaultProfileImg from "../../assets/default_profile.png";
import SubHeader from "../../components/SubHeader";
import LogoutModal from "../../components/LogoutModal";
import { useAlert } from "../../context/AlertContext";
import MobileLayout from '../../components/MobileLayout';
import GlobalHeader from '../../components/GlobalHeader';
import BottomNav from '../../components/BottomNav';
import "./Profile.css";

const Profile = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useAlert();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const data = await apiGet(`/users/profile/${encodeURIComponent(user.nickname)}/`);
        setProfile(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, [user]);

  if (!profile) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</div>
  );

  const profileImgSrc = profile.profile_img
    ? (profile.profile_img.startsWith('http') ? profile.profile_img : `${API_BASE_SERVER}${profile.profile_img}`)
    : defaultProfileImg;

  return (
    <MobileLayout>
      <GlobalHeader user={user} />

      {/* 2. Page Header */}
      <SubHeader
        title="프로필"
        rightAction={
          <button className="profile-logout-btn" onClick={() => setIsLogoutModalOpen(true)}>로그아웃</button>
        }
      />

      {/* 3. Main Content Body */}
      <div className="profile-body">

        {/* Profile Info Row */}
        <div className="profile-info-row">
          <div className="profile-info-group">
            <div className="profile-img-box">
              <img src={profileImgSrc} alt="Profile" className="profile-img" />
            </div>
            <div className="profile-names">
              <div className="p-name">{profile.nickname} 님</div>
              <div className="p-affil">
                소속 : {profile.clan_affiliations && profile.clan_affiliations.length > 0
                  ? profile.clan_affiliations[0].clan_name
                  : "소속 없음"}
              </div>
            </div>
          </div>

          <div className="profile-manner-box">
            <div className="manner-col-left">
              <div className="manner-label">매너점수</div>
              <div className="manner-label">분위기 메이커</div>
            </div>
            <div className="manner-divider"></div>
            <div className="manner-col-right">
              <div className="manner-val">{profile.score}점</div>
              <div className="manner-val">{profile.mood_maker_count || 0}개</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="profile-btn-row">
          <Link to="/profile/edit" className="profile-action-btn-l">프로필 편집</Link>
          <div className="profile-action-btn-l" style={{ cursor: 'pointer' }} onClick={() => showAlert("알림", "개인 연습실 기능은 준비 중입니다.", () => { }, false)}>개인 연습실</div>
        </div>

        {/* Menu List */}
        <div className="profile-menu-container">
          <Link to="/customer-center" className="menu-item-row">
            <div className="menu-item-left">
              <div className="menu-icon-box">
                {/* Customer Center Icon (Help Circle / Question Mark) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
              <div className="menu-text">고객센터</div>
            </div>
            <svg className="menu-arrow-icon" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>

          <div className="menu-divider"></div>

          <Link to="/my-scraps" className="menu-item-row">
            <div className="menu-item-left">
              <div className="menu-icon-box">
                {/* Scrap Icon (Bookmark) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2-2z"></path>
                </svg>
              </div>
              <div className="menu-text">스크랩</div>
            </div>
            <svg className="menu-arrow-icon" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>

          <div className="menu-divider"></div>

          <Link to="/my-posts" className="menu-item-row">
            <div className="menu-item-left">
              <div className="menu-icon-box">
                {/* My Posts Icon (Pencil / Edit) */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              </div>
              <div className="menu-text">내가 쓴 글</div>
            </div>
            <svg className="menu-arrow-icon" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" stroke="#94A3B8" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </div>

      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={onLogout}
      />

      <BottomNav />
    </MobileLayout>
  );
};

export default Profile;