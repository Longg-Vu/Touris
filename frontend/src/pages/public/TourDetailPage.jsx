import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tourAPI, reviewAPI, bookingAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import './TourDetailPage.css';

/* ── helpers ─────────────────────────────────────────────── */
const fmt = (n) =>
  Number(n).toLocaleString('vi-VN') + ' ₫';

const renderStars = (rating, size = 16) => {
  const full  = Math.floor(rating);
  const hasHalf = rating - full >= 0.4;
  return Array.from({ length: 5 }, (_, i) => {
    if (i < full)           return <span key={i} style={{ color: '#fbbf24', fontSize: size }}>★</span>;
    if (i === full && hasHalf) return <span key={i} style={{ color: '#fbbf24', fontSize: size, opacity: .6 }}>★</span>;
    return <span key={i} style={{ color: '#e2e8f0', fontSize: size }}>★</span>;
  });
};

const avatarColors = ['#0ea5e9','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899'];

/* tag colour map */
const tagClass = (tag) => {
  const t = tag.toLowerCase();
  if (t.includes('xác nhận') || t.includes('confirm'))  return 'tdp-tag--confirm';
  if (t.includes('huỷ') || t.includes('hủy') || t.includes('cancel')) return 'tdp-tag--cancel';
  if (t.includes('đón') || t.includes('pickup'))        return 'tdp-tag--pickup';
  if (t.includes('tiếng') || t.includes('hướng dẫn'))  return 'tdp-tag--lang';
  return 'tdp-tag--generic';
};

/* static demo data enriching the real API data */
const HIGHLIGHTS = [
  { icon: '🏞️', text: 'Khám phá cảnh quan thiên nhiên tuyệt đẹp cùng hướng dẫn viên chuyên nghiệp' },
  { icon: '🚌', text: 'Xe đưa đón tận khách sạn, tiện lợi và thoải mái' },
  { icon: '🍜', text: 'Bữa trưa địa phương đặc sắc được bao gồm trong tour' },
  { icon: '📸', text: 'Dừng chân tại các điểm check-in nổi tiếng nhất' },
  { icon: '👨‍💼', text: 'Hướng dẫn viên nói tiếng Việt nhiệt tình, am hiểu văn hoá địa phương' },
  { icon: '🎫', text: 'Vé tham quan tất cả các điểm trong lịch trình đã được bao gồm' },
];

const ITINERARY = [
  { time: '07:30', desc: 'Xe đón tại khách sạn – điểm tập kết trung tâm thành phố' },
  { time: '08:00 – 10:30', desc: 'Tham quan điểm đến chính, nghe thuyết minh lịch sử và chụp ảnh lưu niệm' },
  { time: '10:30 – 12:00', desc: 'Di chuyển đến điểm tham quan thứ hai, khám phá kiến trúc và thiên nhiên' },
  { time: '12:00 – 13:30', desc: 'Thưởng thức bữa trưa tại nhà hàng địa phương với ẩm thực đặc trưng' },
  { time: '13:30 – 16:00', desc: 'Tiếp tục hành trình đến điểm cuối, trải nghiệm văn hóa bản địa' },
  { time: '16:30 – 17:00', desc: 'Xe đưa trở về khách sạn, kết thúc tour' },
];

const INCLUSIONS = [
  { icon: '✅', text: 'Xe đưa đón khứ hồi' },
  { icon: '✅', text: 'Hướng dẫn viên tiếng Việt' },
  { icon: '✅', text: 'Vé tham quan các điểm' },
  { icon: '✅', text: 'Bữa trưa' },
  { icon: '✅', text: 'Nước uống trên xe' },
  { icon: '✅', text: 'Bảo hiểm du lịch' },
  { icon: '❌', text: 'Chi phí cá nhân' },
  { icon: '❌', text: 'Tip hướng dẫn viên' },
];

const DEMO_REVIEWS = [
  { id: 1, name: 'Nguyễn Minh Tuấn', rating: 5, date: '12/09/2026', text: 'Tour rất tuyệt vời! Hướng dẫn viên nhiệt tình, xe thoải mái. Phong cảnh đẹp hơn mong đợi. Sẽ giới thiệu cho bạn bè.' },
  { id: 2, name: 'Trần Thị Mai', rating: 4, date: '05/09/2026', text: 'Trải nghiệm rất tốt, bữa trưa ngon. Chỉ tiếc thời gian tại một số điểm hơi ngắn, nhưng nhìn chung rất hài lòng.' },
  { id: 3, name: 'Lê Văn Hoàng', rating: 5, date: '28/08/2026', text: 'Đây là lần thứ 3 tôi đặt tour của công ty. Luôn được phục vụ chu đáo và chuyên nghiệp. Rất đáng tiền!' },
];

/* ────────────────────────────────────────────────────────── */
function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tour, setTour]           = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [similar, setSimilar]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  /* booking widget state */
  const [date, setDate]         = useState('');
  const [adults, setAdults]     = useState(1);
  const [children, setChildren] = useState(0);
  const [wishlist, setWishlist] = useState(false);

  /* booking modal state */
  const [showModal, setShowModal]       = useState(false);
  const [bookingStep, setBookingStep]   = useState('form');  // 'form' | 'submitting' | 'payment' | 'paying' | 'success' | 'error'
  const [bookingResult, setBookingResult] = useState(null);
  const [payMethod, setPayMethod]       = useState('bank_transfer');
  const [payError, setPayError]         = useState('');
  const [contactName, setContactName]   = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [specialReq, setSpecialReq]     = useState('');
  const [formError, setFormError]       = useState('');

  const { user, openAuthModal } = useAuth();

  /* fetch tour + reviews + similar */
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      tourAPI.getById(id),
      reviewAPI.getByTour(id).catch(() => ({ data: { results: [] } })),
    ])
      .then(([tourRes, reviewRes]) => {
        setTour(tourRes.data);
        const raw = reviewRes.data?.results ?? reviewRes.data ?? [];
        setReviews(Array.isArray(raw) ? raw : []);
        /* fetch similar (same destination, exclude current) */
        if (tourRes.data?.destination?.id) {
          tourAPI.getAll({ destination: tourRes.data.destination.id })
            .then(r => {
              const all = r.data?.results ?? r.data ?? [];
              setSimilar(all.filter(t => String(t.id) !== String(id)).slice(0, 4));
            })
            .catch(() => {});
        }
      })
      .catch(() => setError('Không thể tải thông tin tour. Vui lòng thử lại.'))
      .finally(() => setLoading(false));
  }, [id]);

  /* ── derived values ──────────────────── */
  const totalPrice = tour
    ? (parseFloat(tour.price_adult) * adults) + (parseFloat(tour.price_adult) * 0.7 * children)
    : 0;

  const displayReviews = reviews.length > 0 ? reviews : DEMO_REVIEWS;
  const avgRating = tour ? parseFloat(tour.rating) : 0;

  /* rating bar data */
  const ratingBars = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: displayReviews.filter(r => Math.round(r.rating || r.star || 5) === star).length,
    pct: 0,
  }));
  const totalRev = displayReviews.length || 1;
  ratingBars.forEach(b => { b.pct = Math.round((b.count / totalRev) * 100); });

  /* ── loading / error ─────────────────── */
  if (loading) return (
    <div className="tdp-loading">
      <div className="tdp-spinner" />
      <p>Đang tải thông tin tour…</p>
    </div>
  );
  if (error) return (
    <div className="tdp-error">
      <h2>⚠️ Đã xảy ra lỗi</h2>
      <p>{error}</p>
      <button className="tdp-btn-book" style={{ maxWidth: 200, marginTop: 20 }} onClick={() => navigate('/tours')}>← Quay lại danh sách</button>
    </div>
  );
  if (!tour) return null;

  /* thumbnail variants for gallery (demo) */
  const imgs = [tour.thumbnail, tour.thumbnail, tour.thumbnail];

  return (
    <>
    <div className="tdp-page">
      {/* ── Breadcrumb ───────────────────────────────────── */}
      <nav className="tdp-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span className="sep">›</span>
        <Link to="/tours">Tours</Link>
        {tour.destination && (
          <>
            <span className="sep">›</span>
            <Link to={`/tours?dest=${tour.destination.slug}`}>{tour.destination.name}</Link>
          </>
        )}
        <span className="sep">›</span>
        <span className="current">{tour.name.length > 60 ? tour.name.slice(0, 60) + '…' : tour.name}</span>
      </nav>

      {/* ── Gallery ──────────────────────────────────────── */}
      <section className="tdp-gallery" id="tdp-gallery">
        <div className="tdp-gallery__main">
          {tour.is_hot && <span className="tdp-hot-badge">🔥 Hot</span>}
          <img src={imgs[0]} alt={tour.name} />
        </div>
        <div className="tdp-gallery__thumb">
          <img src={imgs[1]} alt={tour.name + ' 2'} />
        </div>
        <div className="tdp-gallery__thumb">
          <img src={imgs[2]} alt={tour.name + ' 3'} />
          <div className="tdp-gallery__more-overlay">
            <span style={{ fontSize: 26 }}>🖼️</span>
            <span>Xem tất cả ảnh</span>
          </div>
        </div>
      </section>

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="tdp-body">

        {/* ════ LEFT COLUMN ════ */}
        <div className="tdp-left">

          {/* Title & meta */}
          <div className="tdp-title-area">
            {tour.destination && (
              <Link to={`/tours?dest=${tour.destination.slug}`} className="tdp-destination-link">
                📍 {tour.destination.name} →
              </Link>
            )}
            <h1 className="tdp-title">{tour.name}</h1>

            <div className="tdp-meta-row">
              <div className="tdp-rating">
                <div className="tdp-stars">{renderStars(avgRating)}</div>
                <span className="tdp-rating-score">{avgRating.toFixed(1)}</span>
                <span className="tdp-rating-count">({Number(tour.review_count).toLocaleString()} đánh giá)</span>
              </div>
              <div className="tdp-booked">
                👥 <strong>{tour.booked_count}</strong> lượt đặt
              </div>
              {tour.category && (
                <div className="tdp-booked">
                  🏷️ {tour.category.name}
                </div>
              )}
            </div>

            {/* Tags */}
            {tour.tags?.length > 0 && (
              <div className="tdp-tags">
                {tour.tags.map((tag, i) => (
                  <span key={i} className={`tdp-tag ${tagClass(tag)}`}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Highlights */}
          <section className="tdp-section" id="tdp-highlights">
            <h2 className="tdp-section-title">Điểm nổi bật</h2>
            <div className="tdp-highlights">
              {HIGHLIGHTS.map((h, i) => (
                <div key={i} className="tdp-highlight-item">
                  <div className="tdp-highlight-icon">{h.icon}</div>
                  <div className="tdp-highlight-text">{h.text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Itinerary */}
          <section className="tdp-section" id="tdp-itinerary">
            <h2 className="tdp-section-title">Lịch trình chi tiết</h2>
            <ol className="tdp-itinerary">
              {ITINERARY.map((item, i) => (
                <li key={i} className="tdp-itinerary-item">
                  <div className="tdp-itinerary-dot">{i + 1}</div>
                  <div className="tdp-itinerary-content">
                    <div className="tdp-itinerary-time">⏰ {item.time}</div>
                    <div className="tdp-itinerary-desc">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Practical info */}
          <section className="tdp-section" id="tdp-info">
            <h2 className="tdp-section-title">Thông tin thực tế</h2>
            <div className="tdp-info-grid">
              <div className="tdp-info-item">
                <span className="tdp-info-label">Thời gian</span>
                <span className="tdp-info-value">⏱️ Khoảng 8 – 9 tiếng</span>
              </div>
              <div className="tdp-info-item">
                <span className="tdp-info-label">Xuất phát</span>
                <span className="tdp-info-value">🕖 07:30 sáng</span>
              </div>
              <div className="tdp-info-item">
                <span className="tdp-info-label">Điểm đón</span>
                <span className="tdp-info-value">🏨 Tại khách sạn của bạn</span>
              </div>
              <div className="tdp-info-item">
                <span className="tdp-info-label">Ngôn ngữ</span>
                <span className="tdp-info-value">🇻🇳 Tiếng Việt</span>
              </div>
              <div className="tdp-info-item">
                <span className="tdp-info-label">Nhóm tối đa</span>
                <span className="tdp-info-value">👥 20 người</span>
              </div>
              <div className="tdp-info-item">
                <span className="tdp-info-label">Phương tiện</span>
                <span className="tdp-info-value">🚌 Xe du lịch có máy lạnh</span>
              </div>
            </div>
          </section>

          {/* Inclusions */}
          <section className="tdp-section" id="tdp-inclusions">
            <h2 className="tdp-section-title">Bao gồm / Không bao gồm</h2>
            <ul className="tdp-inclusion-list">
              {INCLUSIONS.map((item, i) => (
                <li key={i} className="tdp-inclusion-item">
                  <span>{item.icon}</span>
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cancellation policy */}
          <section className="tdp-section" id="tdp-policy">
            <h2 className="tdp-section-title">Chính sách huỷ</h2>
            <div className="tdp-policy">
              <div className="tdp-policy-item tdp-policy-item--good">
                <span className="tdp-policy-icon">✅</span>
                <div className="tdp-policy-text">
                  <strong>Miễn phí huỷ trước 24 giờ:</strong> Bạn sẽ được hoàn tiền 100% nếu huỷ tour trước giờ khởi hành ít nhất 24 giờ.
                </div>
              </div>
              <div className="tdp-policy-item tdp-policy-item--warn">
                <span className="tdp-policy-icon">⚠️</span>
                <div className="tdp-policy-text">
                  <strong>Huỷ trong vòng 24 giờ:</strong> Sẽ bị tính phí 50% giá tour. Không hoàn tiền nếu huỷ dưới 2 giờ trước khi khởi hành.
                </div>
              </div>
            </div>
          </section>

          {/* Reviews */}
          <section className="tdp-section" id="tdp-reviews">
            <h2 className="tdp-section-title">Đánh giá từ khách hàng</h2>
            <div className="tdp-reviews-summary">
              <div className="tdp-reviews-score-big">
                <div className="tdp-score-number">{avgRating.toFixed(1)}</div>
                <div className="tdp-stars">{renderStars(avgRating, 18)}</div>
                <div className="tdp-score-label">{displayReviews.length} đánh giá</div>
              </div>
              <div className="tdp-review-bars">
                {ratingBars.map(b => (
                  <div key={b.star} className="tdp-bar-row">
                    <span className="tdp-bar-label">{b.star} ★</span>
                    <div className="tdp-bar-track">
                      <div className="tdp-bar-fill" style={{ width: `${b.pct}%` }} />
                    </div>
                    <span className="tdp-bar-count">{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="tdp-review-list">
              {displayReviews.length === 0 ? (
                <div className="tdp-no-review">💬 Chưa có đánh giá nào. Hãy là người đầu tiên!</div>
              ) : (
                displayReviews.map((rev, idx) => {
                  const initials = (rev.name || rev.user || 'KH').slice(0, 2).toUpperCase();
                  const color = avatarColors[idx % avatarColors.length];
                  return (
                    <div key={rev.id || idx} className="tdp-review-card">
                      <div className="tdp-review-header">
                        <div className="tdp-reviewer-avatar-placeholder" style={{ background: color }}>
                          {initials}
                        </div>
                        <div className="tdp-reviewer-info">
                          <div className="tdp-reviewer-name">{rev.name || rev.user || 'Khách hàng'}</div>
                          <div className="tdp-review-date">{rev.date || rev.created_at?.slice(0, 10) || '2026'}</div>
                        </div>
                        <div className="tdp-review-stars">
                          {Array.from({ length: Math.round(rev.rating || rev.star || 5) }, (_, i) => (
                            <span key={i} className="tdp-review-star">★</span>
                          ))}
                        </div>
                      </div>
                      <p className="tdp-review-text">{rev.text || rev.comment || ''}</p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Map */}
          <section className="tdp-section" id="tdp-map">
            <h2 className="tdp-section-title">Bản đồ điểm xuất phát</h2>
            <div className="tdp-map">
              <div className="tdp-map-placeholder">
                <span style={{ fontSize: 48 }}>🗺️</span>
                <span>Bản đồ – {tour.destination?.name || 'điểm đến'}</span>
                <span style={{ fontSize: 12, opacity: .7 }}>Điểm đón tại khách sạn của bạn</span>
              </div>
            </div>
          </section>
        </div>

        {/* ════ RIGHT COLUMN – Booking widget ════ */}
        <aside className="tdp-booking-widget" id="tdp-booking-widget">
          <div className="tdp-widget-header">
            <div className="tdp-widget-price-label">Giá từ</div>
            <div className="tdp-widget-price">
              {fmt(tour.price_adult)} <span>/ người lớn</span>
            </div>
            {tour.promo && (
              <span className="tdp-widget-promo">🎉 {tour.promo}</span>
            )}
          </div>

          <div className="tdp-widget-body">
            {/* Date */}
            <div className="tdp-widget-field">
              <label className="tdp-widget-label" htmlFor="tdp-date">📅 Chọn ngày</label>
              <input
                id="tdp-date"
                type="date"
                className="tdp-widget-input"
                value={date}
                min={new Date().toISOString().slice(0, 10)}
                onChange={e => setDate(e.target.value)}
              />
            </div>

            {/* Guests */}
            <div className="tdp-widget-field">
              <label className="tdp-widget-label">👤 Số khách</label>
              <div className="tdp-guest-row">
                <div>
                  <div className="tdp-guest-type">Người lớn</div>
                  <div className="tdp-guest-sub">Từ 12 tuổi trở lên</div>
                </div>
                <div className="tdp-guest-controls">
                  <button className="tdp-guest-btn" id="tdp-adults-dec" onClick={() => setAdults(a => Math.max(1, a - 1))} disabled={adults <= 1}>−</button>
                  <span className="tdp-guest-count">{adults}</span>
                  <button className="tdp-guest-btn" id="tdp-adults-inc" onClick={() => setAdults(a => Math.min(20, a + 1))}>+</button>
                </div>
              </div>
              <div className="tdp-guest-row">
                <div>
                  <div className="tdp-guest-type">Trẻ em</div>
                  <div className="tdp-guest-sub">Từ 3 – 11 tuổi (70%)</div>
                </div>
                <div className="tdp-guest-controls">
                  <button className="tdp-guest-btn" id="tdp-children-dec" onClick={() => setChildren(c => Math.max(0, c - 1))} disabled={children <= 0}>−</button>
                  <span className="tdp-guest-count">{children}</span>
                  <button className="tdp-guest-btn" id="tdp-children-inc" onClick={() => setChildren(c => Math.min(20, c + 1))}>+</button>
                </div>
              </div>
            </div>

            {/* Price summary */}
            <div className="tdp-price-summary">
              {adults > 0 && (
                <div className="tdp-price-row">
                  <span>Người lớn × {adults}</span>
                  <span>{fmt(parseFloat(tour.price_adult) * adults)}</span>
                </div>
              )}
              {children > 0 && (
                <div className="tdp-price-row">
                  <span>Trẻ em × {children}</span>
                  <span>{fmt(parseFloat(tour.price_adult) * 0.7 * children)}</span>
                </div>
              )}
              <div className="tdp-price-row tdp-price-row--total">
                <span>Tổng cộng</span>
                <span className="amount">{fmt(totalPrice)}</span>
              </div>
            </div>

            <button
              id="tdp-btn-book"
              className="tdp-btn-book"
              onClick={() => {
                /* Bước 1: Kiểm tra đăng nhập TRƯỚC */
                if (!user) {
                  openAuthModal('login');
                  return;
                }
                /* Bước 2: Kiểm tra ngày */
                if (!date) {
                  alert('Vui lòng chọn ngày khởi hành!');
                  return;
                }
                // Pre-fill từ profile user
                setContactName(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username);
                setContactEmail(user.email || '');
                setContactPhone(user.phone || '');
                setBookingStep('form');
                setFormError('');
                setShowModal(true);
              }}
            >
              🎫 Đặt ngay
            </button>
            <button
              id="tdp-btn-wishlist"
              className={`tdp-btn-wishlist ${wishlist ? 'active' : ''}`}
              onClick={() => setWishlist(w => !w)}
            >
              {wishlist ? '❤️ Đã lưu' : '🤍 Lưu yêu thích'}
            </button>
          </div>

          <div className="tdp-widget-footer">
            <div className="tdp-trust-item">✅ Xác nhận tức thời – không cần chờ đợi</div>
            <div className="tdp-trust-item">🔒 Thanh toán an toàn & bảo mật</div>
            <div className="tdp-trust-item">💬 Hỗ trợ khách hàng 24/7</div>
          </div>
        </aside>
      </div>

      {/* ── Similar tours ────────────────────────────── */}
      {similar.length > 0 && (
        <section className="tdp-similar" id="tdp-similar">
          <h2 className="tdp-similar-title">Tour tương tự tại {tour.destination?.name}</h2>
          <div className="tdp-similar-grid">
            {similar.map(t => (
              <Link key={t.id} to={`/tours/${t.id}`} className="tdp-similar-card">
                <img src={t.thumbnail} alt={t.name} className="tdp-similar-img" loading="lazy" />
                <div className="tdp-similar-info">
                  <div className="tdp-similar-name">{t.name}</div>
                  <div className="tdp-similar-meta">
                    <span className="tdp-similar-price">{fmt(t.price_adult)}</span>
                    <span className="tdp-similar-rating">
                      ★ {parseFloat(t.rating).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>

      {/* ── Booking Modal ─────────────────────────────── */}
      {showModal && (
        <div className="bm-overlay" onClick={(e) => { if (e.target.classList.contains('bm-overlay')) setShowModal(false); }}>
          <div className="bm-modal">
            {/* Header */}
            <div className="bm-header">
              <h2 className="bm-title">Xác nhận đặt tour</h2>
              <button className="bm-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Tour summary */}
            <div className="bm-tour-summary">
              <img src={tour.thumbnail} alt={tour.name} className="bm-tour-thumb" />
              <div className="bm-tour-info">
                <div className="bm-tour-name">{tour.name}</div>
                <div className="bm-tour-meta">
                  <span>📅 {date}</span>
                  <span>👥 {adults} NL{children > 0 ? ` + ${children} TE` : ''}</span>
                </div>
                <div className="bm-tour-price">Tổng: <strong>{fmt(totalPrice)}</strong></div>
              </div>
            </div>

            {/* Step: form */}
            {bookingStep === 'form' && (
              <>
                <div className="bm-section-title">Thông tin liên hệ</div>
                {formError && <div className="bm-error">{formError}</div>}
                <div className="bm-form">
                  <div className="bm-field">
                    <label className="bm-label">Họ và tên *</label>
                    <input
                      id="bm-contact-name"
                      className="bm-input"
                      placeholder="Nguyễn Văn A"
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="bm-field">
                    <label className="bm-label">Số điện thoại *</label>
                    <input
                      id="bm-contact-phone"
                      className="bm-input"
                      placeholder="0901234567"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                    />
                  </div>
                  <div className="bm-field bm-field--full">
                    <label className="bm-label">Email *</label>
                    <input
                      id="bm-contact-email"
                      className="bm-input"
                      placeholder="email@example.com"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="bm-field bm-field--full">
                    <label className="bm-label">Yêu cầu đặc biệt (tuỳ chọn)</label>
                    <textarea
                      id="bm-special-req"
                      className="bm-input bm-textarea"
                      placeholder="Ăn chay, dị ứng thực phẩm, xe lăn..."
                      value={specialReq}
                      onChange={e => setSpecialReq(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="bm-policy-note">
                  ✅ Miễn phí huỷ trước 24h – Xác nhận tức thời
                </div>
                <div className="bm-actions">
                  <button className="bm-btn-cancel" onClick={() => setShowModal(false)}>Huỷ bỏ</button>
                  <button
                    id="bm-btn-confirm"
                    className="bm-btn-confirm"
                    onClick={async () => {
                      if (!contactName.trim()) { setFormError('Vui lòng nhập họ tên.'); return; }
                      if (!contactPhone.trim()) { setFormError('Vui lòng nhập số điện thoại.'); return; }
                      if (!contactEmail.trim()) { setFormError('Vui lòng nhập email.'); return; }
                      setFormError('');
                      setBookingStep('submitting');
                      try {
                        const res = await bookingAPI.create({
                          tour: tour.id,
                          travel_date: date,
                          num_adults: adults,
                          num_children: children,
                          contact_name: contactName.trim(),
                          contact_phone: contactPhone.trim(),
                          contact_email: contactEmail.trim(),
                          special_request: specialReq.trim(),
                        });
                        setBookingResult(res.data);
                        setPayMethod('bank_transfer');
                        setPayError('');
                        setBookingStep('payment'); // Chuyển sang bước chọn thanh toán
                      } catch (err) {
                        const msg = err.response?.data?.detail
                          || Object.values(err.response?.data || {})[0]
                          || 'Đặt tour thất bại. Vui lòng thử lại.';
                        setFormError(Array.isArray(msg) ? msg[0] : msg);
                        setBookingStep('form');
                      }
                    }}
                  >
                    ✅ Xác nhận đặt tour
                  </button>
                </div>
              </>
            )}

            {/* Step: submitting */}
            {bookingStep === 'submitting' && (
              <div className="bm-loading">
                <div className="bm-spinner" />
                <p>Đang xử lý đặt tour…</p>
              </div>
            )}

            {/* Step: payment */}
            {bookingStep === 'payment' && (
              <div className="bm-payment">
                <div className="bm-success-icon" style={{ fontSize: 40, marginBottom: 8 }}>🎫</div>
                <h3 style={{ margin: '0 0 4px', color: '#1e293b' }}>Đặt tour thành công!</h3>
                <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 14 }}>
                  Mã đơn: <strong>#{bookingResult?.id}</strong> – Chọn phương thức thanh toán để hoàn tất
                </p>

                {/* Chọn phương thức */}
                <div className="bm-pay-methods">
                  {[
                    { key: 'bank_transfer', icon: '🏦', label: 'Chuyển khoản ngân hàng (VietQR)', sub: 'Quét mã QR bên dưới' },
                    { key: 'cash',          icon: '💵', label: 'Thanh toán tiền mặt tại văn phòng', sub: 'Mang mã đơn đến văn phòng' },
                    { key: 'card',          icon: '💳', label: 'Thẻ tín dụng / Ghi nợ (Demo)', sub: 'Điền thông tin thẻ test' },
                  ].map(m => (
                    <button
                      key={m.key}
                      className={`bm-pay-method-btn ${payMethod === m.key ? 'active' : ''}`}
                      onClick={() => setPayMethod(m.key)}
                    >
                      <span className="bm-pm-icon">{m.icon}</span>
                      <div>
                        <div className="bm-pm-label">{m.label}</div>
                        <div className="bm-pm-sub">{m.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* VietQR demo khi chọn chuyển khoản */}
                {payMethod === 'bank_transfer' && (
                  <div className="bm-qr-box">
                    <div className="bm-qr-info">
                      <div className="bm-qr-row"><span>Ngân hàng:</span><strong>MB Bank – 0797268696</strong></div>
                      <div className="bm-qr-row"><span>Chủ TK:</span><strong>CONG TY DU LICH TOUR FOR YOU</strong></div>
                      <div className="bm-qr-row"><span>Số tiền:</span><strong style={{ color: '#ef4444' }}>{fmt(bookingResult?.total_price || totalPrice)}</strong></div>
                      <div className="bm-qr-row"><span>Nội dung:</span><strong>BOOKING {bookingResult?.id} {contactName.split(' ').pop()}</strong></div>
                    </div>
                    <img
                      src={`https://img.vietqr.io/image/MB-0797268696-compact2.png?amount=${bookingResult?.total_price || totalPrice}&addInfo=BOOKING${bookingResult?.id}&accountName=TOUR FOR YOU`}
                      alt="VietQR thanh toán"
                      className="bm-qr-img"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <p className="bm-qr-note">📱 Mở app ngân hàng → Quét QR → Kiểm tra thông tin → Chuyển khoản</p>
                  </div>
                )}

                {payMethod === 'cash' && (
                  <div className="bm-cash-info">
                    <p>📍 Văn phòng công ty: <strong>123 Nguyễn Huệ, Quận 1, TP.HCM</strong></p>
                    <p>🕐 Giờ làm việc: Thứ 2 – Thứ 7, 8:00 – 18:00</p>
                    <p>📞 Hotline: <strong>1900 1234</strong></p>
                    <p style={{ color: '#f59e0b', fontWeight: 600 }}>Vui lòng mang mã đơn <strong>#{bookingResult?.id}</strong> khi đến thanh toán.</p>
                  </div>
                )}

                {payMethod === 'card' && (
                  <div className="bm-card-demo">
                    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>🧪 Chế độ test – Nhập thông tin bất kỳ để tiếp tục</p>
                    <div className="bm-form">
                      <div className="bm-field bm-field--full">
                        <label className="bm-label">Số thẻ</label>
                        <input className="bm-input" placeholder="4111 1111 1111 1111" readOnly value="4111 1111 1111 1111" />
                      </div>
                      <div className="bm-field"><label className="bm-label">Hết hạn</label><input className="bm-input" placeholder="12/28" readOnly value="12/28" /></div>
                      <div className="bm-field"><label className="bm-label">CVV</label><input className="bm-input" placeholder="123" readOnly value="123" /></div>
                    </div>
                  </div>
                )}

                {payError && <div className="bm-error" style={{ marginTop: 12 }}>{payError}</div>}

                <div className="bm-actions" style={{ marginTop: 16 }}>
                  <button className="bm-btn-cancel" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
                    Thanh toán sau
                  </button>
                  <button
                    className="bm-btn-confirm"
                    onClick={async () => {
                      setPayError('');
                      setBookingStep('paying');
                      try {
                        await bookingAPI.pay(bookingResult.id, payMethod);
                        setBookingStep('success');
                      } catch (err) {
                        const msg = err.response?.data?.detail || 'Thanh toán thất bại. Vui lòng thử lại.';
                        setPayError(msg);
                        setBookingStep('payment');
                      }
                    }}
                  >
                    ✅ Xác nhận đã thanh toán
                  </button>
                </div>
              </div>
            )}

            {/* Step: paying */}
            {bookingStep === 'paying' && (
              <div className="bm-loading">
                <div className="bm-spinner" />
                <p>Đang xác nhận thanh toán…</p>
              </div>
            )}

            {/* Step: success */}
            {bookingStep === 'success' && (
              <div className="bm-success">
                <div className="bm-success-icon">✅</div>
                <h3>Thanh toán thành công!</h3>
                <p>Mã đặt tour của bạn: <strong>#{bookingResult?.id}</strong></p>
                <p>Chúng tôi sẽ gửi xác nhận đến email <strong>{contactEmail}</strong> trong vòng 30 phút.</p>
                <div className="bm-success-actions">
                  <button className="bm-btn-confirm" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
                    Xem lịch sử đặt tour
                  </button>
                  <button className="bm-btn-cancel" onClick={() => setShowModal(false)}>Đóng</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default TourDetailPage;
