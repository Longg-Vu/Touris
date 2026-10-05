import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingAPI } from '../../api/services';
import { AuthContext } from '../../context/AuthContext';
import './MyBookingsPage.css';

const fmt = (n) => Number(n).toLocaleString('vi-VN') + ' ₫';

const STATUS_CONFIG = {
  pending:   { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fefce8', icon: '⏳' },
  confirmed: { label: 'Đã xác nhận',  color: '#10b981', bg: '#f0fdf4', icon: '✅' },
  cancelled: { label: 'Đã huỷ',       color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  completed: { label: 'Hoàn thành',   color: '#6366f1', bg: '#eef2ff', icon: '🎉' },
};

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [cancelId, setCancelId] = useState(null);   // which booking is being cancelled
  const [filter, setFilter]     = useState('all');  // 'all' | status

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setLoading(true);
    bookingAPI.getAll()
      .then(res => {
        const data = res.data?.results ?? res.data ?? [];
        setBookings(Array.isArray(data) ? data : []);
      })
      .catch(() => setError('Không thể tải lịch sử đặt tour.'))
      .finally(() => setLoading(false));
  }, [user, navigate]);

  const handleCancel = async (id) => {
    if (!window.confirm('Bạn có chắc muốn huỷ booking này?')) return;
    setCancelId(id);
    try {
      const res = await bookingAPI.cancel(id);
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
    } catch {
      alert('Huỷ thất bại. Vui lòng thử lại.');
    } finally {
      setCancelId(null);
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

  /* ── Render ──────────────────────────────────────────── */
  return (
    <div className="mb-page">

      {/* Header */}
      <div className="mb-hero">
        <div className="mb-hero-inner">
          <nav className="mb-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span>›</span>
            <span>Lịch sử đặt tour</span>
          </nav>
          <h1 className="mb-heading">🎫 Lịch sử đặt tour</h1>
          <p className="mb-sub">Quản lý tất cả các chuyến đi của bạn</p>
        </div>
      </div>

      <div className="mb-content">

        {/* Filter tabs */}
        <div className="mb-tabs">
          {[
            { key: 'all',       label: 'Tất cả',           count: bookings.length },
            { key: 'pending',   label: 'Chờ xác nhận',     count: bookings.filter(b=>b.status==='pending').length },
            { key: 'confirmed', label: 'Đã xác nhận',      count: bookings.filter(b=>b.status==='confirmed').length },
            { key: 'completed', label: 'Hoàn thành',       count: bookings.filter(b=>b.status==='completed').length },
            { key: 'cancelled', label: 'Đã huỷ',           count: bookings.filter(b=>b.status==='cancelled').length },
          ].map(tab => (
            <button
              key={tab.key}
              className={`mb-tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
              {tab.count > 0 && <span className="mb-tab-count">{tab.count}</span>}
            </button>
          ))}
        </div>

        {/* States */}
        {loading && (
          <div className="mb-state">
            <div className="mb-spinner" />
            <p>Đang tải dữ liệu…</p>
          </div>
        )}

        {error && (
          <div className="mb-state mb-state--error">
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p>{error}</p>
            <button className="mb-btn-primary" onClick={() => window.location.reload()}>Thử lại</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="mb-empty">
            <div className="mb-empty-icon">🗺️</div>
            <h2>Chưa có booking nào</h2>
            <p>{filter === 'all' ? 'Hãy khám phá và đặt tour ngay hôm nay!' : `Không có booking nào ở trạng thái "${STATUS_CONFIG[filter]?.label}".`}</p>
            <Link to="/tours" className="mb-btn-primary">Khám phá tours</Link>
          </div>
        )}

        {/* Booking list */}
        {!loading && !error && filtered.length > 0 && (
          <div className="mb-list">
            {filtered.map(booking => {
              const sc = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
              return (
                <div key={booking.id} className="mb-card">
                  {/* Status badge */}
                  <div className="mb-card-status" style={{ background: sc.bg, color: sc.color }}>
                    <span>{sc.icon}</span>
                    <span>{sc.label}</span>
                  </div>

                  <div className="mb-card-body">
                    {/* Tour thumbnail */}
                    <Link to={`/tours/${booking.tour}`} className="mb-thumb-wrap">
                      <img
                        src={booking.tour_thumbnail}
                        alt={booking.tour_title}
                        className="mb-thumb"
                      />
                    </Link>

                    {/* Info */}
                    <div className="mb-info">
                      <Link to={`/tours/${booking.tour}`} className="mb-tour-name">
                        {booking.tour_title}
                      </Link>
                      <div className="mb-meta-grid">
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">Mã đặt tour</span>
                          <span className="mb-meta-val"># {booking.id}</span>
                        </div>
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">📅 Ngày đi</span>
                          <span className="mb-meta-val">{booking.travel_date}</span>
                        </div>
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">👥 Số khách</span>
                          <span className="mb-meta-val">
                            {booking.num_adults} NL{booking.num_children > 0 ? ` + ${booking.num_children} TE` : ''}
                          </span>
                        </div>
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">📞 Liên hệ</span>
                          <span className="mb-meta-val">{booking.contact_phone}</span>
                        </div>
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">💰 Tổng tiền</span>
                          <span className="mb-meta-val mb-price">{fmt(booking.total_price)}</span>
                        </div>
                        <div className="mb-meta-item">
                          <span className="mb-meta-label">🕐 Đặt lúc</span>
                          <span className="mb-meta-val">{new Date(booking.created_at).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </div>

                      {booking.special_request && (
                        <div className="mb-special-req">
                          💬 <em>{booking.special_request}</em>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mb-card-actions">
                    <Link to={`/tours/${booking.tour}`} className="mb-btn-outline">
                      Xem tour
                    </Link>
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button
                        className="mb-btn-cancel"
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelId === booking.id}
                      >
                        {cancelId === booking.id ? 'Đang huỷ…' : 'Huỷ booking'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA */}
        {!loading && !error && bookings.length > 0 && (
          <div className="mb-cta">
            <p>Muốn khám phá thêm điểm đến mới?</p>
            <Link to="/tours" className="mb-btn-primary">Đặt tour mới</Link>
          </div>
        )}

      </div>
    </div>
  );
}
