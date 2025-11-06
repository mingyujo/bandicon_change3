// [전체 코드] src/api/api.js
/*import axios from "axios";

// 👇 [최종 수정] 이 부분을 아래 코드로 교체해주세요.
// -------------------------------------------------------------------
// React의 환경 변수(NODE_ENV)를 사용하여 개발/배포 서버 주소를 자동으로 선택합니다.
export const API_BASE = process.env.NODE_ENV === 'development'
    ? "http://127.0.0.1:8000" // 개발 모드일 때 (npm start)
    : "https://bandicon-project.onrender.com"; // 배포 모드일 때 (npm run build)
// -------------------------------------------------------------------

export const ADMIN_TOKEN = "abc123-VERY-LONG-RANDOM";

// ---------- 공용 요청 ----------
export const apiGet = async (url) => {
  try {
    const res = await axios.get(`${API_BASE}${url}`);
    return res.data;
  } catch (err) {
    console.error(`GET ${url} 에러:`, err);
    throw err;
  }
};

export const apiPost = async (url, body, config) => {
  try {
    // [수정] body가 FormData인 경우 Content-Type을 자동으로 설정하도록 합니다.
    const headers = body instanceof FormData ? {} : { "Content-Type": "application/json" };
    const res = await axios.post(`${API_BASE}${url}`, body, { headers, ...config });
    return res.data;
  } catch (err) {
    console.error(`POST ${url} 에러:`, err);
    throw err;
  }
};

export const apiPostForm = async (url, formData) => {
  try {
    const headers = { "Content-Type": "multipart/form-data" };
    const res = await axios.post(`${API_BASE}${url}`, formData, { headers });
    return res.data;
  } catch (err) {
    console.error(`POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const apiPut = async (url, body) => {
  try {
    const headers = { "Content-Type": "application/json" };
    const res = await axios.put(`${API_BASE}${url}`, body, { headers });
    return res.data;
  } catch (err) {
    console.error(`PUT ${url} 에러:`, err);
    throw err;
  }
};

  // 수정 코드
export const apiDelete = async (url, config) => {
  try {
    const res = await axios.delete(`${API_BASE}${url}`, config);
    return res.data;
  } catch (err) {
    console.error(`DELETE ${url} 에러:`, err);
    throw err;
  }
};

// ---------- 운영자 전용 요청 (관리자 토큰 자동 첨부) ----------
export const adminGet = async (url) => {
  try {
    const res = await axios.get(`${API_BASE}${url}`, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN GET ${url} 에러:`, err);
    throw err;
  }
};

export const adminPost = async (url, body) => {
  try {
    const res = await axios.post(`${API_BASE}${url}`, body ?? {}, {
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST ${url} 에러:`, err);
    throw err;
  }
};

export const adminPostForm = async (url, formData) => {
  try {
    const res = await axios.post(`${API_BASE}${url}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const adminDelete = async (url) => {
  try {
    const res = await axios.delete(`${API_BASE}${url}`, {
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN DELETE ${url} 에러:`, err);
    throw err;
  }
};

export const adminPut = async (url, body) => {
  try {
    const res = await axios.put(`${API_BASE}${url}`, body || {}, {
      headers: { 
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN 
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN PUT ${url} 에러:`, err);
    throw err;
  }
};*/
// [전체 코드] src/api/api.js (70단계 수정 완료)
import axios from "axios";

// 1. [유지] API 서버의 기본 주소 (예: "http://127.0.0.1:8000")
//    (React의 환경 변수를 사용하여 개발/배포 서버 주소를 자동으로 선택)
export const API_BASE_SERVER = process.env.NODE_ENV === 'development'
    ? "http://127.0.0.1:8000" // 개발 모드일 때 (npm start)
    : "https://bandicon-project.onrender.com"; // 배포 모드일 때 (npm run build)

// [유지] 어드민 토큰
export const ADMIN_TOKEN = "abc123-VERY-LONG-RANDOM"; // (기존 코드 유지)

// 2. [★신규★] Django API용 Axios 인스턴스 생성
//    모든 요청의 기본 URL에 /api/v1을 자동으로 추가합니다.
const api = axios.create({
    baseURL: `${API_BASE_SERVER}/api/v1`, // [!] Django의 API 경로
    headers: {
        'Content-Type': 'application/json',
    }
});

// 3. [★신규★] 요청 인터셉터 (JWT 토큰 자동 주입)
//    localStorage에 'accessToken'이 있으면, 모든 요청에 'Authorization' 헤더를 추가합니다.
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

// 4. [★신규★] 어드민 전용 Axios 인스턴스
//    (어드민 요청은 JWT 토큰이 필요 없으므로 인터셉터가 없는 별도 인스턴스 사용)
const adminApi = axios.create({
    baseURL: `${API_BASE_SERVER}/api/v1`, // [!] Django의 API 경로
});


// ---------- [수정] 공용 요청 (axios -> api 인스턴스 사용) ----------
//    (API_BASE 대신 baseURL이 적용되므로 URL이 /로 시작하지 않아도 됩니다)
export const apiGet = async (url) => {
  try {
    const res = await api.get(url); // [!] axios.get -> api.get
    return res.data;
  } catch (err) {
    console.error(`GET ${url} 에러:`, err);
    throw err;
  }
};

export const apiPost = async (url, body, config) => {
  try {
    const headers = body instanceof FormData ? {} : { "Content-Type": "application/json" };
    const res = await api.post(url, body, { headers, ...config }); // [!] axios.post -> api.post
    return res.data;
  } catch (err) {
    console.error(`POST ${url} 에러:`, err);
    throw err;
  }
};

export const apiPostForm = async (url, formData) => {
  try {
    const headers = { "Content-Type": "multipart/form-data" };
    const res = await api.post(url, formData, { headers }); // [!] axios.post -> api.post
    return res.data;
  } catch (err) {
    console.error(`POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const apiPut = async (url, body) => {
  try {
    const headers = { "Content-Type": "application/json" };
    const res = await api.put(url, body, { headers }); // [!] axios.put -> api.put
    return res.data;
  } catch (err) {
    console.error(`PUT ${url} 에러:`, err);
    throw err;
  }
};

export const apiDelete = async (url, config) => {
  try {
    const res = await api.delete(url, config); // [!] axios.delete -> api.delete
    return res.data;
  } catch (err) {
    console.error(`DELETE ${url} 에러:`, err);
    throw err;
  }
};

// ---------- [수정] 운영자 전용 요청 (axios -> adminApi 인스턴스 사용) ----------
export const adminGet = async (url) => {
  try {
    const res = await adminApi.get(url, { // [!] axios.get -> adminApi.get
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN GET ${url} 에러:`, err);
    throw err;
  }
};

export const adminPost = async (url, body) => {
  try {
    const res = await adminApi.post(url, body ?? {}, { // [!] axios.post -> adminApi.post
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST ${url} 에러:`, err);
    throw err;
  }
};

export const adminPostForm = async (url, formData) => {
  try {
    const res = await adminApi.post(url, formData, { // [!] axios.post -> adminApi.post
      headers: {
        "Content-Type": "multipart/form-data",
        "X-Admin-Token": ADMIN_TOKEN,
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN POST FORM ${url} 에러:`, err);
    throw err;
  }
};

export const adminDelete = async (url) => {
  try {
    const res = await adminApi.delete(url, { // [!] axios.delete -> adminApi.delete
      headers: { "X-Admin-Token": ADMIN_TOKEN },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN DELETE ${url} 에러:`, err);
    throw err;
  }
};

export const adminPut = async (url, body) => {
  try {
    const res = await adminApi.put(url, body || {}, { // [!] axios.put -> adminApi.put
      headers: { 
        "Content-Type": "application/json",
        "X-Admin-Token": ADMIN_TOKEN 
      },
    });
    return res.data;
  } catch (err) {
    console.error(`ADMIN PUT ${url} 에러:`, err);
    throw err;
  }
};

// 4-1. [★신규★] 응답 인터셉터 (401 에러 처리)
/*api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // 401 에러이고, 재시도하지 않은 요청인 경우
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // refreshToken으로 토큰 갱신 시도
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          const response = await axios.post(
            `${API_BASE_SERVER}/api/v1/users/token/refresh/`,
            { refresh: refreshToken }
          );
          
          const { access } = response.data;
          localStorage.setItem('accessToken', access);
          
          // 원래 요청을 새 토큰으로 재시도
          originalRequest.headers['Authorization'] = `Bearer ${access}`;
          return api(originalRequest);
          
        } catch (refreshError) {
          // 리프레시도 실패하면 로그아웃
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('bandicon_user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
      
      // refreshToken이 없으면 로그인 페이지로
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);*/

// src/api/api.js에서 수정

// API 호출 시 끝에 슬래시(/)를 일관성 있게 처리
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // URL 끝에 슬래시가 없으면 추가 (301 리다이렉트 방지)
    if (config.url && !config.url.endsWith('/') && !config.url.includes('?')) {
      config.url += '/';
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);