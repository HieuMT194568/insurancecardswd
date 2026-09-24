import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOKEN_KEY, USER_KEY, setUnauthorizedHandler } from '../api/client';
import { authApi } from '../api/services';

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (localStorage.getItem(TOKEN_KEY) ? readUser() : null));
  const navigate = useNavigate();

  /** Lưu phiên đăng nhập từ AuthResponse { accessToken, user }. */
  const saveSession = useCallback((auth) => {
    localStorage.setItem(TOKEN_KEY, auth.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
    setUser(auth.user);
  }, []);

  const login = useCallback(async (email, password) => {
    const auth = await authApi.login({ email, password });
    saveSession(auth);
    return auth.user;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  /** Cập nhật thông tin hiển thị (tên, SĐT) sau khi sửa hồ sơ. */
  const updateUser = useCallback((patch) => {
    setUser((prev) => {
      const next = { ...prev, ...patch };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      navigate('/login?expired=1', { replace: true });
    });
  }, [logout, navigate]);

  const value = useMemo(() => ({
    user,
    isStaff: user?.role === 'STAFF',
    isCustomer: user?.role === 'CUSTOMER',
    basePath: user?.role === 'STAFF' ? '/staff' : '/customer',
    login,
    logout,
    saveSession,
    updateUser,
  }), [user, login, logout, saveSession, updateUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
