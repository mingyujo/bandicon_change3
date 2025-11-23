import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// [수정] apiPostForm (이미지용), apiGet (카테고리 조회용) 임포트
import { apiPostForm, apiGet } from '../../api/api';

const CreatePost = ({ user }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // 1. 클랜 ID 확인 (클랜 페이지에서 넘어왔다면 state에 clanId가 있음)
    const clanId = location.state?.clanId;

    // 2. State 정의
    const [boards, setBoards] = useState([]); // 일반 게시판 카테고리 목록
    const [selectedBoardId, setSelectedBoardId] = useState(""); // 선택된 카테고리 ID
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState(null);
    const [isAnonymous, setIsAnonymous] = useState(false); // (수정) 기본값 false
    const [error, setError] = useState("");

    // 3. 일반 게시판 카테고리 불러오기 (클랜 글이 아닐 때만)
    useEffect(() => {
        if (!clanId) {
            apiGet("/boards/")
                .then(data => {
                    setBoards(data);
                    // 카테고리가 있으면 첫 번째 것을 기본 선택
                    if (data.length > 0) setSelectedBoardId(data[0].id);
                })
                .catch(err => console.error("게시판 목록 로드 실패:", err));
        }
    }, [clanId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!title.trim() || !content.trim()) {
            setError('제목과 내용은 필수입니다.');
            return;
        }

        // FormData 생성 (이미지 파일 전송을 위해 필수)
        const formData = new FormData();
        formData.append('title', title);
        formData.append('content', content);
        formData.append('is_anonymous', isAnonymous);
        
        if (imageFile) {
            formData.append('image', imageFile); // (주의) 백엔드 모델 필드명 확인 (image vs file)
        }

        try {
            let response;
            let targetUrl;

            // ▼▼▼ [핵심] 클랜 ID 유무에 따라 API 주소 및 데이터 분기 ▼▼▼
            if (clanId) {
                // [CASE 1] 클랜 게시글 작성
                // 주소: /api/v1/clans/<clanId>/boards/
                targetUrl = `/clans/${clanId}/boards/`;
                
                // 클랜 게시판은 별도 카테고리(board) ID가 필요 없을 수 있음
                // 하지만 백엔드 모델(ClanBoard)이 name 필드를 요구한다면 title을 넣어줌
                formData.append('name', title); 
            } else {
                // [CASE 2] 일반 게시글 작성
                // 주소: /api/v1/boards/posts/
                targetUrl = "/boards/posts/";

                if (!selectedBoardId) {
                    setError("게시판 카테고리를 선택해주세요.");
                    return;
                }
                // 일반 게시글은 어떤 게시판(자유, 질문 등)인지 ID가 필수
                formData.append('board', selectedBoardId);
            }
            // ▲▲▲ [분기 종료] ▲▲▲

            console.log(`게시글 작성 요청: ${targetUrl}`);
            response = await apiPostForm(targetUrl, formData);

            console.log("작성 성공:", response);
            alert("게시글이 등록되었습니다.");

            // 이동 로직 분기
            if (clanId) {
                navigate(`/clans/${clanId}`); // 클랜 홈으로 이동
            } else {
                // 응답에 ID가 있다면 상세 페이지로, 없으면 목록으로
                if (response.id) {
                    navigate(`/board/posts/${response.id}`);
                } else {
                    navigate("/boards");
                }
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
                {clanId ? '클랜 게시글 쓰기' : '새 글 쓰기'}
            </h2>
            
            {clanId && (
                <div style={{ padding: '10px', background: '#e3f2fd', color: '#01579b', borderRadius: '5px', marginBottom: '15px' }}>
                    📢 <strong>클랜 멤버들만 볼 수 있는</strong> 게시글입니다.
                </div>
            )}

            <form onSubmit={handleSubmit} className="card">
                {/* 일반 게시판일 때만 카테고리 선택 보여주기 */}
                {!clanId && boards.length > 0 && (
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