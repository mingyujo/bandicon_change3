# Bandicon Project Developer Guide

## 1. 프로젝트 개요

Bandicon은 밴드 합주 매칭, 커뮤니티, 클랜 시스템을 결합한 종합 음악 활동 플랫폼입니다. 사용자는 합주방을 생성하고 세션을 모집하거나, 클랜에 가입하여 활동하고, 게시판을 통해 소통할 수 있습니다.

### 핵심 기능
- **합주방 (Room)**: 세션별 모집, 합주 예약 및 확정, 실시간 채팅
- **클랜 (Clan)**: 클랜 생성/가입, 클랜원 관리, 클랜 전용 게시판 및 합주방, 대시보드
- **커뮤니티 (Board)**: 자유/초보자 게시판, 댓글, 좋아요, 스크랩
- **알림 (Alert)**: 실시간 활동 알림 (합주 초대, 댓글 등)

## 2. 기술 스택 (Tech Stack)

### Backend
- **Language**: Python 3.10+
- **Framework**: Django 5.2.7, Django REST Framework (DRF)
- **WebSocket**: Django Channels, Daphne (ASGI)
- **Database**: PostgreSQL (Production), SQLite (Local Dev)
- **Cache/Queue**: Redis (Upstash) - Channels Layer용
- **Authentication**: Simple JWT

### Frontend
- **Language**: JavaScript (ES6+)
- **Framework**: React 18
- **Build Tool**: Create React App (Webpack)
- **Styling**: CSS Modules, Inline Styles (Refactoring needed to Tailwind/Styled-components)
- **HTTP Client**: Axios (Custom interceptors for JWT)

### Infrastructure
- **Deployment**: Render (Web Service for Backend, Static Site for Frontend)
- **Storage**: Whitenoise (Static files), Render Disk (Media files - Persistent disk required for production)

## 3. 프로젝트 구조 (Project Structure)

### Backend (`/backend`)
- **`config/`**: Django 프로젝트 설정 (`settings.py`, `urls.py`, `asgi.py`)
  - `settings.py`: CORS, JWT, Apps, Database 설정 관리
- **`user_app/`**: 회원가입, 로그인, 프로필, 친구, 알림 모델
- **`room_app/`**: 합주방 생성, 세션 예약, 합주 확정 로직
- **`clan_app/`**: 클랜 관리, 가입 신청, 클랜 룸/게시판 연동
  - `consumers.py`: 클랜 채팅 WebSocket 로직
- **`board_app/`**: 일반 게시판(자유/초보자) 및 댓글 로직
- **`support_app/`**: 고객센터 및 문의하기 (Admin 전용)

### Frontend (`/frontend`)
- **`src/api/api.js`**: Axios 인스턴스 설정 (JWT 토큰 자동 주입, 401 갱신 로직)
- **`src/features/`**: 기능별 컴포넌트 분리
  - `auth/`: 로그인, 회원가입 폼
  - `rooms/`: 합주방 목록, 생성, 상세 (세션 예약)
  - `clan/`: 클랜 홈, 대시보드, 캘린더, 관리
  - `board/`: 게시판 목록, 글쓰기, 상세
- **`src/context/`**: 전역 상태 관리 (`AuthContext`, `AlertContext`)

## 4. 로컬 실행 방법 (Getting Started)

### 사전 요구사항
- Python 3.10 이상
- Node.js 16 이상
- Git

### Backend 실행
1. **가상환경 생성 및 활성화**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```
2. **패키지 설치**:
   ```bash
   pip install -r requirements.txt
   ```
3. **환경 변수 설정 (`.env` 파일 생성)**:
   ```env
   SECRET_KEY=your_secret_key
   DEBUG=True
   # REDIS_URL=... (로컬에서는 InMemoryChannelLayer 사용 시 불필요)
   ```
4. **DB 마이그레이션 및 실행**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Frontend 실행
1. **패키지 설치**:
   ```bash
   cd frontend
   npm install
   ```
2. **개발 서버 실행**:
   ```bash
   npm start
   ```
   브라우저가 열리며 `http://localhost:3000`으로 접속됩니다.

## 5. 주요 개발 포인트 및 주의사항

### A. 인증 (Authentication)
- **JWT 방식**: Access Token(수명 60분)과 Refresh Token(수명 7일)을 사용합니다.
- **Frontend 처리**: `api.js`의 Interceptor가 401 에러 발생 시 자동으로 Refresh Token을 사용해 Access Token을 갱신하고 재요청합니다. 개발 시 `apiGet`, `apiPost` 함수를 사용해야 이 기능이 작동합니다.

### B. 클랜 vs 일반 기능 분기
- **게시판**: `PostCreateView`(Backend)와 `CreatePost.js`(Frontend)는 일반 게시글과 클랜 게시글을 모두 처리합니다.
  - 클랜 글: `clan_board_id` 필드 전송
  - 일반 글: `board` (카테고리 ID) 필드 전송
- **합주방**: `ClanRoomListAPIView`는 클랜 전용 합주방을 생성하며, 이때 `clan` 필드가 연결됩니다. `clan` 필드가 NULL인 방만 메인 페이지(자유 합주방)에 노출됩니다.

### C. 실시간 통신 (WebSocket)
- **채팅**: `clan_app/consumers.py`를 통해 WebSocket 연결을 처리합니다.
- **경로**: `ws://<server>/ws/chat/<room_name>/`
- **주의**: 배포 환경(Render)에서는 `daphne` 서버를 사용해야 WebSocket이 정상 작동합니다. (`build.sh` 및 `Procfile` 확인)

### D. CORS (Cross-Origin Resource Sharing)
- `settings.py`에서 `CORS_ALLOW_ALL_ORIGINS = True`로 설정되어 있습니다. (개발 편의상)
- 배포 시 프론트엔드 도메인이 변경되면 `CSRF_TRUSTED_ORIGINS`에 추가해줘야 403 에러를 방지할 수 있습니다.

## 6. 자주 발생하는 이슈 (Troubleshooting)

- **회원가입 시 400 Bad Request**:
  - `UserCreateSerializer`에서 `role`이나 `status`를 필수값으로 요구하고 있는지 확인하세요. 이 필드들은 `read_only=True`여야 합니다.
  - 비밀번호가 너무 단순하면 Django 기본 정책에 의해 거부될 수 있습니다.

- **클랜 게시글 작성 시 500 Internal Server Error**:
  - `PostDetailSerializer`에서 `obj.clan_board.name`을 참조하는지 확인하세요. 모델 필드명은 `title`입니다. (`obj.clan_board.title`로 수정 필요)

- **배포 후 404 Not Found (API 호출 시)**:
  - 프론트엔드 `api.js`의 `BASE_URL`이 배포된 백엔드 주소(https://...onrender.com/api/v1)로 정확히 설정되었는지 확인하세요.
  - 끝에 슬래시(/) 유무에 따라 Django가 리다이렉트(301)를 보낼 수 있는데, 이때 POST 데이터가 유실될 수 있습니다. API 호출 시 항상 끝에 `/`를 붙이는 것을 권장합니다.

- **WebSocket 연결 실패**:
  - `asgi.py` 설정이 `ProtocolTypeRouter`로 올바르게 되어 있는지 확인하세요.
  - Render 배포 시 `gunicorn` 대신 `daphne` 명령어로 실행되고 있는지 확인하세요.

## 7. 기여 방법 (Contribution)
1. 이 저장소를 fork 하거나 clone 받습니다.
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/NewFeature`).
3. 변경 사항을 커밋합니다 (`git commit -m 'Add some feature'`).
4. 브랜치에 푸시합니다 (`git push origin feature/NewFeature`).
5. Pull Request를 생성합니다.

Happy Coding with Bandicon! 🎸
