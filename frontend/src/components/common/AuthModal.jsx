import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import './AuthModal.css';

/* ── helpers ─────────────────────────────────────── */
const TRAVEL_IMAGE =
  'https://images.unsplash.com/photo-1528127269322-539801943592?w=800&q=85';
const HAS_GOOGLE_CLIENT_ID = Boolean(
  (import.meta.env.VITE_GOOGLE_CLIENT_ID || '392835893354-su3glrrmq6vjlncef8bigi24b2fqajm7.apps.googleusercontent.com').trim()
);

/* ── main component ──────────────────────────────── */
export default function AuthModal({ defaultTab = 'login' }) {
  const { closeAuthModal, login, register, googleLogin } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]               = useState(defaultTab); // 'login' | 'register'
  const [loading, setLoading]       = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /* login form */
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showLoginPw, setShowLoginPw] = useState(false);

  /* register form */
  const [regForm, setRegForm] = useState({
    first_name: '', last_name: '', username: '',
    email: '', phone: '', password: '', password2: '',
  });
  const [showRegPw, setShowRegPw]   = useState(false);
  const [showRegPw2, setShowRegPw2] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  /* Close on Escape */
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') closeAuthModal();
  }, [closeAuthModal]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  /* reset errors when tab changes */
  const switchTab = (t) => {
    setTab(t);
    setGlobalError('');
    setSuccessMsg('');
    setFieldErrors({});
  };

  /* ── Login submit ─────────────────────────── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setGlobalError('');
    if (!loginForm.username || !loginForm.password) {
      setGlobalError('Vui lòng điền đầy đủ thông tin.');
      return;
    }
    setLoading(true);
    try {
      const res = await login(loginForm);
      closeAuthModal();
      // Redirect Admin/Staff thẳng vào trang quản trị
      const userData = res?.data?.user ?? res?.user;
      if (userData?.is_superuser || userData?.is_staff) {
        navigate('/admin');
      }
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setGlobalError(detail || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Register submit ──────────────────────── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setFieldErrors({});

    if (!agreedTerms) {
      setGlobalError('Bạn cần đồng ý với Điều khoản sử dụng.');
      return;
    }

    setLoading(true);
    try {
      await register(regForm);
      setSuccessMsg('Đăng ký thành công! Đang đăng nhập…');
      setTimeout(() => {
        login({ username: regForm.username, password: regForm.password })
          .then(() => closeAuthModal())
          .catch(() => switchTab('login'));
      }, 800);
    } catch (err) {
      const data = err?.response?.data;
      if (data && typeof data === 'object') {
        /* field-level errors */
        const fe = {};
        Object.entries(data).forEach(([k, v]) => {
          fe[k] = Array.isArray(v) ? v[0] : String(v);
        });
        setFieldErrors(fe);
        setGlobalError('Vui lòng kiểm tra lại thông tin.');
      } else {
        setGlobalError('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Sign-In ───────────────────────── */
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setGlobalError('');
    try {
      const res = await googleLogin(credentialResponse.credential);
      closeAuthModal();
      // Redirect Admin/Staff thẳng vào trang quản trị
      const userData = res?.data?.user ?? res?.user;
      if (userData?.is_superuser || userData?.is_staff) {
        navigate('/admin');
      }
    } catch (err) {
      const errMsg = err?.response?.data?.error || err?.response?.data?.detail;
      setGlobalError(errMsg || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setGlobalError('Đăng nhập Google thất bại.');
  };

  /* ─────────────────────────────────────────── */
  return (
    <div className="auth-overlay" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="auth-overlay__backdrop" onClick={closeAuthModal} />

      <div className="auth-modal">
        {/* ── Close ── */}
        <button className="auth-modal__close" onClick={closeAuthModal} aria-label="Đóng">✕</button>

        {/* ══ LEFT – Image panel ══ */}
        <div className="auth-panel-image">
          <img src={TRAVEL_IMAGE} alt="Du lịch" className="auth-panel-image__img" />
          <div className="auth-panel-image__overlay">
            <div className="auth-panel-image__logo">🌍 Tourism</div>
            <div className="auth-panel-image__text">
              <p className="auth-panel-image__quote">Khám phá vẻ đẹp Việt Nam cùng chúng tôi</p>
              <p className="auth-panel-image__sub">Hàng trăm chuyến đi tuyệt vời đang chờ đón bạn.</p>
            </div>
          </div>
        </div>

        {/* ══ RIGHT – Form panel ══ */}
        <div className="auth-panel-form">
          {/* Tabs */}
          <div className="auth-tabs" role="tablist">
            <button
              role="tab"
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => switchTab('login')}
            >Đăng nhập</button>
            <button
              role="tab"
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => switchTab('register')}
            >Đăng ký</button>
          </div>

          {/* ── Alerts ── */}
          {globalError && (
            <div className="auth-alert auth-alert--error">⚠️ {globalError}</div>
          )}
          {successMsg && (
            <div className="auth-alert auth-alert--success">✅ {successMsg}</div>
          )}

          {/* ══════════ LOGIN FORM ══════════ */}
          {tab === 'login' && (
            <>
              <h2 className="auth-heading">Chào mừng trở lại! 👋</h2>
              <p className="auth-subheading">Đăng nhập để tiếp tục khám phá</p>

              {/* Google */}
              <div style={{ marginBottom: 16 }}>
                {HAS_GOOGLE_CLIENT_ID ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signin_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    width="100%"
                    locale="vi"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setGlobalError('Vui lòng điền mã GOOGLE_CLIENT_ID vào file frontend/.env và backend/.env rồi khởi động lại server.')}
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: 6,
                      border: '1px solid #dadce0', background: '#fff', color: '#3c4043',
                      fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
                    <span>Đăng nhập bằng Google</span>
                  </button>
                )}
              </div>

              <div className="auth-divider">hoặc đăng nhập bằng email</div>

              <form onSubmit={handleLogin} noValidate>
                {/* Username */}
                <div className="auth-field">
                  <label htmlFor="login-username">📧 Email hoặc tên đăng nhập</label>
                  <div className="auth-input-wrap">
                    <input
                      id="login-username"
                      type="text"
                      placeholder="Nhập email hoặc username"
                      value={loginForm.username}
                      onChange={e => setLoginForm(f => ({ ...f, username: e.target.value }))}
                      autoComplete="username"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="auth-field">
                  <label htmlFor="login-password">🔒 Mật khẩu</label>
                  <div className="auth-input-wrap">
                    <input
                      id="login-password"
                      type={showLoginPw ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="toggle-pw"
                      onClick={() => setShowLoginPw(v => !v)}
                      aria-label="Hiện/ẩn mật khẩu"
                    >{showLoginPw ? '🙈' : '👁️'}</button>
                  </div>
                </div>

                <div className="auth-forgot">
                  <a href="#forgot">Quên mật khẩu?</a>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  id="auth-login-submit"
                  disabled={loading}
                >
                  {loading ? <span className="auth-spinner" /> : '🔑 Đăng nhập ngay'}
                </button>
              </form>

              <p className="auth-switch">
                Chưa có tài khoản?
                <button onClick={() => switchTab('register')}>Đăng ký ngay</button>
              </p>
            </>
          )}

          {/* ══════════ REGISTER FORM ══════════ */}
          {tab === 'register' && (
            <>
              <h2 className="auth-heading">Tạo tài khoản mới ✨</h2>
              <p className="auth-subheading">Tham gia cùng hàng nghìn du khách</p>

              {/* Google */}
              <div style={{ marginBottom: 16 }}>
                {HAS_GOOGLE_CLIENT_ID ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    text="signup_with"
                    shape="rectangular"
                    theme="outline"
                    size="large"
                    width="100%"
                    locale="vi"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setGlobalError('Vui lòng điền mã GOOGLE_CLIENT_ID vào file frontend/.env và backend/.env rồi khởi động lại server.')}
                    style={{
                      width: '100%', padding: '10px 16px', borderRadius: 6,
                      border: '1px solid #dadce0', background: '#fff', color: '#3c4043',
                      fontSize: 14, fontWeight: 500, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10
                    }}
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" height="18" />
                    <span>Đăng ký bằng Google</span>
                  </button>
                )}
              </div>

              <div className="auth-divider">hoặc đăng ký bằng email</div>

              <form onSubmit={handleRegister} noValidate>
                {/* Full name row */}
                <div className="auth-fields-row">
                  <div className="auth-field">
                    <label htmlFor="reg-first">👤 Họ</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-first"
                        type="text"
                        placeholder="Họ"
                        value={regForm.first_name}
                        onChange={e => setRegForm(f => ({ ...f, first_name: e.target.value }))}
                        className={fieldErrors.first_name ? 'error' : ''}
                      />
                    </div>
                    {fieldErrors.first_name && <div className="auth-field-error">⚠ {fieldErrors.first_name}</div>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-last">Tên</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-last"
                        type="text"
                        placeholder="Tên"
                        value={regForm.last_name}
                        onChange={e => setRegForm(f => ({ ...f, last_name: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                {/* Username */}
                <div className="auth-field">
                  <label htmlFor="reg-username">🏷️ Tên đăng nhập</label>
                  <div className="auth-input-wrap">
                    <input
                      id="reg-username"
                      type="text"
                      placeholder="Chọn username (không dấu)"
                      value={regForm.username}
                      onChange={e => setRegForm(f => ({ ...f, username: e.target.value }))}
                      className={fieldErrors.username ? 'error' : ''}
                    />
                  </div>
                  {fieldErrors.username && <div className="auth-field-error">⚠ {fieldErrors.username}</div>}
                </div>

                {/* Email */}
                <div className="auth-field">
                  <label htmlFor="reg-email">📧 Email</label>
                  <div className="auth-input-wrap">
                    <input
                      id="reg-email"
                      type="email"
                      placeholder="example@email.com"
                      value={regForm.email}
                      onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                      className={fieldErrors.email ? 'error' : ''}
                    />
                  </div>
                  {fieldErrors.email && <div className="auth-field-error">⚠ {fieldErrors.email}</div>}
                </div>

                {/* Phone */}
                <div className="auth-field">
                  <label htmlFor="reg-phone">📱 Số điện thoại</label>
                  <div className="auth-input-wrap">
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="0912 345 678"
                      value={regForm.phone}
                      onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Password row */}
                <div className="auth-fields-row">
                  <div className="auth-field">
                    <label htmlFor="reg-pw">🔒 Mật khẩu</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-pw"
                        type={showRegPw ? 'text' : 'password'}
                        placeholder="≥ 8 ký tự"
                        value={regForm.password}
                        onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                        className={fieldErrors.password ? 'error' : ''}
                      />
                      <button type="button" className="toggle-pw" onClick={() => setShowRegPw(v => !v)}>
                        {showRegPw ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {fieldErrors.password && <div className="auth-field-error">⚠ {fieldErrors.password}</div>}
                  </div>
                  <div className="auth-field">
                    <label htmlFor="reg-pw2">🔒 Xác nhận</label>
                    <div className="auth-input-wrap">
                      <input
                        id="reg-pw2"
                        type={showRegPw2 ? 'text' : 'password'}
                        placeholder="Nhập lại MK"
                        value={regForm.password2}
                        onChange={e => setRegForm(f => ({ ...f, password2: e.target.value }))}
                        className={regForm.password2 && regForm.password !== regForm.password2 ? 'error' : ''}
                      />
                      <button type="button" className="toggle-pw" onClick={() => setShowRegPw2(v => !v)}>
                        {showRegPw2 ? '🙈' : '👁️'}
                      </button>
                    </div>
                    {regForm.password2 && regForm.password !== regForm.password2 && (
                      <div className="auth-field-error">⚠ Mật khẩu không khớp</div>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="auth-checkbox-row">
                  <input
                    type="checkbox"
                    id="auth-terms"
                    checked={agreedTerms}
                    onChange={e => setAgreedTerms(e.target.checked)}
                  />
                  <span>
                    Tôi đồng ý với <a href="#terms">Điều khoản sử dụng</a> và{' '}
                    <a href="#privacy">Chính sách bảo mật</a>
                  </span>
                </div>

                <button
                  type="submit"
                  className="auth-submit-btn"
                  id="auth-register-submit"
                  disabled={loading}
                >
                  {loading ? <span className="auth-spinner" /> : '📝 Tạo tài khoản'}
                </button>
              </form>

              <p className="auth-switch">
                Đã có tài khoản?
                <button onClick={() => switchTab('login')}>Đăng nhập</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
