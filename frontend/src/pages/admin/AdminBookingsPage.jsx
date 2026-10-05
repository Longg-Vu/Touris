import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { adminBookingAPI } from '../../api/services';
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

/* ─── Modal Xem chi tiết đơn ──────────────────────────── */
function BookingDetailModal({ booking, onClose, onConfirm, onComplete, onCancel, actionLoading }) {
  if (!booking) return null;

  const canConfirm  = booking.status === 'pending';
  const canComplete = booking.status === 'confirmed';
  const canCancel   = booking.status !== 'cancelled' && booking.status !== 'completed';

  return (
    <div className="abm-modal-overlay" onClick={onClose}>
      <div className="abm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="abm-modal-close" onClick={onClose}>✕</button>

        <div className="abm-modal-header">
          <h2>Chi tiết đơn đặt #{booking.id}</h2>
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
                <span>{booking.contact_phone}</span>
              </div>
              <div className="abm-modal-field">
                <label>Email</label>
                <span>{booking.contact_email}</span>
              </div>
              <div className="abm-modal-field">
                <label>Tài khoản</label>
                <span>{booking.customer_name} ({booking.customer_email})</span>
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
  const [bookings, setBookings]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected]         = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast]               = useState('');

  /* ── Fetch dữ liệu ─────────────────────────────────── */
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search)       params.search = search;
      const res = await adminBookingAPI.getAll(params);
      setBookings(res.data.results ?? res.data);
    } catch (err) {
      console.error(err);
      setError('Không thể tải danh sách đơn. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchBookings(), 300);
    return () => clearTimeout(timer);
  }, [fetchBookings]);

  /* ── Toast helper ─────────────────────────────────── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  /* ── Actions ──────────────────────────────────────── */
  const handleAction = async (id, action, msg) => {
    setActionLoading(true);
    try {
      await action(id);
      showToast(msg);
      setSelected(null);
      fetchBookings();
    } catch (err) {
      showToast(err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirm  = (id) => handleAction(id, adminBookingAPI.confirm,  '✅ Đã xác nhận đơn!');
  const handleComplete = (id) => handleAction(id, adminBookingAPI.complete, '🏁 Tour đã hoàn thành!');
  const handleCancel   = (id) => handleAction(id, adminBookingAPI.cancel,   '❌ Đã huỷ đơn!');

  /* ── Thống kê nhanh ────────────────────────────────── */
  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <AdminLayout title="📋 Quản lý đơn đặt tour">

      {/* Toast */}
      {toast && <div className="abm-toast">{toast}</div>}

      {/* ── Bộ lọc ────────────────────────────────────── */}
      <div className="abm-filter-bar">
        <div className="abm-search-wrap">
          <span className="abm-search-icon">🔍</span>
          <input
            className="abm-search"
            type="text"
            placeholder="Tìm theo tên khách, SĐT, email, tên tour..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="abm-search-clear" onClick={() => setSearch('')}>✕</button>
          )}
        </div>

        <div className="abm-status-tabs">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`abm-status-tab ${statusFilter === opt.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              {opt.value && counts[opt.value] > 0 && (
                <span className="abm-tab-count">{counts[opt.value]}</span>
              )}
            </button>
          ))}
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
                  <th>Ngày đặt</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="abm-empty">
                      <div>
                        <div className="abm-empty-icon">📭</div>
                        <div>Không tìm thấy đơn nào phù hợp</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => (
                    <tr key={b.id} className="abm-row">
                      <td className="abm-td-id">#{b.id}</td>
                      <td>
                        <div className="abm-td-customer">
                          <strong>{b.contact_name}</strong>
                          <span>{b.contact_phone}</span>
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
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {bookings.length > 0 && (
            <div className="abm-table-footer">
              Hiển thị <strong>{bookings.length}</strong> đơn
            </div>
          )}
        </>
      )}

      {/* ── Modal chi tiết ────────────────────────────── */}
      <BookingDetailModal
        booking={selected}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
        onComplete={handleComplete}
        onCancel={handleCancel}
        actionLoading={actionLoading}
      />
    </AdminLayout>
  );
}

export default AdminBookingsPage;
