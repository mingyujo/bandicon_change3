import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPostForm } from '../../api/api';

const CreatePost = ({ user }) => {
    const { boardType, boardId } = useParams(); // boardId 추가
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(true);
    const [error, setError] = useState('');

const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
        setError('제목과 내용은 필수입니다.');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    //formData.append('nickname', user.nickname);
    formData.append('is_anonymous', isAnonymous);
    if (imageFile) {
        formData.append('file', imageFile);
    }
    if (boardId) {
        formData.append('clan_board_id', boardId);
    } else {
        formData.append('board_type', boardType);
    }

    try {
        // 백엔드로 POST 요청 (응답은 Axios 객체 또는 data 객체일 수 있음)
        const response = await apiPostForm('/boards/posts/', formData);
        
        let newPostId;

        // ▼▼▼ [핵심 수정] ID 추출 로직 개선 ▼▼▼
        // 1. response.data에 ID가 있는지 확인 (가장 일반적인 경우)
        if (response.data && response.data.id) {
            newPostId = response.data.id;
        // 2. response 자체에 ID가 있는지 확인 (만약 apiPostForm이 data만 반환한다면)
        } else if (response.id) {
            newPostId = response.id;
        } else {
            throw new Error("응답에서 게시글 ID를 찾을 수 없습니다.");
        }
        
        // 상세 페이지 URL 경로를 /board/posts/로 가정하고 이동
        navigate(`/board/posts/${newPostId}`);
        // ▲▲▲ [핵심 수정] ▲▲▲

    } catch (err) {
      // 👇 [수정] 에러 처리 로직을 안전하게 변경합니다.
      let errorMessage = "게시글 작성에 실패했습니다."; // 기본 에러 메시지
      // 에러 메시지 처리를 더욱 견고하게 만듭니다.
      const errorDetail = err.response?.data?.detail || err.message;

      if (typeof errorDetail === 'string') {
        errorMessage = errorDetail;
      } else if (Array.isArray(errorDetail) && errorDetail[0]?.msg) {
        errorMessage = errorDetail[0].msg;
      } else if (err.message === "응답에서 게시글 ID를 찾을 수 없습니다.") {
        errorMessage = "게시글은 저장되었으나, 상세 페이지로 이동할 수 없습니다. (ID 누락)";
      }
      
      setError(errorMessage); // 항상 텍스트(String) 형태로 에러를 설정합니다.
      console.error("게시글 작성 중 오류:", err);
    }
};

    return (
        <div style={{ maxWidth: '800px', margin: 'auto' }}>
            <h2 className="page-title">
                {boardId ? '클랜 게시판 글쓰기' : (boardType === 'general' ? '자유게시판' : '초보자게시판') + ' 글쓰기'}
            </h2>
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label>제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="input-field"
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        rows="10"
                        className="input-field"
                        style={{resize: 'vertical'}}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>이미지 첨부</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                    />
                </div>
                <div style={{ marginBottom: '15px' }}>
                    <label>
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                        />
                        익명으로 작성하기
                    </label>
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit" className="btn btn-primary" style={{width: '100%'}}>작성 완료</button>
            </form>
        </div>
    );
};

export default CreatePost;