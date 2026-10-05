import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI, bookingAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './ProfilePage.css';

/* ── helpers ─────────────────────────── */
const fmt = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

const STATUS_CFG = {
  pending:   { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fffbeb' },
  confirmed: { label: 'Đã xác nhận',  color: '#3b82f6', bg: '#eff6ff' },
  completed: { label: 'Hoàn thành',   color: '#10b981', bg: '#f0fdf4' },
  cancelled: { label: 'Đã huỷ',       color: '#ef4444', bg: '#fef2f2' },
};

/* ─────────────────────────────────────── */
function ProfilePage() {
  const { user: ctxUser, logout } = useAuth();
  const navigate = useNavigate();

  /* ── profile state ───────────────── */
  const [profile, setProfile]       = useState(null);
  const [loadingP, setLoadingP]     = useState(true);
  const [editMode, setEditMode]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveMsg, setSaveMsg]       = useState('');
  const [saveErr, setSaveErr]       = useState('');

  const [firstName, setFirstName]   = useState('');
  const [lastName, setLastName]     = useState('');
  const [phone, setPhone]           = useState('');

  /* ── password state ──────────────── */
  const [showPwForm, setShowPwForm] = useState(false);
  const [oldPw, setOldPw]           = useState('');
  const [newPw, setNewPw]           = useState('');
  const [newPw2, setNewPw2]         = useState('');
  const [pwSaving, setPwSaving]     = useState(false);
  const [pwMsg, setPwMsg]           = useState('');
  const [pwErr, setPwErr]           = useState('');

  /* ── booking summary state ───────── */
  const [bookings, setBookings]     = useState([]);
  const [loadingB, setLoadingB]     = useState(true);

  /* ── avatar state ────────────────── */
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [avatarUrl, setAvatarUrl]     = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarErr, setAvatarErr]     = useState('');

  /* ── fetch profile & bookings ─────── */
  useEffect(() => {
    if (!ctxUser) { navigate('/'); return; }

    authAPI.getProfile()
      .then(r => {
        setProfile(r.data);
        setFirstName(r.data.first_name || '');
        setLastName(r.data.last_name || '');
        setPhone(r.data.phone || '');
      })
      .catch(() => {})
      .finally(() => setLoadingP(false));

    bookingAPI.getAll()
      .then(r => {
        const data = r.data?.results ?? r.data ?? [];
        setBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => setLoadingB(false));
  }, [ctxUser, navigate]);

  /* ── save profile ────────────────── */
  const handleSaveProfile = async () => {
    setSaving(true); setSaveErr(''); setSaveMsg('');
    try {
      const res = await authAPI.updateProfile({
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        phone:      phone.trim(),
      });
      setProfile(res.data);
      setSaveMsg('✅ Lưu thông tin thành công!');
      setEditMode(false);
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})[0]
        || 'Lỗi khi lưu thông tin.';
      setSaveErr(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSaving(false);
    }
  };

  /* ── change password ─────────────── */
  const handleChangePw = async () => {
    if (!oldPw || !newPw || !newPw2) { setPwErr('Vui lòng điền đầy đủ thông tin.'); return; }
    if (newPw !== newPw2)            { setPwErr('Mật khẩu mới không khớp nhau.'); return; }
    setPwSaving(true); setPwErr(''); setPwMsg('');
    try {
      await authAPI.changePassword({ old_password: oldPw, new_password: newPw, new_password2: newPw2 });
      setPwMsg('✅ Đổi mật khẩu thành công!');
      setOldPw(''); setNewPw(''); setNewPw2('');
      setShowPwForm(false);
    } catch (err) {
      const msg = err.response?.data?.old_password
        || err.response?.data?.new_password
        || err.response?.data?.detail
        || 'Đổi mật khẩu thất bại.';
      setPwErr(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setPwSaving(false);
    }
  };

  /* ── upload avatar từ file máy tính (có nén ảnh) ── */
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setAvatarErr('Vui lòng chọn file ảnh (jpg, png, gif…)'); return; }
    if (file.size > 10 * 1024 * 1024)   { setAvatarErr('Ảnh không được vượt quá 10MB.'); return; }
    setAvatarErr('');

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      // Resize về tối đa 300×300 để base64 nhỏ gọn
      const MAX = 300;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else        { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }

      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);

      // Nén JPEG quality 75%
      const base64 = canvas.toDataURL('image/jpeg', 0.75);
      URL.revokeObjectURL(objectUrl);
      setAvatarPreview(base64);
      setAvatarUrl(base64);
    };
    img.onerror = () => { setAvatarErr('Không đọc được file ảnh. Vui lòng thử lại.'); URL.revokeObjectURL(objectUrl); };
    img.src = objectUrl;
  };

  /* ── lưu avatar ──────────────────────── */
  const handleSaveAvatar = async () => {
    const urlToSave = avatarUrl.trim();
    if (!urlToSave) { setAvatarErr('Vui lòng nhập URL hoặc chọn ảnh từ máy tính.'); return; }
    setAvatarSaving(true); setAvatarErr('');
    try {
      const res = await authAPI.updateProfile({ avatar: urlToSave });
      setProfile(res.data);
      setShowAvatarPicker(false);
      setAvatarUrl(''); setAvatarPreview('');
    } catch {
      setAvatarErr('Lưu ảnh đại diện thất bại. Vui lòng thử lại.');
    } finally {
      setAvatarSaving(false);
    }
  };

  /* ── derived ──────────────────────── */
  const stats = {
    total:     bookings.length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    spent:     bookings
                 .filter(b => ['confirmed', 'completed'].includes(b.status))
                 .reduce((s, b) => s + parseFloat(b.total_price || 0), 0),
  };

  const avatar   = profile?.avatar;
  const initials = ((profile?.first_name?.[0] || '') + (profile?.last_name?.[0] || '')).toUpperCase()
                   || profile?.username?.[0]?.toUpperCase() || '?';
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || profile?.username;

  /* ── render guards ─────────────── */
  if (loadingP) return (
    <div className="pp-page">
      <div className="pp-loading">
        <div className="pp-spinner" />
        <p>Đang tải hồ sơ…</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="pp-page" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h2>Phiên đăng nhập hết hạn</h2>
      <Link to="/" className="pp-btn-primary" style={{ display: 'inline-block', marginTop: 16 }}>
        Về trang chủ
      </Link>
    </div>
  );

  return (
    <div className="pp-page">

      {/* ── Hero ── */}
      <div className="pp-hero">
        <div className="pp-hero-inner">
          <nav className="pp-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span>›</span>
            <span>Hồ sơ cá nhân</span>
          </nav>
          <h1 className="pp-hero-title">👤 Hồ sơ cá nhân</h1>
          <p className="pp-hero-sub">Quản lý thông tin tài khoản và lịch sử đặt tour</p>
        </div>
      </div>

      <div className="pp-content">
        <div className="pp-grid">

          {/* ════ LEFT SIDEBAR ════ */}
          <aside className="pp-sidebar">

            {/* Avatar card */}
            <div className="pp-avatar-card">
              {/* Avatar + nút đổi */}
              <div className="pp-avatar-wrap">
                {(avatarPreview || profile?.avatar)
                  ? <img src={avatarPreview || profile.avatar} alt={fullName} className="pp-avatar-img" />
                  : <div className="pp-avatar-placeholder">{initials}</div>
                }
                <button
                  className="pp-avatar-edit-btn"
                  onClick={() => {
                    setShowAvatarPicker(v => !v);
                    setAvatarErr(''); setAvatarUrl(''); setAvatarPreview('');
                  }}
                  title="Đổi ảnh đại diện"
                >
                  📷
                </button>
              </div>

              {/* Form chọn ảnh */}
              {showAvatarPicker && (
                <div className="pp-avatar-picker">
                  {/* Upload từ máy */}
                  <label className="pp-avatar-upload-label">
                    📁 Chọn ảnh từ máy tính
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </label>

                  <div className="pp-avatar-divider">hoặc dán URL ảnh</div>

                  <input
                    className="pp-input"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                    onChange={e => { setAvatarUrl(e.target.value); setAvatarPreview(e.target.value); }}
                  />

                  {avatarErr && <div className="pp-avatar-err">{avatarErr}</div>}

                  <div className="pp-avatar-picker-actions">
                    <button
                      className="pp-btn-cancel"
                      style={{ fontSize: 13, padding: '8px 14px' }}
                      onClick={() => { setShowAvatarPicker(false); setAvatarPreview(''); setAvatarUrl(''); setAvatarErr(''); }}
                    >
                      Huỷ
                    </button>
                    <button
                      className="pp-btn-primary"
                      style={{ fontSize: 13, padding: '8px 14px' }}
                      onClick={handleSaveAvatar}
                      disabled={avatarSaving}
                    >
                      {avatarSaving ? 'Đang lưu…' : '✅ Lưu ảnh'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pp-name">{fullName}</div>
              <div className="pp-email">{profile.email}</div>
              {profile.is_superuser && (
                <span className="pp-role-badge pp-role-admin">👑 Quản trị viên</span>
              )}
              {!profile.is_superuser && profile.is_staff && (
                <span className="pp-role-badge pp-role-staff">🔧 Nhân viên</span>
              )}
              {!profile.is_staff && !profile.is_superuser && (
                <span className="pp-role-badge pp-role-customer">🧳 Khách hàng</span>
              )}
            </div>

            {/* Thống kê */}
            <div className="pp-stats-card">
              <h3 className="pp-stats-title">📊 Thống kê đặt tour</h3>
              {loadingB
                ? <div className="pp-stats-loading">Đang tải…</div>
                : (
                  <div className="pp-stats-grid">
                    <div className="pp-stat">
                      <div className="pp-stat-val">{stats.total}</div>
                      <div className="pp-stat-label">Tổng đơn</div>
                    </div>
                    <div className="pp-stat">
                      <div className="pp-stat-val" style={{ color: '#3b82f6' }}>{stats.confirmed}</div>
                      <div className="pp-stat-label">Đã xác nhận</div>
                    </div>
                    <div className="pp-stat">
                      <div className="pp-stat-val" style={{ color: '#10b981' }}>{stats.completed}</div>
                      <div className="pp-stat-label">Hoàn thành</div>
                    </div>
                    <div className="pp-stat">
                      <div className="pp-stat-val" style={{ color: '#ef4444' }}>{stats.cancelled}</div>
                      <div className="pp-stat-label">Đã huỷ</div>
                    </div>
                  </div>
                )
              }
              {!loadingB && stats.spent > 0 && (
                <div className="pp-total-spent">
                  💰 Tổng đã chi: <strong>{fmt(stats.spent)}</strong>
                </div>
              )}
              <Link to="/my-bookings" className="pp-btn-outline" style={{ marginTop: 16, display: 'block', textAlign: 'center' }}>
                Xem lịch sử đặt tour →
              </Link>
            </div>

            {/* Đăng xuất */}
            <button className="pp-btn-logout" onClick={() => { logout(); navigate('/'); }}>
              🚪 Đăng xuất
            </button>

          </aside>

          {/* ════ RIGHT MAIN ════ */}
          <main className="pp-main">

            {/* ── Thông tin cá nhân ── */}
            <div className="pp-card">
              <div className="pp-card-header">
                <h2 className="pp-card-title">📋 Thông tin cá nhân</h2>
                {!editMode && (
                  <button
                    className="pp-btn-edit"
                    onClick={() => { setEditMode(true); setSaveMsg(''); setSaveErr(''); }}
                  >
                    ✏️ Chỉnh sửa
                  </button>
                )}
              </div>

              {saveMsg && <div className="pp-alert pp-alert--success">{saveMsg}</div>}
              {saveErr && <div className="pp-alert pp-alert--error">{saveErr}</div>}

              <div className="pp-info-grid">
                <div className="pp-info-item">
                  <label className="pp-info-label">Tên đăng nhập</label>
                  <div className="pp-info-value pp-info-readonly">@{profile.username}</div>
                </div>
                <div className="pp-info-item">
                  <label className="pp-info-label">Email</label>
                  <div className="pp-info-value pp-info-readonly">{profile.email}</div>
                </div>
                <div className="pp-info-item">
                  <label className="pp-info-label">Họ *</label>
                  {editMode
                    ? <input
                        className="pp-input"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="Nguyễn"
                      />
                    : <div className="pp-info-value">{profile.first_name || '—'}</div>
                  }
                </div>
                <div className="pp-info-item">
                  <label className="pp-info-label">Tên *</label>
                  {editMode
                    ? <input
                        className="pp-input"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Văn A"
                      />
                    : <div className="pp-info-value">{profile.last_name || '—'}</div>
                  }
                </div>
                <div className="pp-info-item pp-info-item--full">
                  <label className="pp-info-label">Số điện thoại</label>
                  {editMode
                    ? <input
                        className="pp-input"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="0901234567"
                      />
                    : <div className="pp-info-value">{profile.phone || '—'}</div>
                  }
                </div>
              </div>

              {editMode && (
                <div className="pp-form-actions">
                  <button
                    className="pp-btn-cancel"
                    onClick={() => {
                      setEditMode(false);
                      setFirstName(profile.first_name || '');
                      setLastName(profile.last_name || '');
                      setPhone(profile.phone || '');
                      setSaveErr('');
                    }}
                  >
                    Huỷ
                  </button>
                  <button className="pp-btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? 'Đang lưu…' : '💾 Lưu thay đổi'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Đổi mật khẩu ── */}
            <div className="pp-card">
              <div className="pp-card-header">
                <h2 className="pp-card-title">🔒 Đổi mật khẩu</h2>
                {!showPwForm && (
                  <button
                    className="pp-btn-edit"
                    onClick={() => { setShowPwForm(true); setPwErr(''); setPwMsg(''); }}
                  >
                    Thay đổi
                  </button>
                )}
              </div>

              {pwMsg && <div className="pp-alert pp-alert--success">{pwMsg}</div>}
              {pwErr && <div className="pp-alert pp-alert--error">{pwErr}</div>}

              {!showPwForm
                ? (
                  <p className="pp-pw-hint">
                    🔐 Mật khẩu của bạn được mã hoá an toàn. Bấm <strong>Thay đổi</strong> để cập nhật mật khẩu mới.
                  </p>
                )
                : (
                  <div className="pp-pw-form">
                    <div className="pp-info-item pp-info-item--full">
                      <label className="pp-info-label">Mật khẩu hiện tại *</label>
                      <input
                        id="pp-old-pw"
                        type="password"
                        className="pp-input"
                        value={oldPw}
                        onChange={e => setOldPw(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                      />
                    </div>
                    <div className="pp-info-item pp-info-item--full">
                      <label className="pp-info-label">Mật khẩu mới *</label>
                      <input
                        id="pp-new-pw"
                        type="password"
                        className="pp-input"
                        value={newPw}
                        onChange={e => setNewPw(e.target.value)}
                        placeholder="Tối thiểu 8 ký tự"
                      />
                    </div>
                    <div className="pp-info-item pp-info-item--full">
                      <label className="pp-info-label">Xác nhận mật khẩu mới *</label>
                      <input
                        id="pp-new-pw2"
                        type="password"
                        className="pp-input"
                        value={newPw2}
                        onChange={e => setNewPw2(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                      />
                    </div>
                    <div className="pp-form-actions">
                      <button
                        className="pp-btn-cancel"
                        onClick={() => {
                          setShowPwForm(false);
                          setOldPw(''); setNewPw(''); setNewPw2('');
                          setPwErr('');
                        }}
                      >
                        Huỷ
                      </button>
                      <button className="pp-btn-primary" onClick={handleChangePw} disabled={pwSaving}>
                        {pwSaving ? 'Đang lưu…' : '🔑 Đổi mật khẩu'}
                      </button>
                    </div>
                  </div>
                )
              }
            </div>

            {/* ── Đặt tour gần đây ── */}
            {!loadingB && bookings.length > 0 && (
              <div className="pp-card">
                <div className="pp-card-header">
                  <h2 className="pp-card-title">🎫 Đặt tour gần đây</h2>
                  <Link to="/my-bookings" className="pp-btn-edit">Xem tất cả →</Link>
                </div>
                <div className="pp-recent-bookings">
                  {bookings.slice(0, 3).map(b => {
                    const sc = STATUS_CFG[b.status] || STATUS_CFG.pending;
                    return (
                      <div key={b.id} className="pp-booking-row">
                        <img
                          src={b.tour_thumbnail}
                          alt={b.tour_title}
                          className="pp-booking-thumb"
                          onError={e => { e.target.src = 'https://via.placeholder.com/60x60?text=Tour'; }}
                        />
                        <div className="pp-booking-info">
                          <div className="pp-booking-name">{b.tour_title || `Tour #${b.tour}`}</div>
                          <div className="pp-booking-meta">
                            📅 {b.travel_date} &nbsp;·&nbsp; 💰 {fmt(b.total_price)}
                          </div>
                        </div>
                        <span
                          className="pp-booking-status"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {sc.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
