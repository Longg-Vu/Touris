import { useState, useRef, useEffect } from 'react';
import './Header.css';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Header() {
  const { user, isAuthenticated, logout, isAdmin, isStaff, openAuthModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  /* Close dropdown khi click ra ngoài */
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.username || '';
  const initials = displayName.slice(0, 2).toUpperCase() || 'KH';

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          🌍 Tourism
        </Link>

        <nav className="header-nav">
          <Link to="/">Trang chủ</Link>
          <Link to="/tours">Tour du lịch</Link>
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <div className="header-user" ref={dropdownRef}>
              <button
                className="header-avatar-btn"
                onClick={() => setDropdownOpen(v => !v)}
                aria-label="Menu tài khoản"
              >
                {user?.avatar
                  ? <img src={user.avatar} alt={displayName} className="header-avatar-img" />
                  : <span className="header-avatar-initials">{initials}</span>
                }
                <span className="header-username">{displayName}</span>
                <span className="header-chevron">{dropdownOpen ? '▲' : '▼'}</span>
              </button>

              {dropdownOpen && (
                <div className="header-dropdown">
                  <div className="header-dropdown-user">
                    <div className="header-dropdown-name">{displayName}</div>
                    <div className="header-dropdown-email">{user?.email}</div>
                  </div>
                  <div className="header-dropdown-divider" />
                  {isAdmin && (
                    <Link to="/admin" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      ⚙️ Quản trị hệ thống
                    </Link>
                  )}
                  <Link to="/profile" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    👤 Trang cá nhân
                  </Link>
                  <Link to="/my-bookings" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    🎫 Đơn đặt của tôi
                  </Link>
                  <div className="header-dropdown-divider" />
                  <button
                    className="header-dropdown-item header-dropdown-logout"
                    onClick={() => { logout(); setDropdownOpen(false); }}
                  >
                    🚪 Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                id="header-btn-login"
                className="btn-login"
                onClick={() => openAuthModal('login')}
              >
                Đăng nhập
              </button>
              <button
                id="header-btn-register"
                className="btn-register"
                onClick={() => openAuthModal('register')}
              >
                Đăng ký
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;

