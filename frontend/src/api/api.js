import axios from "axios";

// =================================================================
// 1. 환경 변수 및 URL 설정
// =================================================================

// [중요] 배포된 Django 백엔드 주소를 여기에 정확히 입력하세요. (끝에 '/' 제외)
const DEPLOYED_BACKEND_URL = "https://bandicon_test.onrender.com";

// 개발 환경인지 확인
const isDevelopment = process.env.NODE_ENV === 'development';

// [수정] 다른 파일에서 사용할 수 있도록 export 추가
export const API_BASE_SERVER = isDevelopment ? "http://127.0.0.1:8000" : DEPLOYED_BACKEND_URL;

// [유지] 어드민 토큰
export const ADMIN_TOKEN = "abc123-VERY-LONG-RANDOM";

console.log(`🚀 API 모드: ${isDevelopment ? '개발(Local)' : '배포(Production)'}`);
console.log(`🔗 연결된 서버: ${API_BASE_SERVER}`);

// =================================================================
// 2. Axios 인스턴스 생성
// =================================================================

// (1) 일반 유저용 API 인스턴스
const api = axios.create({
    baseURL: `${API_BASE_SERVER}/api/v1`, // API_BASE_SERVER 사용
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// (2) 관리자/운영자용 API 인스턴스
const adminApi = axios.create({
    baseURL: `${API_BASE_SERVER}/api/v1`, // API_BASE_SERVER 사용
    headers: {
        'Content-Type': 'application/json',
    }
});

// =================================================================
// 3. 인터셉터 설정 (요청/응답 가로채기)
// =================================================================

// [요청 인터셉터] JWT 토큰 자동 주입
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

// [응답 인터셉터] 401 토큰 만료 시 자동 갱신
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러 + 재시도 아님 + 토큰 관련 요청 아님
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
                    
                    // adminApi를 사용하여 갱신 요청 (순환 참조 방지)
                    const response = await adminApi.post('/users/token/refresh/', { 
                        refresh: refreshToken 
                    });
                    
                    const { access } = response.data;
                    
                    localStorage.setItem('accessToken', access);
                    console.log("✅ 토큰 갱신 성공!");
                    
                    // 새 토큰으로 헤더 교체 후 재요청
                    originalRequest.headers['Authorization'] = `Bearer ${access}`;
                    return api(originalRequest);
                    
                } catch (refreshError) {
                    console.error("❌ 토큰 갱신 실패 (완전 만료):", refreshError);
                    handleLogout();
                    return Promise.reject(refreshError);
                }
            } else {
                console.log("ℹ️ 리프레시 토큰 없음. 로그아웃.");
                handleLogout();
            }
        }
        
        return Promise.reject(error);
    }
);

// 로그아웃 헬퍼
const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('bandicon_user');
    // window.location.href = '/login'; // 필요 시 주석 해제
};

// =================================================================
// 4. API 래퍼 함수들 (export)
// =================================================================

export const apiGet = async (url) => {
    try {
        const res = await api.get(url);
        return res.data;
    } catch (err) {
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

// [관리자 API]
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