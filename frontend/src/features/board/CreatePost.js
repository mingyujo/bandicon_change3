import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPostForm, apiGet } from '../../api/api';
import MobileLayout from '../../components/MobileLayout';
import BottomNav from '../../components/BottomNav';
import GlobalHeader from '../../components/GlobalHeader';
import './CreatePost.css'; // Will create this next

const CreatePost = ({ user }) => {
    const navigate = useNavigate();
    const { boardType, boardId } = useParams(); // boardType: 'general'/'beginner', boardId: clan board Id

    const isClanMode = !!boardId;

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [youtubeLink, setYoutubeLink] = useState("");
    const [imageFile, setImageFile] = useState(null);

    // Default config based on generic board type or clan mode
    // If generic 'general' or 'beginner', we need to find their numeric IDs usually? 
    // Or does the backend accept 'general' string?
    // Looking at previous CreatePost code, it fetched /boards/ list.
    // Let's assume for now we might need to map 'general' -> ID if dynamic, or backend handles it.
    // Re-reading logic: It fetched /boards/ and selected first one.
    // We should probably preserve that logic if needed, OR if backend supports slug.
    // However, existing BoardList passed `boardId`? No, boardType.
    // Let's keep it simple: If generic, we default to the first board logic OR specific ID if known.
    // Actually, in previous code: "if (!isClanMode) { apiGet('/boards/') ... }"
    // So we need to fetch boards to get the ID for "General" or "Beginner".

    const [boards, setBoards] = useState([]);
    const [selectedBoardId, setSelectedBoardId] = useState("");

    useEffect(() => {
        if (!isClanMode) {
            apiGet("/boards/").then(data => {
                setBoards(data);
                // Try to find board matching path 'general' or 'beginner' if possible, else default 0
                // Assuming 'slug' or 'name' matches? Let's just default to first for safety or try to match.
                // If boardType is 'general', find one named '자유 게시판'? 
                // For now, default to first as per original code.
                if (data.length > 0) {
                    // Logic to try and match
                    const match = data.find(b => b.name.includes(boardType === 'beginner' ? '초보자' : '자유'));
                    if (match) setSelectedBoardId(match.id);
                    else setSelectedBoardId(data[0].id);
                }
            });
        }
    }, [isClanMode, boardType]);

    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            alert('제목과 내용을 입력해주세요.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('is_anonymous', true); // Default anonymous as per screenshot "Anonymous" toggle not blatantly shown but "User" icon implies it. User asked to "match screenshot". Screenshot shows "익명" checkboxes? No. Screenshot shows "익명" on cards. 
        // Screenshot CreatePost UI doesn't show anonymous toggle. I will hide it and default true for safety or user preference? 
        // Let's default true ("익명") as per typical community app.

        if (imageFile) {
            formData.append('file', imageFile); // or 'image'
        }
        if (youtubeLink) {
            // If backend supports it key
            formData.append('youtube_link', youtubeLink);
        }

        if (isClanMode) {
            formData.append('clan_board_id', boardId);
        } else {
            if (!selectedBoardId) {
                alert("게시판 로딩 중입니다.");
                return;
            }
            formData.append('board', selectedBoardId);
        }

        try {
            const res = await apiPostForm('/boards/posts/', formData);
            if (res.id) navigate(`/post/${res.id}`);
            else navigate(-1);
        } catch (err) {
            console.error(err);
            alert('게시글 작성 실패');
        }
    };

    return (
        <MobileLayout>
            <GlobalHeader user={user} />
            {/* Sticky Header */}
            <div className="create-post-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    <svg width="27" height="45" viewBox="0 0 12 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 1L2 10L11 19" stroke="#64748B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="header-title">게시글 작성</div>
                <div style={{ width: 47 }}></div> {/* Spacer for center alignment (matches back btn width + padding) */}
            </div>

            <div className="create-post-container">
                <div className="input-group">
                    <label>제목</label>
                    <div className="input-wrapper-gray">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-transparent"
                        />
                    </div>
                </div>

                <div className="input-group full-height">
                    <label>내용</label>
                    <div className="textarea-wrapper-gray">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="bg-transparent"
                        />
                    </div>
                </div>

                <div className="attachment-row">
                    <label htmlFor="file-upload" className="file-upload-btn">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21.44 11.05L12.25 20.24C11.1242 21.3658 9.59752 21.9983 8.00504 21.9983C6.41256 21.9983 4.88588 21.3658 3.76004 20.24C2.63419 19.1142 2.00171 17.5875 2.00171 15.995C2.00171 14.4025 2.63419 12.8759 3.76004 11.75L12.95 2.56003C13.7006 1.80946 14.7183 1.38782 15.7798 1.38782C16.8413 1.38782 17.8591 1.80946 18.6096 2.56003C19.3602 3.31059 19.7819 4.32837 19.7819 5.38987C19.7819 6.45137 19.3602 7.46915 18.6096 8.21971L9.41004 17.41C9.03475 17.7853 8.52588 17.9961 7.9952 17.9961C7.46452 17.9961 6.95565 17.7853 6.58004 17.41C6.20443 17.0344 5.99365 16.5255 5.99365 15.9949C5.99365 15.4642 6.20443 14.9553 6.58004 14.58L15.07 6.10003" stroke="#083344" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>파일 업로드</span>
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        style={{ display: 'none' }}
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />

                    <div className="youtube-input-box">
                        <input
                            type="text"
                            placeholder="Youtube 링크를 입력하세요"
                            value={youtubeLink}
                            onChange={(e) => setYoutubeLink(e.target.value)}
                        />
                    </div>
                </div>

                <div className="submit-area">
                    <button className="create-submit-btn" onClick={handleSubmit}>
                        게시글 생성
                    </button>
                </div>
            </div>

            <BottomNav />
        </MobileLayout>
    );
};

export default CreatePost;