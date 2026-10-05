import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/services';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);

  /* ── Modal state ─────────────────────────── */
  const [modalOpen, setModalOpen]       = useState(false);
  const [modalDefaultTab, setModalDefaultTab] = useState('login');

  const openAuthModal = (tab = 'login') => {
    setModalDefaultTab(tab);
    setModalOpen(true);
  };
  const closeAuthModal = () => setModalOpen(false);

  /* ── Auto load user if token exists ─────── */
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data);
      return response.data;   // trả về để login() dùng
    } catch {
      localStorage.removeItem('access_token'); // Xóa token khi hết hạn
      localStorage.removeItem('refresh_token');
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ── Login (username + password) ────────── */
  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    const userData = await loadUser();   // loadUser đã gọi getProfile() và setUser()
    return { ...response, user: userData };
  };

  /* ── Google login ────────────────────────── */
  const googleLogin = async (credential) => {
    const response = await api.post('/auth/google/', { credential });
    const { tokens, user: userData } = response.data;
    localStorage.setItem('access_token', tokens.access);
    localStorage.setItem('refresh_token', tokens.refresh);
    setUser(userData);
    return response;
  };

  /* ── Register ────────────────────────────── */
  const register = async (userData) => {
    const response = await authAPI.register(userData);
    return response;
  };

  /* ── Logout ──────────────────────────────── */
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    googleLogin,
    isAuthenticated: !!user,
    isAdmin:   user?.is_superuser,
    isStaff:   user?.is_staff,
    /* modal */
    modalOpen,
    modalDefaultTab,
    openAuthModal,
    closeAuthModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
