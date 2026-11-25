import { useState, useRef, useEffect } from 'react';
import './Header.css';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';

function Header() {
  const { user, isAuthenticated, logout, isAdmin, isStaff, canAccessAdmin, openAuthModal } = useAuth();
  const { favoritesCount } = useFavorites();
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
          <NavLink to="/" end>Trang chủ</NavLink>
          <NavLink to="/tours">Tour du lịch</NavLink>
          <NavLink to="/destinations">Điểm đến</NavLink>
          <NavLink to="/favorites" className="header-nav-fav" title="Xem danh sách tour yêu thích">
            <span>Yêu thích</span>
            {favoritesCount > 0 && (
              <span className="header-fav-badge" id="header-fav-badge">{favoritesCount}</span>
            )}
          </NavLink>
          <NavLink to="/about">Về chúng tôi</NavLink>
          <NavLink to="/contact">Liên hệ</NavLink>
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
                  ? <img src={user.avatar} alt={displayName} className="header-avatar-img" referrerPolicy="no-referrer" />
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
                  {canAccessAdmin && (
                    <Link to="/admin" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                      {isAdmin ? '⚙️ Quản trị hệ thống' : '🎒 Quản lý tour (HDV)'}
                    </Link>
                  )}
                  <Link to="/profile" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    👤 Trang cá nhân
                  </Link>
                  <Link to="/my-bookings" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    🎫 Đơn đặt của tôi
                  </Link>
                  <Link to="/favorites" className="header-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    ❤️ Tour yêu thích ({favoritesCount})
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

