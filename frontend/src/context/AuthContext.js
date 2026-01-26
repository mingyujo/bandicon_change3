// frontend/src/context/AuthContext.js
// [오류 수정] useAuth를 App.js에서 분리하여 순환 참조 문제 해결

import { createContext, useContext } from 'react';

// 1. AuthContext를 export
export const AuthContext = createContext(null);

// 2. useAuth hook을 export
export const useAuth = () => useContext(AuthContext);