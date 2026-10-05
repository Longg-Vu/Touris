import { NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';

/**
 * AdminLayout – Sidebar layout bọc ngoài tất cả trang Admin.
 * Render: Sidebar bên trái + Content bên phải.
 * Tự redirect về trang chủ nếu không phải Admin/Staff.
 */
function AdminLayout({ children, title }) {
  const { user, isAdmin, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  // Đang tải thông tin user → chưa biết quyền, chờ
  if (loading) return null;

  // Nếu không phải admin → redirect
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || 'Admin';

  const navItems = [
    { to: '/admin',          icon: '📊', label: 'Tổng quan',        end: true },
    { to: '/admin/tours',    icon: '🗺️', label: 'Quản lý Tour' },
    { to: '/admin/bookings', icon: '📋', label: 'Quản lý đơn đặt' },
    { to: '/admin/users',    icon: '👥', label: 'Quản lý người dùng' },
  ];

  return (
    <div className="admin-layout">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-logo">
            <span className="admin-sidebar-logo-icon">🌍</span>
            <div>
              <div className="admin-sidebar-logo-name">Tourism</div>
              <div className="admin-sidebar-logo-sub">Quản trị hệ thống</div>
            </div>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <div className="admin-sidebar-section-label">ĐIỀU HƯỚNG</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <span className="admin-sidebar-link-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-sidebar-user">
            <div className="admin-sidebar-user-avatar">
              {user?.avatar
                ? <img src={user.avatar} alt={displayName} />
                : displayName.slice(0, 2).toUpperCase()
              }
            </div>
            <div className="admin-sidebar-user-info">
              <div className="admin-sidebar-user-name">{displayName}</div>
              <div className="admin-sidebar-user-role">
                ⚡ Quản trị viên
              </div>
            </div>
          </div>
          <button
            className="admin-sidebar-back-btn"
            onClick={() => navigate('/')}
          >
            ← Về trang chủ
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────── */}
      <main className="admin-main">
        {title && (
          <div className="admin-main-header">
            <h1 className="admin-main-title">{title}</h1>
          </div>
        )}
        <div className="admin-main-body">
          {children}
        </div>
      </main>
    </div>
  );
}

export default AdminLayout;
