import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';

// Public pages
import HomePage from './pages/public/HomePage';
import TourListPage from './pages/public/TourListPage';
import TourDetailPage from './pages/public/TourDetailPage';
import FavoritesPage from './pages/public/FavoritesPage';
import AboutPage from './pages/public/AboutPage';
import DestinationsPage from './pages/public/DestinationsPage';
import ContactPage from './pages/public/ContactPage';
import NotFoundPage from './pages/public/NotFoundPage';
import { FavoritesProvider } from './context/FavoritesContext';


// Customer pages
import ProfilePage from './pages/customer/ProfilePage';
import MyBookingsPage from './pages/customer/MyBookingsPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminToursPage from './pages/admin/AdminToursPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminConsultationsPage from './pages/admin/AdminConsultationsPage';
import AdminLiveChatPage from './pages/admin/AdminLiveChatPage';
import MiniChatWidget from './components/common/MiniChatWidget';

import './App.css';

// GOOGLE_CLIENT_ID – lấy từ biến môi trường hoặc fallback Client ID đã cấu hình
const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '392835893354-su3glrrmq6vjlncef8bigi24b2fqajm7.apps.googleusercontent.com';

/* Modal renderer – đặt trong AuthProvider để dùng useAuth */
function AuthModalRenderer() {
  const { modalOpen, modalDefaultTab } = useAuth();
  if (!modalOpen) return null;
  return <AuthModal defaultTab={modalDefaultTab} />;
}

/* Tự động bật modal đăng nhập/đăng ký khi vào route /login hoặc /register */
function AuthRouteWrapper({ defaultTab }) {
  const { openAuthModal } = useAuth();
  useEffect(() => {
    openAuthModal(defaultTab);
  }, [defaultTab]);
  return <HomePage />;
}

/* Wrapper trang Admin – kiểm tra quyền và chặn truy cập trái phép */
function AdminRoute({ element, adminOnly = false }) {
  const { isAdmin, canAccessAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>
        Đang kiểm tra quyền truy cập...
      </div>
    );
  }
  if (!canAccessAdmin) {
    return <Navigate to="/" replace />;
  }
  if (adminOnly && !isAdmin) {
    return <Navigate to="/admin" replace />;
  }
  return <>{element}</>;
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <FavoritesProvider>
          <Router>
          <Routes>
            {/* ── Admin Routes (không có Header/Footer chung) ── */}
            <Route path="/admin"               element={<AdminRoute element={<DashboardPage />} />} />
            <Route path="/admin/bookings"      element={<AdminRoute element={<AdminBookingsPage />} />} />
            <Route path="/admin/tours"         element={<AdminRoute element={<AdminToursPage />} />} />
            <Route path="/admin/consultations"  element={<AdminRoute element={<AdminConsultationsPage />} />} />
            <Route path="/admin/chats"         element={<AdminRoute element={<AdminLiveChatPage />} />} />
            <Route path="/admin/users"         element={<AdminRoute adminOnly element={<AdminUsersPage />} />} />

            {/* ── Mọi route khác dùng layout chung ─────────── */}
            <Route path="/*" element={
              <div className="app">
                <Header />
                <main className="main-content">
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/tours" element={<TourListPage />} />
                    <Route path="/tours/:id" element={<TourDetailPage />} />
                    <Route path="/destinations" element={<DestinationsPage />} />
                    <Route path="/favorites" element={<FavoritesPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />

                    {/* Auth Routes – tự động bật modal đăng nhập/đăng ký */}
                    <Route path="/login"    element={<AuthRouteWrapper defaultTab="login" />} />
                    <Route path="/register" element={<AuthRouteWrapper defaultTab="register" />} />

                    {/* Customer Routes */}
                    <Route path="/profile"     element={<ProfilePage />} />
                    <Route path="/my-bookings" element={<MyBookingsPage />} />

                    {/* 404 Not Found */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Routes>
                </main>
                <Footer />
                {/* Mini Live Chat & Trợ lý ảo cho khách hàng */}
                <MiniChatWidget />
                {/* Auth Modal – render ở đây để phủ lên toàn bộ trang */}
                <AuthModalRenderer />
              </div>
            } />
          </Routes>
        </Router>
        </FavoritesProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
