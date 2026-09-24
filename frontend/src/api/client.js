import axios from 'axios';

export const TOKEN_KEY = 'ic_token';
export const USER_KEY = 'ic_user';

const client = axios.create({
  baseURL: '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Callback khi phiên đăng nhập hết hạn (AuthContext đăng ký). */
let onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 401 && !url.startsWith('/auth/') && localStorage.getItem(TOKEN_KEY)) {
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export default client;
