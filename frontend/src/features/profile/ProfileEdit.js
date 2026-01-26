// frontend/src/features/profile/ProfileEdit.js
import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiGet, apiPatchForm, API_BASE_SERVER } from "../../api/api"; // Updated import
import defaultProfileImg from "../../assets/default_profile.png";
import "./ProfileEdit.css";

const ProfileEdit = ({ user, onUpdateUser }) => {
    const navigate = useNavigate();
    const fileInputRef = useRef(null); // Ref for file input
    const [loading, setLoading] = useState(true);

    // Form State
    const [nickname, setNickname] = useState("");
    // Instruments: { 보컬: 1, ... }
    const [skills, setSkills] = useState({ 보컬: 1, 기타: 1, 베이스: 1, 키보드: 1, 드럼: 1 });
    const [selectedFile, setSelectedFile] = useState(null); // New state for file
    const [previewUrl, setPreviewUrl] = useState(null); // New state for preview

    // Read-only / Display fields
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [currentProfileImg, setCurrentProfileImg] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                // Fetch fresh profile data
                const data = await apiGet(`/users/profile/${encodeURIComponent(user.nickname)}/`);

                // username fallback: data.username -> user.username -> user.id (from /users/me/)
                setUsername(data.username || user.username || user.id);
                setNickname(data.nickname || user.nickname);
                setEmail(data.email || user.email);
                setCurrentProfileImg(data.profile_img);

                // Map instruments (JSON or Array) to skills object
                // Assumed data.instruments is { '보컬': 1, ... } or list
                if (data.instruments && !Array.isArray(data.instruments)) {
                    // If it's already an object
                    setSkills(prev => ({ ...prev, ...data.instruments }));
                } else if (Array.isArray(data.instruments)) {
                    // If it's an array of objects/strings, this might need parsing.
                    // For now, assume it mirrors SignupForm's consistent Object structure
                    // But if it is empty, keep default.
                }

                setLoading(false);
            } catch (e) {
                console.error("Failed to fetch profile", e);
                setLoading(false);
            }
        };
        fetchUserData();
    }, [user]);

    const handleSkillChange = (session, value) => {
        setSkills((prev) => ({ ...prev, [session]: Math.max(1, Math.min(5, Number(value))), }));
    };

    const handleImageClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async () => {
        try {
            const formData = new FormData();
            formData.append("nickname", nickname);
            // Backend expects JSON formatted string for instruments if sending via multipart/form-data
            formData.append("instruments", JSON.stringify(skills));

            if (selectedFile) {
                formData.append("profile_img", selectedFile);
            }

            // Use apiPatchForm for multipart/form-data
            const updatedData = await apiPatchForm(`/users/profile/${encodeURIComponent(user.nickname)}/`, formData);

            // Update global user state if nickname changed
            if (onUpdateUser) {
                onUpdateUser({ ...user, ...updatedData });
            }

            alert("프로필이 저장되었습니다.");
            navigate("/profile");
        } catch (e) {
            console.error(e);
            const errorMsg = e.response && e.response.data && e.response.data.detail
                ? e.response.data.detail
                : "프로필 저장 중 오류가 발생했습니다.";
            alert(errorMsg);
        }
    };

    if (loading) return <div className="profile-edit-wrapper"><div className="profile-edit-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div></div>;

    // Determine image source: Preview -> Current (Server) -> Default
    let displayImgSrc = defaultProfileImg;
    if (previewUrl) {
        displayImgSrc = previewUrl;
    } else if (currentProfileImg) {
        displayImgSrc = currentProfileImg.startsWith('http') ? currentProfileImg : `${API_BASE_SERVER}${currentProfileImg}`;
    }

    return (
        <div className="profile-edit-wrapper">
            <div className="profile-edit-container">

                {/* 1. Global Header */}
                <div className="profile-edit-global-header">
                    <div className="profile-edit-brand">Bandicon</div>
                    <div className="profile-edit-global-right">
                        <div className="profile-edit-global-name">{nickname} 님</div>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', backgroundColor: '#ddd', overflow: 'hidden' }}>
                            <img src={displayImgSrc} alt="Mini Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>
                </div>

                {/* 2. Sub Header */}
                <div className="profile-edit-sub-header">
                    <div className="profile-edit-back-btn" onClick={() => navigate(-1)}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </div>
                    <div className="profile-edit-title">프로필 편집</div>
                </div>

                {/* 3. Body */}
                <div className="profile-edit-body">

                    {/* Profile Image (Clickable) */}
                    <div className="profile-edit-img-section">
                        <div className="profile-edit-img-box" onClick={handleImageClick} style={{ cursor: 'pointer' }}>
                            <img src={displayImgSrc} alt="Profile" className="profile-edit-img" />
                            {/* Optional: Add an overlay icon to indicate editability */}
                            <div style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: 'white', borderRadius: '50%', padding: 4, border: '1px solid #ddd' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Form Fields */}
                    <div className="edit-form-group">
                        <label className="edit-label">아이디</label>
                        <input type="text" className="edit-input" value={username} readOnly />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-label">비밀번호</label>
                        {/* Visual placeholder for security */}
                        <input type="password" className="edit-input" value="********" readOnly />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-label">닉네임</label>
                        <input type="text" className="edit-input" value={nickname} onChange={(e) => setNickname(e.target.value)} />
                    </div>

                    <div className="edit-form-group">
                        <label className="edit-label">이메일</label>
                        <input type="text" className="edit-input" value={email} readOnly />
                    </div>

                    {/* Skills */}
                    <div className="edit-skills-section">
                        <div className="skills-header">
                            <span className="skills-title">세션별 실력</span>
                            <span className="skills-subtitle">(자가평가)</span>
                        </div>

                        {Object.keys(skills).map((session) => {
                            const percentage = ((skills[session] - 1) / 4) * 100;
                            const sliderStyle = {
                                background: `linear-gradient(to right, var(--color-파란색) ${percentage}%, #f1f4f8 ${percentage}%)`
                            };
                            return (
                                <div key={session} className="skill-row">
                                    <div className="skill-label-text">{session} : {skills[session]}</div>
                                    <input
                                        type="range"
                                        min="1" max="5"
                                        value={skills[session]}
                                        onChange={(e) => handleSkillChange(session, e.target.value)}
                                        className="skill-range-input"
                                        style={sliderStyle}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {/* Save Button */}
                    <button className="profile-save-btn" onClick={handleSubmit}>프로필 저장</button>
                </div>

                {/* 4. Bottom Nav */}
                <div className="profile-edit-bottom-nav">
                    <Link to="/rooms" className="nav-item">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6" /><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" /></svg>
                    </Link>
                    <Link to="/boards" className="nav-item">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                    </Link>
                    <Link to="/" className="nav-item">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                    </Link>
                    <Link to="/clans" className="nav-item">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    </Link>
                    <Link to="/ambassador" className="nav-item">
                        <svg style={{ width: 24, height: 24 }} viewBox="0 0 24 24" fill="none" stroke="#083344" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    </Link>
                </div>

            </div>
        </div>
    );
};

export default ProfileEdit;
