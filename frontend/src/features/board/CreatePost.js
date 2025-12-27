import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { apiPostForm, apiGet } from '../../api/api';

const CreatePost = ({ user }) => {
    const navigate = useNavigate();
    // const location = useLocation(); 

    // URL 파라미터에서 정보 가져오기
    // 예: /create-post/general -> boardType="general"
    // 예: /create-post/clan/5 -> boardId="5" (클랜 게시판 ID)
    const { boardId } = useParams();

    // [핵심] URL에 boardId가 있으면 '클랜 게시판' 모드입니다.
    const isClanMode = !!boardId;

    // 2. State 정의
    const [boards, setBoards] = useState([]); // 일반 게시판 카테고리 목록
    const [selectedBoardId, setSelectedBoardId] = useState("");
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [error, setError] = useState("");

    // 3. 일반 게시판일 때만 카테고리 불러오기
    useEffect(() => {
        if (!isClanMode) {
            apiGet("/boards/")
                .then(data => {
                    setBoards(data);
                    if (data.length > 0) setSelectedBoardId(data[0].id);
                })
                .catch(err => console.error("게시판 목록 로드 실패:", err));
        }
    }, [isClanMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!title.trim() || !content.trim()) {
            setError('제목과 내용은 필수입니다.');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('is_anonymous', isAnonymous);

        if (imageFile) {
            // 백엔드 모델 필드명에 맞춰 'image_url' 대신 'image' 등으로 처리될 수 있음
            // 보통 DRF에서는 'image'나 'file'로 받음. views.py 확인 시 serializer가 처리.
            formData.append('file', imageFile);
        }

        // ▼▼▼ [핵심] 데이터 구분 로직 ▼▼▼
        if (isClanMode) {
            // [CASE 1] 클랜 게시판: 'clan_board_id'를 보냄
            formData.append('clan_board_id', boardId);
        } else {
            // [CASE 2] 일반 게시판: 'board' (카테고리 ID)를 보냄
            if (!selectedBoardId) {
                setError("게시판 카테고리를 선택해주세요.");
                return;
            }
            formData.append('board', selectedBoardId);
        }

        try {
            // 백엔드 PostCreateView가 일반/클랜 모두 처리 가능하므로 주소 통일
            const response = await apiPostForm('/boards/posts/', formData);

            console.log("작성 성공:", response);
            alert("게시글이 등록되었습니다.");

            // 이동 로직
            if (response.id) {
                navigate(`/post/${response.id}`);
            } else {
                // ID가 없으면 목록으로 (안전장치)
                navigate(isClanMode ? -1 : "/boards");
            }

        } catch (err) {
            console.error("게시글 작성 실패:", err);
            let errorMessage = "게시글 작성에 실패했습니다.";
            const errorDetail = err.response?.data?.detail || err.message;

            if (typeof errorDetail === 'string') {
                errorMessage = errorDetail;
            } else if (Array.isArray(errorDetail) && errorDetail[0]?.msg) {
                errorMessage = errorDetail[0].msg;
            }
            setError(errorMessage);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: 'auto', padding: '20px' }}>
            <h2 className="page-title">
                {isClanMode ? '클랜 게시글 쓰기' : '새 글 쓰기'}
            </h2>

            {isClanMode && (
                <div style={{ padding: '10px', background: '#e3f2fd', color: '#01579b', borderRadius: '5px', marginBottom: '15px' }}>
                    📢 <strong>클랜 게시판</strong>에 작성됩니다.
                </div>
            )}

            <form onSubmit={handleSubmit} className="card">
                {/* 일반 모드일 때만 카테고리 선택 표시 */}
                {!isClanMode && boards.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                        <label>게시판 선택</label>
                        <select
                            value={selectedBoardId}
                            onChange={(e) => setSelectedBoardId(e.target.value)}
                            className="input-field"
                        >
                            {boards.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div style={{ marginBottom: '15px' }}>
                    <label>제목</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="input-field"
                        placeholder="제목을 입력하세요"
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>내용</label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        required
                        className="input-field"
                        style={{ height: "200px", resize: 'vertical' }}
                        placeholder="내용을 입력하세요"
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label>이미지 첨부</label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files[0])}
                        className="input-field"
                        style={{ padding: '5px' }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={isAnonymous}
                            onChange={(e) => setIsAnonymous(e.target.checked)}
                            style={{ marginRight: '8px' }}
                        />
                        익명으로 작성하기
                    </label>
                </div>

                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: '10px', fontSize: '1.1em' }}>
                    등록하기
                </button>
            </form>
        </div>
    );
};

export default CreatePost;