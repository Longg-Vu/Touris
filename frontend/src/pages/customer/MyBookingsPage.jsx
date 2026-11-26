import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { bookingAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './MyBookingsPage.css';

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN') + ' ₫';

const STATUS_CONFIG = {
  pending:   { label: 'Chờ xác nhận', color: '#f59e0b', bg: '#fefce8', icon: '⏳' },
  confirmed: { label: 'Đã xác nhận',  color: '#10b981', bg: '#f0fdf4', icon: '✅' },
  cancelled: { label: 'Đã huỷ',       color: '#ef4444', bg: '#fef2f2', icon: '❌' },
  completed: { label: 'Hoàn thành',   color: '#6366f1', bg: '#eef2ff', icon: '🎉' },
};

export default function MyBookingsPage() {
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [bookings, setBookings]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [cancelId, setCancelId]       = useState(null);
  const [filter, setFilter]           = useState('all');

  // Tra cứu đơn khách vãng lai qua SĐT hoặc mã đơn
  const [lookupQuery, setLookupQuery]     = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError]     = useState('');

  // Modal thanh toán QR cho đơn Pending
  const [payModalBooking, setPayModalBooking] = useState(null);
  const [payingLoading, setPayingLoading]     = useState(false);
  const [paySuccessMsg, setPaySuccessMsg]     = useState('');

  useEffect(() => {
    try {
      localStorage.removeItem('guest_bookings');
    } catch {}
    setError(null);
    if (user) {
      setLoading(true);
      bookingAPI.getAll()
        .then(res => {
          const data = res.data?.results ?? res.data ?? [];
          setBookings(Array.isArray(data) ? data : []);
        })
        .catch(() => setError('Không thể tải lịch sử đặt tour.'))
        .finally(() => setLoading(false));
    } else {
      setBookings([]);
      setLoading(false);
    }
  }, [user]);

  // Xử lý tra cứu đơn qua SĐT hoặc mã đơn
  const handleLookup = async (e) => {
    e.preventDefault();
    const q = lookupQuery.trim();
    if (!q) {
      setLookupError('Vui lòng nhập số điện thoại hoặc mã đơn để tra cứu.');
      return;
    }
    setLookupLoading(true);
    setLookupError('');
    try {
      const res = await bookingAPI.lookup({ phone: q, code: q });
      const found = res.data?.results || [];
      if (found.length === 0) {
        setLookupError(`Không tìm thấy đơn đặt tour nào khớp với "${q}".`);
      } else {
        setBookings(found);
        // Lưu các đơn tìm thấy vào localStorage để lần sau mở lại xem được ngay
        try {
          const local = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
          const merged = [...found, ...local.filter(lb => !found.some(fb => fb.id === lb.id))];
          localStorage.setItem('guest_bookings', JSON.stringify(merged));
        } catch {}
      }
    } catch {
      setLookupError('Có lỗi xảy ra khi tra cứu. Vui lòng thử lại sau.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Huỷ booking (Hỗ trợ cả khách đã đăng nhập & khách vãng lai, áp dụng chính sách trước 24h)
  const handleCancel = async (booking) => {
    const id = booking.id;
    const isPaid = booking.status === 'confirmed';
    const confirmMsg = isPaid
      ? `Đơn #${id} đã được thanh toán (${fmt(booking.total_price)}).\nNếu huỷ trước giờ khởi hành ít nhất 24h, bạn sẽ được ghi nhận hoàn tiền 100%.\n\nBạn có chắc chắn muốn huỷ đơn này không?`
      : `Bạn có chắc chắn muốn huỷ đơn đặt tour #${id} không?`;
    if (!window.confirm(confirmMsg)) return;

    setCancelId(id);
    try {
      const res = await bookingAPI.cancel(id, {
        booking_code: booking.booking_code || '',
        contact_phone: booking.contact_phone || '',
      });
      setBookings(prev => prev.map(b => b.id === id ? res.data : b));
      // Cập nhật cả localStorage nếu là khách vãng lai
      try {
        const local = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
        localStorage.setItem('guest_bookings', JSON.stringify(local.map(b => b.id === id ? res.data : b)));
      } catch {}
      if (isPaid) {
        alert('✅ Đã huỷ đơn thành công! Hệ thống đã ghi nhận yêu cầu hoàn tiền 100% và gửi email xác nhận cho bạn.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Huỷ đơn thất bại. Vui lòng thử lại.';
      alert(`⚠️ ${detail}`);
    } finally {
      setCancelId(null);
    }
  };

  // Xác nhận đã chuyển khoản cho đơn Pending (VietQR)
  const handleConfirmPayment = async () => {
    if (!payModalBooking) return;
    setPayingLoading(true);
    try {
      const res = await bookingAPI.pay(payModalBooking.id, 'bank_transfer');
      const updatedBooking = res.data?.booking || { ...payModalBooking, status: 'confirmed' };
      setBookings(prev => prev.map(b => b.id === payModalBooking.id ? updatedBooking : b));

      // Cập nhật cả localStorage
      try {
        const local = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
        localStorage.setItem('guest_bookings', JSON.stringify(local.map(b => b.id === payModalBooking.id ? { ...b, status: 'confirmed' } : b)));
      } catch {}

      setPaySuccessMsg('Xác nhận thanh toán thành công! Trạng thái đơn đã được cập nhật.');
      setTimeout(() => {
        setPayModalBooking(null);
        setPaySuccessMsg('');
      }, 1500);
    } catch (err) {
      alert(err.response?.data?.detail || 'Thanh toán thất bại. Vui lòng thử lại.');
    } finally {
      setPayingLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => b.status === filter);

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
          <p className="mb-sub">
            {user
              ? `Xin chào ${user.first_name || user.username}, quản lý tất cả các chuyến đi của bạn tại đây.`
              : 'Quản lý và tra cứu các chuyến đi của bạn (Khách vãng lai & Thành viên).'}
          </p>
        </div>
      </div>

      <div className="mb-content">
        {/* Yêu cầu đăng nhập nếu chưa đăng nhập */}
        {!user ? (
          <div className="mb-guest-box" style={{
            background: '#ffffff',
            border: '1.5px solid #e0e7ff',
            borderRadius: 16,
            padding: '40px 28px',
            textAlign: 'center',
            maxWidth: 640,
            margin: '16px auto 32px',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <h2 style={{ margin: '0 0 10px', fontSize: 21, color: '#0f172a', fontWeight: 800 }}>
              Đăng nhập để xem & quản lý đơn đặt tour
            </h2>
            <p style={{ margin: '0 auto 22px', fontSize: 14.5, color: '#475569', lineHeight: 1.65, maxWidth: 520 }}>
              Để bảo mật thông tin cá nhân và vé điện tử, mỗi tài khoản có danh sách đơn đặt riêng biệt.
              <br />
              💡 <strong>Nếu bạn vừa đặt tour không cần đăng nhập (Khách vãng lai):</strong> Hệ thống đã tự động kích hoạt tài khoản và gửi <strong>Tên đăng nhập / Email + Mật khẩu (123456)</strong> vào hộp thư Email của bạn!
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => openAuthModal && openAuthModal('login')}
                style={{
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '11px 24px',
                  fontSize: 14.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)'
                }}
              >
                🔑 Đăng nhập ngay
              </button>
              <Link
                to="/tours"
                style={{
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '11px 20px',
                  fontSize: 14.5,
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
              >
                🌍 Khám phá các Tour
              </Link>
            </div>
          </div>
        ) : (
          <>
        {/* Filter tabs */}
        <div className="mb-tabs">
          {[
            { key: 'all',       label: 'Tất cả',       count: bookings.length },
            { key: 'pending',   label: 'Chờ xác nhận', count: bookings.filter(b=>b.status==='pending').length },
            { key: 'confirmed', label: 'Đã xác nhận',  count: bookings.filter(b=>b.status==='confirmed').length },
            { key: 'completed', label: 'Hoàn thành',   count: bookings.filter(b=>b.status==='completed').length },
            { key: 'cancelled', label: 'Đã huỷ',       count: bookings.filter(b=>b.status==='cancelled').length },
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
                          <span className="mb-meta-val">
                            #{booking.id} {booking.booking_code ? <span style={{ color: '#4f46e5', fontWeight: 600 }}>({booking.booking_code})</span> : ''}
                          </span>
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
                          <span className="mb-meta-val">
                            {booking.created_at ? new Date(booking.created_at).toLocaleDateString('vi-VN') : 'Gần đây'}
                          </span>
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
                    {booking.status === 'pending' && (
                      <button
                        type="button"
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                        onClick={() => setPayModalBooking(booking)}
                      >
                        💳 Thanh toán ngay (VietQR)
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <Link
                        to={`/tours/${booking.tour}#tdp-reviews`}
                        className="mb-btn-primary"
                        style={{ padding: '7px 14px', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        ⭐ Viết đánh giá
                      </Link>
                    )}
                    {(booking.status === 'pending' || booking.status === 'confirmed') && (
                      <button
                        className="mb-btn-cancel"
                        onClick={() => handleCancel(booking)}
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
          </>
        )}
      </div>

      {/* ── Modal thanh toán VietQR dành cho đơn Chờ xác nhận ── */}
      {payModalBooking && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: 16
        }} onClick={() => setPayModalBooking(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            maxWidth: 480,
            width: '100%',
            padding: 24,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            position: 'relative'
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPayModalBooking(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 20,
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              ✕
            </button>

            <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#0f172a' }}>
              💳 Thanh toán đơn #{payModalBooking.id}
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>
              {payModalBooking.tour_title} – Ngày đi: {payModalBooking.travel_date}
            </p>

            {paySuccessMsg ? (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: 16, borderRadius: 8, textAlign: 'center', fontWeight: 600 }}>
                ✅ {paySuccessMsg}
              </div>
            ) : (
              <>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, fontSize: 13, lineHeight: 1.8, marginBottom: 16 }}>
                  <div>Ngân hàng: <strong>MB Bank (Quân Đội)</strong></div>
                  <div>Số tài khoản: <strong>0797268696</strong></div>
                  <div>Chủ TK: <strong>CONG TY DU LICH TOUR FOR YOU</strong></div>
                  <div>Số tiền: <strong style={{ color: '#dc2626', fontSize: 16 }}>{fmt(payModalBooking.total_price)}</strong></div>
                  <div>Cú pháp: <strong style={{ color: '#4f46e5', background: '#eef2ff', padding: '2px 8px', borderRadius: 4 }}>BOOKING {payModalBooking.id}</strong></div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                  <img
                    src={`https://img.vietqr.io/image/MB-0797268696-compact2.png?amount=${payModalBooking.total_price}&addInfo=BOOKING${payModalBooking.id}&accountName=TOUR FOR YOU`}
                    alt="VietQR thanh toán"
                    style={{ maxWidth: 220, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <p style={{ fontSize: 12, color: '#64748b', margin: '6px 0 0' }}>
                    📱 Quét mã QR bằng App ngân hàng bất kỳ để chuyển khoản tự động
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    onClick={() => setPayModalBooking(null)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: 14,
                      cursor: 'pointer'
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    disabled={payingLoading}
                    onClick={handleConfirmPayment}
                    style={{
                      flex: 2,
                      padding: '10px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#10b981',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {payingLoading ? 'Đang xử lý...' : '✅ Xác nhận đã chuyển khoản'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
