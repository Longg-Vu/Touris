import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminBookingAPI, adminUserAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './AdminBookingsPage.css';

/* ─── Hằng số ─────────────────────────────────────────── */
const STATUS_OPTIONS = [
  { value: '',          label: 'Tất cả trạng thái' },
  { value: 'pending',   label: 'Chờ xác nhận'       },
  { value: 'confirmed', label: 'Đã xác nhận'         },
  { value: 'completed', label: 'Hoàn thành'          },
  { value: 'cancelled', label: 'Đã huỷ'             },
];

const STATUS_LABEL = {
  pending:   'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  completed: 'Hoàn thành',
  cancelled: 'Đã huỷ',
};

/* ─── Modal Chuyển HDV (Reassign) ─────────────────────── */
function ReassignModal({ booking, guides, onClose, onReassign, loading }) {
  const [selectedGuideId, setSelectedGuideId] = useState(
    booking?.assigned_guide_id ?? ''
  );

  if (!booking) return null;

  return (
    <div className="abm-modal-overlay" onClick={onClose}>
      <div className="abm-modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <button className="abm-modal-close" onClick={onClose}>✕</button>

        <div className="abm-modal-header">
          <h2>🔄 Chuyển HDV phụ trách</h2>
        </div>

        <div className="abm-modal-body" style={{ padding: '1rem 1.5rem' }}>
          {/* Info đơn */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Đơn đặt</div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 15 }}>
              #{booking.id} {booking.booking_code ? `(${booking.booking_code})` : ''}
            </div>
            <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>{booking.tour_title}</div>
          </div>

          {/* Hiện tại */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              HDV phụ trách hiện tại
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: booking.assigned_guide_id ? '#eff6ff' : '#fef9c3',
              border: `1px solid ${booking.assigned_guide_id ? '#bfdbfe' : '#fde68a'}`,
              borderRadius: 8, padding: '8px 12px'
            }}>
              <span style={{ fontSize: 18 }}>{booking.assigned_guide_id ? '👤' : '⚠️'}</span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: booking.assigned_guide_id ? '#1e40af' : '#92400e' }}>
                {booking.assigned_guide_name || 'Chưa gán HDV'}
              </span>
            </div>
          </div>

          {/* Chọn HDV mới */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 6 }}>
              Chuyển sang HDV
            </label>
            <select
              value={selectedGuideId}
              onChange={(e) => setSelectedGuideId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0',
                borderRadius: 8, fontSize: 14, color: '#1e293b',
                background: '#fff', cursor: 'pointer', outline: 'none'
              }}
            >
              <option value="">— Không gán HDV —</option>
              {guides.map(g => (
                <option key={g.id} value={g.id}>
                  {g.first_name ? `${g.first_name} ${g.last_name || ''}`.trim() : g.username}
                  {g.id === booking.assigned_guide_id ? ' (Hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="abm-modal-actions">
          <button
            className="abm-btn abm-btn-confirm"
            onClick={() => onReassign(booking.id, selectedGuideId || '')}
            disabled={loading}
          >
            {loading ? '...' : '🔄 Xác nhận chuyển HDV'}
          </button>
          <button className="abm-btn abm-btn-close" onClick={onClose}>Huỷ</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Modal Xem chi tiết đơn ──────────────────────────── */
function BookingDetailModal({ booking, onClose, onConfirm, onComplete, onCancel, onOpenReassign, actionLoading, isAdmin }) {
  if (!booking) return null;

  const canConfirm  = booking.status === 'pending';
  const canComplete = booking.status === 'confirmed';
  const canCancel   = booking.status !== 'cancelled' && booking.status !== 'completed';

  // Kiểm tra xem đơn đã bị reassign (assigned_guide khác tour.guide)
  const isReassigned = booking.assigned_guide_id && booking.tour_guide_id &&
    booking.assigned_guide_id !== booking.tour_guide_id;

  return (
    <div className="abm-modal-overlay" onClick={onClose}>
      <div className="abm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="abm-modal-close" onClick={onClose}>✕</button>

        <div className="abm-modal-header">
          <h2>Chi tiết đơn đặt #{booking.id} {booking.booking_code ? `(${booking.booking_code})` : ''}</h2>
          <span className={`abm-status-badge abm-status-${booking.status}`}>
            {STATUS_LABEL[booking.status]}
          </span>
        </div>

        <div className="abm-modal-body">
          {/* Thông tin tour */}
          <div className="abm-modal-section">
            <h4>🗺️ Thông tin tour</h4>
            <div className="abm-modal-tour">
              {booking.tour_thumbnail && (
                <img src={booking.tour_thumbnail} alt={booking.tour_title} />
              )}
              <div>
                <div className="abm-modal-tour-name">{booking.tour_title}</div>
                <div className="abm-modal-tour-meta">
                  Ngày khởi hành: <strong>{new Date(booking.travel_date).toLocaleDateString('vi-VN')}</strong>
                </div>
                <div className="abm-modal-tour-meta">
                  Người lớn: <strong>{booking.num_adults}</strong>
                  {booking.num_children > 0 && ` · Trẻ em: `}
                  {booking.num_children > 0 && <strong>{booking.num_children}</strong>}
                </div>
              </div>
            </div>
          </div>

          {/* HDV phụ trách */}
          <div className="abm-modal-section">
            <h4>🧭 HDV phụ trách đơn này</h4>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: booking.assigned_guide_id ? '#eff6ff' : '#fef9c3',
              border: `1px solid ${booking.assigned_guide_id ? '#bfdbfe' : '#fde68a'}`,
              borderRadius: 10, padding: '10px 14px', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{booking.assigned_guide_id ? '👤' : '⚠️'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: booking.assigned_guide_id ? '#1e40af' : '#92400e' }}>
                    {booking.assigned_guide_name || 'Chưa gán HDV'}
                  </div>
                  {isReassigned && (
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      ℹ️ Đã chuyển (HDV tour gốc: {booking.tour_guide_name})
                    </div>
                  )}
                  {!booking.assigned_guide_id && booking.tour_guide_name && (
                    <div style={{ fontSize: 11.5, color: '#92400e', marginTop: 2 }}>
                      HDV tour: {booking.tour_guide_name} (chưa gán vào đơn)
                    </div>
                  )}
                </div>
              </div>
              {isAdmin && (
                <button
                  className="abm-btn"
                  style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 12px', fontSize: 12.5 }}
                  onClick={() => { onClose(); onOpenReassign(booking); }}
                >
                  🔄 Chuyển HDV
                </button>
              )}
            </div>
          </div>

          {/* Thông tin khách */}
          <div className="abm-modal-section">
            <h4>👤 Khách hàng</h4>
            <div className="abm-modal-grid">
              <div className="abm-modal-field">
                <label>Họ tên liên hệ</label>
                <span>{booking.contact_name}</span>
              </div>
              <div className="abm-modal-field">
                <label>Số điện thoại</label>
                <span>
                  <a href={`tel:${booking.contact_phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                    {booking.contact_phone}
                  </a>
                </span>
              </div>
              <div className="abm-modal-field">
                <label>Email</label>
                <span>{booking.contact_email}</span>
              </div>
              <div className="abm-modal-field">
                <label>Tài khoản hệ thống</label>
                <span>
                  {booking.is_guest ? '👤 Khách vãng lai' : `${booking.customer_name} (${booking.customer_email || '—'})`}
                </span>
              </div>
            </div>
            {booking.special_request && (
              <div className="abm-modal-special">
                <label>Yêu cầu đặc biệt / Ghi chú</label>
                <p>{booking.special_request}</p>
              </div>
            )}
          </div>

          {/* Giá tiền */}
          <div className="abm-modal-section">
            <h4>💰 Thanh toán</h4>
            <div className="abm-modal-pricing">
              <div className="abm-modal-pricing-row">
                <span>Giá người lớn × {booking.num_adults}</span>
                <span>{(Number(booking.price_adult) * booking.num_adults).toLocaleString('vi-VN')} ₫</span>
              </div>
              {booking.num_children > 0 && (
                <div className="abm-modal-pricing-row">
                  <span>Giá trẻ em × {booking.num_children}</span>
                  <span>{(Number(booking.price_child) * booking.num_children).toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              <div className="abm-modal-pricing-row abm-total">
                <span>Tổng tiền</span>
                <span>{Number(booking.total_price).toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
          </div>

          {/* Thời gian */}
          <div className="abm-modal-section abm-modal-times">
            <span>Đặt lúc: {new Date(booking.created_at).toLocaleString('vi-VN')}</span>
            <span>Cập nhật: {new Date(booking.updated_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="abm-modal-actions">
          {canConfirm && (
            <button
              className="abm-btn abm-btn-confirm"
              onClick={() => onConfirm(booking.id)}
              disabled={actionLoading}
            >
              {actionLoading ? '...' : '✅ Xác nhận đơn'}
            </button>
          )}
          {canComplete && (
            <button
              className="abm-btn abm-btn-complete"
              onClick={() => onComplete(booking.id)}
              disabled={actionLoading}
            >
              {actionLoading ? '...' : '🏁 Hoàn thành tour'}
            </button>
          )}
          {canCancel && (
            <button
              className="abm-btn abm-btn-cancel"
              onClick={() => onCancel(booking.id)}
              disabled={actionLoading}
            >
              {actionLoading ? '...' : '❌ Huỷ đơn'}
            </button>
          )}
          <button className="abm-btn abm-btn-close" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────── */
function AdminBookingsPage() {
  const { isAdmin } = useAuth();
  const [bookings, setBookings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [guideFilter, setGuideFilter]   = useState('');   // chỉ Admin dùng
  const [selected, setSelected]         = useState(null); // modal chi tiết
  const [reassignTarget, setReassignTarget] = useState(null); // modal reassign
  const [actionLoading, setActionLoading]   = useState(false);
  const [toast, setToast]               = useState('');
  const [guides, setGuides]             = useState([]);   // danh sách HDV

  // Phân trang & Đếm trạng thái
  const [page, setPage]                 = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const PAGE_SIZE                       = 15;
  const totalPages                      = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const [statusCounts, setStatusCounts] = useState({});

  /* ── Fetch danh sách HDV (chỉ Admin) ──────────────── */
  useEffect(() => {
    if (isAdmin) {
      adminUserAPI.getGuides()
        .then(res => setGuides(res.data?.results ?? res.data ?? []))
        .catch(() => {});
    }
  }, [isAdmin]);

  /* ── Fetch thống kê trạng thái (toàn bộ, không bị chia trang) ── */
  const fetchStatusCounts = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (isAdmin && guideFilter) params.guide = guideFilter;
      const res = await adminBookingAPI.getStatusCounts(params);
      setStatusCounts(res.data || {});
    } catch {
      // Fallback im lặng nếu lỗi mạng
    }
  }, [search, guideFilter, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchStatusCounts(), 300);
    return () => clearTimeout(timer);
  }, [fetchStatusCounts]);

  /* ── Fetch dữ liệu danh sách đơn ───────────────────── */
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (search)       params.search = search;
      if (isAdmin && guideFilter) params.guide = guideFilter;

      const res = await adminBookingAPI.getAll(params);
      if (res.data?.results !== undefined) {
        setBookings(res.data.results);
        setTotalCount(res.data.count || 0);
      } else {
        setBookings(res.data || []);
        setTotalCount(Array.isArray(res.data) ? res.data.length : 0);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, guideFilter, isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 300);
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  /* ── Handler chuyển bộ lọc (tự động về trang 1) ───── */
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleSearchClear = () => {
    setSearch('');
    setPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleGuideChange = (e) => {
    setGuideFilter(e.target.value);
    setPage(1);
  };

  /* ── Toast helper ─────────────────────────────────── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  /* ── Actions ──────────────────────────────────────── */
  const handleAction = async (id, actionFn, msg) => {
    setActionLoading(true);
    try {
      await actionFn(id);
      showToast(msg);
      setSelected(null);
      fetchBookings();
      fetchStatusCounts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm  = (id) => handleAction(id, adminBookingAPI.confirm,  '✅ Đã xác nhận đơn!');
  const handleComplete = (id) => handleAction(id, adminBookingAPI.complete,  '🏁 Tour đã hoàn thành!');
  const handleCancel   = (id) => handleAction(id, adminBookingAPI.cancel,    '❌ Đã huỷ đơn!');

  const handleReassign = async (bookingId, guideId) => {
    setActionLoading(true);
    try {
      await adminBookingAPI.reassign(bookingId, guideId !== '' ? guideId : null);
      showToast('🔄 Đã chuyển HDV phụ trách thành công!');
      setReassignTarget(null);
      fetchBookings();
      fetchStatusCounts();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Không thể chuyển HDV. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminLayout title={isAdmin ? '📋 Quản lý đơn đặt tour (Toàn hệ thống)' : '📋 Đơn đặt các tour bạn phụ trách'}>

      {/* Toast */}
      {toast && <div className="abm-toast">{toast}</div>}

      {/* ── Banner mô tả vai trò (chỉ HDV) ─────────────── */}
      {!isAdmin && (
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%)',
          border: '1px solid #bfdbfe',
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13.5,
          color: '#1e40af',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🧭</span>
          <span>
            Bạn đang xem các đơn đặt thuộc <strong>tour bạn phụ trách</strong>.
            Bạn có thể <strong>Xác nhận</strong> (khi khách đã chuyển khoản), <strong>Hoàn thành</strong> sau khi dẫn tour, hoặc <strong>Huỷ</strong> nếu khách yêu cầu.
          </span>
        </div>
      )}

      {/* ── Bộ lọc ────────────────────────────────────── */}
      <div className="abm-filter-bar">
        <div className="abm-search-wrap">
          <span className="abm-search-icon">🔍</span>
          <input
            className="abm-search"
            type="text"
            placeholder={isAdmin ? 'Tìm theo tên khách, SĐT, email, tên tour, mã đơn...' : 'Tìm khách, SĐT, tên tour của bạn...'}
            value={search}
            onChange={handleSearchChange}
          />
          {search && (
            <button className="abm-search-clear" onClick={handleSearchClear}>✕</button>
          )}
        </div>

        {/* Lọc theo HDV – chỉ Admin */}
        {isAdmin && guides.length > 0 && (
          <select
            value={guideFilter}
            onChange={handleGuideChange}
            style={{
              padding: '0.65rem 1rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              color: '#1e293b',
              background: '#fff',
              cursor: 'pointer',
              minWidth: 180,
            }}
          >
            <option value="">👥 Tất cả HDV</option>
            {guides.map(g => (
              <option key={g.id} value={g.id}>
                {g.first_name ? `${g.first_name} ${g.last_name || ''}`.trim() : g.username}
              </option>
            ))}
          </select>
        )}

        <div className="abm-status-tabs">
          {STATUS_OPTIONS.map((opt) => {
            const count = opt.value ? statusCounts[opt.value] : statusCounts['all'];
            return (
              <button
                key={opt.value}
                className={`abm-status-tab ${statusFilter === opt.value ? 'active' : ''}`}
                onClick={() => handleStatusChange(opt.value)}
              >
                {opt.label}
                {count !== undefined && count > 0 && (
                  <span className="abm-tab-count">{count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────── */}
      {error && <div className="abm-error">⚠️ {error}</div>}

      {/* ── Loading ───────────────────────────────────── */}
      {loading && (
        <div className="abm-loading">
          <div className="abm-spinner" />
          <span>Đang tải...</span>
        </div>
      )}

      {/* ── Bảng đơn hàng ─────────────────────────────── */}
      {!loading && !error && (
        <>
          <div className="abm-table-wrap">
            <table className="abm-table">
              <thead>
                <tr>
                  <th>#ID</th>
                  <th>Khách hàng</th>
                  <th>Tour</th>
                  <th>Ngày đi</th>
                  <th>Khách</th>
                  <th>Tổng tiền</th>
                  {isAdmin && <th>HDV phụ trách</th>}
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 9} className="abm-empty">
                      <div>
                        <div className="abm-empty-icon">📭</div>
                        <div>
                          {isAdmin
                            ? 'Không tìm thấy đơn nào phù hợp'
                            : 'Bạn chưa có đơn nào thuộc tour mình phụ trách'}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="abm-row">
                      <td className="abm-td-id">
                        <div style={{ fontWeight: 700 }}>#{b.id}</div>
                        {b.booking_code && (
                          <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>
                            {b.booking_code}
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="abm-td-customer">
                          <strong>{b.contact_name}</strong>
                          <span>
                            <a href={`tel:${b.contact_phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                              {b.contact_phone}
                            </a>
                          </span>
                          {b.is_guest && (
                            <span style={{ fontSize: '0.7rem', color: '#d97706', fontWeight: 600, background: '#fef3c7', padding: '1px 6px', borderRadius: 4, width: 'fit-content' }}>
                              👤 Vãng lai
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="abm-td-tour" title={b.tour_title}>
                        {b.tour_title}
                      </td>
                      <td className="abm-td-date">
                        {new Date(b.travel_date).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="abm-td-guests">
                        {b.num_adults} NL
                        {b.num_children > 0 && ` + ${b.num_children} TE`}
                      </td>
                      <td className="abm-td-price">
                        {Number(b.total_price).toLocaleString('vi-VN')} ₫
                      </td>

                      {/* Cột HDV – chỉ Admin */}
                      {isAdmin && (
                        <td>
                          {b.assigned_guide_name ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{
                                fontSize: '0.8rem', fontWeight: 600,
                                color: '#1e40af', background: '#eff6ff',
                                padding: '2px 8px', borderRadius: 6, display: 'inline-block'
                              }}>
                                👤 {b.assigned_guide_name}
                              </span>
                              {/* Badge nếu đã reassign */}
                              {b.assigned_guide_id && b.tour_guide_id && b.assigned_guide_id !== b.tour_guide_id && (
                                <span style={{ fontSize: '0.65rem', color: '#7c3aed', fontWeight: 500 }}>
                                  ↩ Đã chuyển
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{
                              fontSize: '0.78rem', color: '#92400e',
                              background: '#fef9c3', padding: '2px 8px',
                              borderRadius: 6, display: 'inline-block', fontWeight: 600
                            }}>
                              ⚠️ Chưa gán
                            </span>
                          )}
                        </td>
                      )}

                      <td className="abm-td-created">
                        {new Date(b.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <span className={`abm-status-badge abm-status-${b.status}`}>
                          {STATUS_LABEL[b.status]}
                        </span>
                      </td>
                      <td>
                        <div className="abm-actions-cell">
                          {/* Xem chi tiết */}
                          <button
                            className="abm-action-btn abm-action-view"
                            onClick={() => setSelected(b)}
                            title="Xem chi tiết"
                          >
                            👁️
                          </button>
                          {/* Xác nhận nhanh */}
                          {b.status === 'pending' && (
                            <button
                              className="abm-action-btn abm-action-confirm"
                              onClick={() => handleConfirm(b.id)}
                              title="Xác nhận đơn"
                            >
                              ✅
                            </button>
                          )}
                          {/* Hoàn thành nhanh */}
                          {b.status === 'confirmed' && (
                            <button
                              className="abm-action-btn abm-action-complete"
                              onClick={() => handleComplete(b.id)}
                              title="Hoàn thành tour"
                            >
                              🏁
                            </button>
                          )}
                          {/* Huỷ nhanh */}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button
                              className="abm-action-btn abm-action-cancel"
                              onClick={() => handleCancel(b.id)}
                              title="Huỷ đơn"
                            >
                              ❌
                            </button>
                          )}
                          {/* Chuyển HDV – chỉ Admin */}
                          {isAdmin && (
                            <button
                              className="abm-action-btn"
                              style={{ background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' }}
                              onClick={() => setReassignTarget(b)}
                              title="Chuyển HDV phụ trách"
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── Thanh phân trang ─────────────────────────────── */}
          <div className="abm-pagination-bar">
            <div className="abm-pagination-info">
              Hiển thị <strong>{bookings.length}</strong> / <strong>{totalCount}</strong> đơn
              {totalPages > 1 && ` (Trang ${page}/${totalPages})`}
              {isAdmin && guideFilter && guides.length > 0 && (
                <span style={{ marginLeft: 8, color: '#64748b' }}>
                  · Đang lọc theo HDV: <strong>
                    {(() => {
                      const g = guides.find(g => String(g.id) === String(guideFilter));
                      return g ? (g.first_name ? `${g.first_name} ${g.last_name || ''}`.trim() : g.username) : '—';
                    })()}
                  </strong>
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="abm-pagination-btns">
                <button
                  className="abm-page-btn"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  title="Trang đầu"
                >
                  «
                </button>
                <button
                  className="abm-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  title="Trang trước"
                >
                  ‹ Trước
                </button>

                {/* Số trang với dấu ba chấm */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '...' ? (
                      <span key={`ellipsis-${i}`} className="abm-page-ellipsis">…</span>
                    ) : (
                      <button
                        key={p}
                        className={`abm-page-btn abm-page-num ${page === p ? 'active' : ''}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}

                <button
                  className="abm-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  title="Trang sau"
                >
                  Sau ›
                </button>
                <button
                  className="abm-page-btn"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  title="Trang cuối"
                >
                  »
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modal chi tiết ────────────────────────────── */}
      <BookingDetailModal
        booking={selected}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onCancel={handleCancel}
        onOpenReassign={(b) => setReassignTarget(b)}
        actionLoading={actionLoading}
        isAdmin={isAdmin}
      />

      {/* ── Modal Chuyển HDV ──────────────────────────── */}
      {isAdmin && (
        <ReassignModal
          booking={reassignTarget}
          guides={guides}
          onClose={() => setReassignTarget(null)}
          onReassign={handleReassign}
          loading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}

export default AdminBookingsPage;
