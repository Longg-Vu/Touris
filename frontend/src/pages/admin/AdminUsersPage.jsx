import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminUserAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './AdminUsersPage.css';

/* ─── Modal Thêm / Sửa Người dùng ────────────────────────── */
function UserFormModal({ user, onClose, onSaved }) {
  const isEdit = Boolean(user && user.id);
  const [form, setForm] = useState(
    isEdit
      ? {
          username:   user.username || '',
          email:      user.email || '',
          first_name: user.first_name || '',
          last_name:  user.last_name || '',
          phone:      user.phone || '',
          role:       user.role || 'customer',
          is_active:  user.is_active ?? true,
        }
      : {
          username:   '',
          password:   '',
          email:      '',
          first_name: '',
          last_name:  '',
          phone:      '',
          role:       'customer',
          is_active:  true,
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const setVal = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  // Tạo mật khẩu ngẫu nhiên tiện lợi
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVal('password', pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEdit && !form.username.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      return;
    }
    if (!isEdit && (!form.password || form.password.length < 6)) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await adminUserAPI.update(user.id, {
          first_name: form.first_name,
          last_name:  form.last_name,
          email:      form.email,
          phone:      form.phone,
          role:       form.role,
          is_active:  form.is_active,
        });
      } else {
        await adminUserAPI.create(form);
      }
      onSaved(isEdit ? 'Cập nhật tài khoản thành công!' : 'Tạo tài khoản mới thành công!');
      onClose();
    } catch (err) {
      const resp = err?.response?.data;
      if (typeof resp === 'object') {
        const msg = Object.entries(resp)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(' ') : v}`)
          .join(' | ');
        setError(msg || 'Có lỗi xảy ra khi lưu người dùng.');
      } else {
        setError('Có lỗi xảy ra khi kết nối máy chủ.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aup-modal-overlay" onClick={onClose}>
      <div className="aup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="aup-modal-header">
          <h3>
            <span>{isEdit ? '✏️' : '➕'}</span>
            {isEdit ? `Chỉnh sửa: ${user.username}` : 'Thêm người dùng mới'}
          </h3>
          <button className="aup-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="aup-modal-body">
            {error && <div className="aup-alert error">{error}</div>}

            <div className="aup-form-row">
              <div className="aup-form-group">
                <label>Tên đăng nhập <span className="req">*</span></label>
                <input
                  type="text"
                  className="aup-input"
                  value={form.username}
                  onChange={(e) => setVal('username', e.target.value)}
                  placeholder="ví dụ: nguyenvana"
                  disabled={isEdit}
                  required
                />
              </div>

              {!isEdit && (
                <div className="aup-form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Mật khẩu khởi tạo <span className="req">*</span></label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                    >
                      🎲 Tự động tạo
                    </button>
                  </div>
                  <input
                    type="text"
                    className="aup-input"
                    value={form.password}
                    onChange={(e) => setVal('password', e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
              )}
            </div>

            <div className="aup-form-row">
              <div className="aup-form-group">
                <label>Họ đệm</label>
                <input
                  type="text"
                  className="aup-input"
                  value={form.last_name}
                  onChange={(e) => setVal('last_name', e.target.value)}
                  placeholder="ví dụ: Nguyễn Văn"
                />
              </div>

              <div className="aup-form-group">
                <label>Tên</label>
                <input
                  type="text"
                  className="aup-input"
                  value={form.first_name}
                  onChange={(e) => setVal('first_name', e.target.value)}
                  placeholder="ví dụ: An"
                />
              </div>
            </div>

            <div className="aup-form-row">
              <div className="aup-form-group">
                <label>Email</label>
                <input
                  type="email"
                  className="aup-input"
                  value={form.email}
                  onChange={(e) => setVal('email', e.target.value)}
                  placeholder="example@gmail.com"
                />
              </div>

              <div className="aup-form-group">
                <label>Số điện thoại</label>
                <input
                  type="tel"
                  className="aup-input"
                  value={form.phone}
                  onChange={(e) => setVal('phone', e.target.value)}
                  placeholder="0912 345 678"
                />
              </div>
            </div>

            <div className="aup-form-row">
              <div className="aup-form-group">
                <label>Phân quyền vai trò</label>
                <select
                  className="aup-input"
                  value={form.role}
                  onChange={(e) => setVal('role', e.target.value)}
                >
                  <option value="customer">👤 Khách hàng (Customer)</option>
                  <option value="admin">⚡ Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="aup-form-group" style={{ justifyContent: 'center' }}>
                <label>Trạng thái tài khoản</label>
                <label className="aup-checkbox-label">
                  <input
                    type="checkbox"
                    className="aup-checkbox"
                    checked={form.is_active}
                    onChange={(e) => setVal('is_active', e.target.checked)}
                  />
                  <span>{form.is_active ? '🟢 Cho phép đăng nhập (Active)' : '🔴 Đã khoá tài khoản'}</span>
                </label>
              </div>
            </div>
          </div>

          <div className="aup-modal-footer">
            <button type="button" className="aup-btn aup-btn-cancel" onClick={onClose}>
              Huỷ bỏ
            </button>
            <button type="submit" className="aup-btn aup-btn-submit" disabled={loading}>
              {loading ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Đặt lại Mật khẩu ─────────────────────────────── */
function ResetPasswordModal({ user, onClose, onSaved }) {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const generatePassword = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789@#$';
    let pwd = '';
    for (let i = 0; i < 10; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminUserAPI.resetPassword(user.id, newPassword);
      onSaved(`Đã cập nhật mật khẩu mới cho ${user.username}!`);
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aup-modal-overlay" onClick={onClose}>
      <div className="aup-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="aup-modal-header">
          <h3><span>🔑</span> Đặt lại mật khẩu</h3>
          <button className="aup-modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="aup-modal-body">
            <p style={{ fontSize: '0.88rem', color: '#475569', margin: 0 }}>
              Đặt mật khẩu mới cho tài khoản: <strong>{user.username}</strong> ({user.first_name || user.email || 'N/A'})
            </p>
            {error && <div className="aup-alert error">{error}</div>}

            <div className="aup-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Mật khẩu mới <span className="req">*</span></label>
                <button
                  type="button"
                  onClick={generatePassword}
                  style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                >
                  🎲 Tạo tự động
                </button>
              </div>
              <input
                type="text"
                className="aup-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                required
              />
            </div>
          </div>
          <div className="aup-modal-footer">
            <button type="button" className="aup-btn aup-btn-cancel" onClick={onClose}>Huỷ</button>
            <button type="submit" className="aup-btn aup-btn-submit" disabled={loading}>
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Xác nhận Xoá ──────────────────────────────────── */
function ConfirmDeleteModal({ user, onClose, onConfirm, loading }) {
  return (
    <div className="aup-modal-overlay" onClick={onClose}>
      <div className="aup-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="aup-modal-header">
          <h3><span>🗑️</span> Xác nhận xoá</h3>
          <button className="aup-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="aup-modal-body">
          <p style={{ fontSize: '0.9rem', color: '#334155', margin: 0 }}>
            Bạn có chắc chắn muốn xoá tài khoản <strong>{user.username}</strong> ({user.email || 'Không có email'})?
          </p>
          <div className="aup-alert error" style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            ⚠️ Hành động này sẽ xoá hoàn toàn dữ liệu người dùng và không thể hoàn tác!
          </div>
        </div>
        <div className="aup-modal-footer">
          <button className="aup-btn aup-btn-cancel" onClick={onClose}>Huỷ bỏ</button>
          <button className="aup-btn aup-btn-danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Đang xoá...' : 'Xác nhận xoá'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers]             = useState([]);
  const [stats, setStats]             = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [toast, setToast]             = useState(null);

  // Filters & Pagination
  const [search, setSearch]           = useState('');
  const [roleFilter, setRoleFilter]   = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [page, setPage]               = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Modals state
  const [formModal, setFormModal]       = useState(null); // null | 'add' | userObj
  const [resetModal, setResetModal]     = useState(null); // null | userObj
  const [deleteTarget, setDeleteTarget] = useState(null); // null | userObj
  const [actionLoading, setActionLoading] = useState(false);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Tải thống kê người dùng ── */
  const fetchStats = async () => {
    try {
      const res = await adminUserAPI.getStats();
      setStats(res.data);
    } catch {
      // Bỏ qua lỗi stats phụ
    }
  };

  /* ── Tải danh sách người dùng ── */
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page };
      if (search)       params.search    = search;
      if (roleFilter)   params.role      = roleFilter;
      if (activeFilter) params.is_active = activeFilter;

      const res = await adminUserAPI.getAll(params);
      if (res.data.results !== undefined) {
        setUsers(res.data.results);
        setTotalCount(res.data.count || 0);
      } else {
        setUsers(res.data);
        setTotalCount(res.data.length);
      }
    } catch {
      setError('Không thể tải danh sách người dùng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, activeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, []);

  /* ── Toggle Khoá / Mở khoá tài khoản ── */
  const handleToggleActive = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      showToast('Bạn không thể tự khoá tài khoản của chính mình!', true);
      return;
    }
    try {
      const res = await adminUserAPI.toggleActive(targetUser.id);
      showToast(res.data.message || 'Cập nhật trạng thái thành công!');
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: res.data.is_active } : u))
      );
      fetchStats();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Thao tác thất bại.', true);
    }
  };

  /* ── Xoá người dùng ── */
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await adminUserAPI.delete(deleteTarget.id);
      showToast(`Đã xoá người dùng ${deleteTarget.username} thành công!`);
      setDeleteTarget(null);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err?.response?.data?.error || 'Không thể xoá người dùng này.', true);
    } finally {
      setActionLoading(false);
    }
  };

  // Helper render initials
  const getInitials = (u) => {
    if (u.first_name) return u.first_name.slice(0, 2).toUpperCase();
    if (u.username) return u.username.slice(0, 2).toUpperCase();
    return 'US';
  };

  return (
    <AdminLayout title="Quản lý Người dùng">
      {/* Toast Notification */}
      {toast && (
        <div className={`aup-toast ${toast.isError ? 'error' : 'success'}`}>
          <span>{toast.isError ? '⚠️' : '✅'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="aup-stats-grid">
        <div className="aup-stat-card">
          <div className="aup-stat-icon blue">👥</div>
          <div className="aup-stat-info">
            <span className="aup-stat-num">{stats?.total_users ?? totalCount}</span>
            <span className="aup-stat-label">Tổng người dùng</span>
          </div>
        </div>

        <div className="aup-stat-card">
          <div className="aup-stat-icon green">👤</div>
          <div className="aup-stat-info">
            <span className="aup-stat-num">{stats?.total_customers ?? 0}</span>
            <span className="aup-stat-label">Khách hàng đặt tour</span>
          </div>
        </div>

        <div className="aup-stat-card">
          <div className="aup-stat-icon purple">⚡</div>
          <div className="aup-stat-info">
            <span className="aup-stat-num">{stats?.total_admins ?? 0}</span>
            <span className="aup-stat-label">Quản trị viên</span>
          </div>
        </div>

        <div className="aup-stat-card">
          <div className="aup-stat-icon red">🔒</div>
          <div className="aup-stat-info">
            <span className="aup-stat-num">{stats?.total_inactive ?? 0}</span>
            <span className="aup-stat-label">Tài khoản bị khoá</span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="aup-toolbar">
        <div className="aup-search-wrap">
          <span className="aup-search-icon">🔍</span>
          <input
            type="text"
            className="aup-search-input"
            placeholder="Tìm theo username, họ tên, email, SĐT..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button className="aup-search-clear" onClick={() => { setSearch(''); setPage(1); }}>✕</button>
          )}
        </div>

        <select
          className="aup-filter-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả vai trò</option>
          <option value="customer">👤 Khách hàng</option>
          <option value="admin">⚡ Quản trị viên</option>
        </select>

        <select
          className="aup-filter-select"
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">🟢 Đang hoạt động</option>
          <option value="false">🔴 Đã khoá</option>
        </select>

        <button className="aup-btn aup-btn-refresh" onClick={() => { fetchUsers(); fetchStats(); }} title="Làm mới">
          🔄 Tải lại
        </button>

        <button className="aup-btn aup-btn-primary" onClick={() => setFormModal('add')}>
          ➕ Thêm người dùng
        </button>
      </div>

      {/* Main Table Card */}
      <div className="aup-table-card">
        {loading ? (
          <div className="aup-state-box">
            <div className="aup-spinner" />
            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : error ? (
          <div className="aup-state-box" style={{ color: '#ef4444' }}>
            <p>{error}</p>
            <button className="aup-btn aup-btn-refresh" onClick={fetchUsers} style={{ marginTop: '0.75rem' }}>
              Thử lại
            </button>
          </div>
        ) : users.length === 0 ? (
          <div className="aup-state-box">
            <p style={{ fontSize: '2.5rem', margin: '0 0 0.5rem' }}>👤</p>
            <p style={{ fontWeight: 600, color: '#334155' }}>Không tìm thấy người dùng nào</p>
            <p style={{ fontSize: '0.85rem' }}>Thử thay đổi từ khoá tìm kiếm hoặc bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className="aup-table-wrap">
              <table className="aup-table">
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Liên hệ</th>
                    <th>Vai trò</th>
                    <th>Đơn đặt & Chi tiêu</th>
                    <th>Ngày tham gia</th>
                    <th>Trạng thái</th>
                    <th>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username;
                    const dateJoined = u.date_joined ? new Date(u.date_joined).toLocaleDateString('vi-VN') : '—';
                    const spentFormatted = Number(u.total_spent || 0).toLocaleString('vi-VN');

                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="aup-user-cell">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.username} className="aup-avatar" />
                            ) : (
                              <div className="aup-avatar">{getInitials(u)}</div>
                            )}
                            <div className="aup-user-meta">
                              <span className="aup-user-name">
                                {fullName}
                                {isSelf && <span style={{ marginLeft: 6, fontSize: '0.72rem', color: '#6366f1', fontWeight: 700 }}>(Bạn)</span>}
                              </span>
                              <span className="aup-user-uname">@{u.username}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="aup-contact-cell">
                            <span className="aup-contact-item">
                              ✉️ {u.email || <span style={{ color: '#94a3b8' }}>Chưa có</span>}
                            </span>
                            {u.phone && (
                              <span className="aup-contact-item" style={{ color: '#64748b' }}>
                                📞 {u.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {u.is_superuser || u.is_staff || u.role === 'admin' ? (
                            <span className="aup-role-badge admin">⚡ Quản trị viên</span>
                          ) : (
                            <span className="aup-role-badge customer">👤 Khách hàng</span>
                          )}
                        </td>

                        <td>
                          <div className="aup-activity-cell">
                            <div>📋 <strong>{u.bookings_count}</strong> đơn tour</div>
                            {Number(u.total_spent) > 0 && (
                              <div className="aup-spent-text">💰 {spentFormatted} đ</div>
                            )}
                          </div>
                        </td>

                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                            {dateJoined}
                          </span>
                        </td>

                        <td>
                          <button
                            className="aup-status-toggle"
                            onClick={() => handleToggleActive(u)}
                            title={isSelf ? 'Không thể tự khoá tài khoản' : 'Nhấp để bật/tắt trạng thái'}
                            disabled={isSelf}
                          >
                            <span className={`aup-status-badge ${u.is_active ? 'active' : 'inactive'}`}>
                              {u.is_active ? '🟢 Hoạt động' : '🔴 Đã khoá'}
                            </span>
                          </button>
                        </td>

                        <td>
                          <div className="aup-action-cell">
                            <button
                              className="aup-action-btn edit"
                              onClick={() => setFormModal(u)}
                              title="Chỉnh sửa thông tin & vai trò"
                            >
                              ✏️
                            </button>
                            <button
                              className="aup-action-btn key"
                              onClick={() => setResetModal(u)}
                              title="Đặt lại mật khẩu"
                            >
                              🔑
                            </button>
                            <button
                              className="aup-action-btn lock"
                              onClick={() => handleToggleActive(u)}
                              title={u.is_active ? 'Khoá tài khoản' : 'Mở khoá tài khoản'}
                              disabled={isSelf}
                            >
                              {u.is_active ? '🔒' : '🔓'}
                            </button>
                            <button
                              className="aup-action-btn delete"
                              onClick={() => setDeleteTarget(u)}
                              title="Xoá người dùng"
                              disabled={isSelf}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="aup-pagination-bar">
              <span className="aup-pagination-info">
                Hiển thị <strong>{users.length}</strong> / <strong>{totalCount}</strong> người dùng
                {totalPages > 1 && ` (Trang ${page}/${totalPages})`}
              </span>

              {totalPages > 1 && (
                <div className="aup-pagination-controls">
                  <button
                    className="aup-page-btn"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    ‹ Trước
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {idx > 0 && p - arr[idx - 1] > 1 && (
                          <span style={{ padding: '0 4px', color: '#94a3b8' }}>…</span>
                        )}
                        <button
                          className={`aup-page-btn ${p === page ? 'active' : ''}`}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </button>
                      </span>
                    ))}

                  <button
                    className="aup-page-btn"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Sau ›
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Thêm / Sửa */}
      {formModal && (
        <UserFormModal
          user={formModal === 'add' ? null : formModal}
          onClose={() => setFormModal(null)}
          onSaved={(msg) => {
            showToast(msg);
            fetchUsers();
            fetchStats();
          }}
        />
      )}

      {/* Modal Đặt lại Mật khẩu */}
      {resetModal && (
        <ResetPasswordModal
          user={resetModal}
          onClose={() => setResetModal(null)}
          onSaved={(msg) => showToast(msg)}
        />
      )}

      {/* Modal Xác nhận Xoá */}
      {deleteTarget && (
        <ConfirmDeleteModal
          user={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}

export default AdminUsersPage;
