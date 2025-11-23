import axios from "axios";

// =================================================================
// 1. 환경 변수 및 URL 설정
// =================================================================

// [중요] 배포된 Django 백엔드 주소를 여기에 정확히 입력하세요.
// (맨 끝에 슬래시 '/'는 뺍니다)
const DEPLOYED_BACKEND_URL = "https://bandicon_test.onrender.com";

// 개발 환경(npm start)인지 배포 환경(npm run build)인지 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// 최종 사용할 API 기본 주소 결정
// 개발 모드면 로컬호스트, 아니면 배포된 백엔드 주소 사용
const BASE_URL = isDevelopment ? "http://127.0.0.1:8000" : DEPLOYED_BACKEND_URL;

export const ADMIN_TOKEN = "abc123-VERY-LONG-RANDOM";

console.log(`🚀 API 모드: ${isDevelopment ? '개발(Local)' : '배포(Production)'}`);
console.log(`🔗 연결된 서버: ${BASE_URL}`);

// =================================================================
// 2. Axios 인스턴스 생성
// =================================================================

// (1) 일반 유저용 API 인스턴스 (JWT 토큰 사용)
const api = axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // CORS 쿠키 공유 필요 시 사용
});

// (2) 관리자/운영자용 API 인스턴스 (별도 토큰 사용)
// 또는 리프레시 토큰 갱신용으로도 사용 (인터셉터 영향 안 받음)
const adminApi = axios.create({
    baseURL: `${BASE_URL}/api/v1`,
    headers: {
        'Content-Type': 'application/json',
    }
});

// =================================================================
// 3. 인터셉터 설정 (요청/응답 가로채기)
// =================================================================

// [요청 인터셉터] 모든 api 요청에 자동으로 JWT Access Token을 헤더에 넣음
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// [응답 인터셉터] 401 에러(토큰 만료) 발생 시 자동으로 갱신 시도
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 아직 재시도하지 않은 요청이며, 토큰 갱신 요청 자체가 아닐 때
        if (
            error.response?.status === 401 && 
            !originalRequest._retry && 
            !originalRequest.url.includes('/users/token/')
        ) {
            originalRequest._retry = true;
            
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (refreshToken) {
                try {
                    console.log("🔄 토큰 만료됨. 갱신 시도 중...");
                    
                    // adminApi를 사용하여 순수한 요청 보냄 (api 인스턴스 사용 시 무한 루프 위험)
                    const response = await adminApi.post('/users/token/refresh/', { 
                        refresh: refreshToken 
                    });
                    
                    const { access } = response.data;
                    
                    // 새 토큰 저장
                    localStorage.setItem('accessToken', access);
                    console.log("✅ 토큰 갱신 성공!");
                    
                    // 실패했던 원래 요청의 헤더를 새 토큰으로 교체하고 재요청
                    originalRequest.headers['Authorization'] = `Bearer ${access}`;
                    return api(originalRequest);
                    
                } catch (refreshError) {
                    console.error("❌ 토큰 갱신 실패 (완전 만료):", refreshError);
                    // 갱신 실패 시 로그아웃 처리
                    handleLogout();
                    return Promise.reject(refreshError);
                }
            } else {
                console.log("ℹ️ 리프레시 토큰이 없음. 로그아웃 처리.");
                handleLogout();
            }
        }
        
        return Promise.reject(error);
    }
);

// 로그아웃 헬퍼 함수
const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('bandicon_user');
    // alert("세션이 만료되었습니다. 다시 로그인해주세요.");
    // window.location.href = '/login'; 
    // 주의: window.location.reload() 등을 쓰면 무한 새로고침 될 수 있으니 프론트 상황에 맞춰 조정
};

// =================================================================
// 4. API 래퍼 함수들 (export)
// =================================================================

// [일반 API]
export const apiGet = async (url) => {
    try {
        const res = await api.get(url);
        return res.data;
    } catch (err) {
        // console.error(`GET ${url} Error`, err);
        throw err;
    }
};

export const apiPost = async (url, body, config = {}) => {
    try {
        const res = await api.post(url, body, config);
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const apiPostForm = async (url, formData) => {
    try {
        const res = await api.post(url, formData, {
            headers: { "Content-Type": "multipart/form-data" }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const apiPut = async (url, body) => {
    try {
        const res = await api.put(url, body);
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const apiDelete = async (url) => {
    try {
        const res = await api.delete(url);
        return res.data;
    } catch (err) {
        throw err;
    }
};

// [관리자 API] - 헤더에 X-Admin-Token 추가
export const adminGet = async (url) => {
    try {
        const res = await adminApi.get(url, {
            headers: { "X-Admin-Token": ADMIN_TOKEN }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const adminPost = async (url, body) => {
    try {
        const res = await adminApi.post(url, body || {}, {
            headers: { "X-Admin-Token": ADMIN_TOKEN }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const adminPostForm = async (url, formData) => {
    try {
        const res = await adminApi.post(url, formData, {
            headers: { 
                "Content-Type": "multipart/form-data",
                "X-Admin-Token": ADMIN_TOKEN
            }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const adminDelete = async (url) => {
    try {
        const res = await adminApi.delete(url, {
            headers: { "X-Admin-Token": ADMIN_TOKEN }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export const adminPut = async (url, body) => {
    try {
        const res = await adminApi.put(url, body || {}, {
            headers: { "X-Admin-Token": ADMIN_TOKEN }
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

export default api;