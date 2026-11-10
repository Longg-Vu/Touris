import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { tourAPI, reviewAPI, bookingAPI, consultationAPI } from '../../api/services';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
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

/* static default data fallback in case tour has not populated custom data yet */
const DEFAULT_HIGHLIGHTS = [
  { icon: '🏞️', text: 'Khám phá cảnh quan thiên nhiên tuyệt đẹp cùng hướng dẫn viên chuyên nghiệp' },
  { icon: '🚌', text: 'Xe đưa đón tận khách sạn, tiện lợi và thoải mái' },
  { icon: '🍜', text: 'Bữa trưa địa phương đặc sắc được bao gồm trong tour' },
  { icon: '📸', text: 'Dừng chân tại các điểm check-in nổi tiếng nhất' },
  { icon: '👨‍💼', text: 'Hướng dẫn viên nói tiếng Việt nhiệt tình, am hiểu văn hoá địa phương' },
  { icon: '🎫', text: 'Vé tham quan tất cả các điểm trong lịch trình đã được bao gồm' },
];

const DEFAULT_ITINERARY = [
  { time: '07:30 - 08:30', desc: 'Xe đón tại khách sạn – điểm tập kết trung tâm thành phố' },
  { time: '08:30 – 10:30', desc: 'Tham quan điểm đến chính, nghe thuyết minh lịch sử và chụp ảnh lưu niệm' },
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

/* ────────────────────────────────────────────────────────── */
function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [tour, setTour]           = useState(null);
  const [reviews, setReviews]     = useState([]);
  const [similar, setSimilar]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  /* review submission state */
  const [canReviewData, setCanReviewData]       = useState(null);
  const [userRating, setUserRating]             = useState(5);
  const [hoverRating, setHoverRating]           = useState(0);
  const [userComment, setUserComment]           = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError]           = useState('');
  const [reviewSuccess, setReviewSuccess]       = useState('');
  const [deletingReviewId, setDeletingReviewId] = useState(null);

  /* booking widget state */
  const [date, setDate]         = useState('');
  const [adults, setAdults]     = useState(1);
  const [children, setChildren] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();

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
  const [copiedCode, setCopiedCode]     = useState(false);

  /* consultation modal state */
  const [showConsultModal, setShowConsultModal]   = useState(false);
  const [consultName, setConsultName]             = useState('');
  const [consultPhone, setConsultPhone]           = useState('');
  const [consultEmail, setConsultEmail]           = useState('');
  const [consultNote, setConsultNote]             = useState('');
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultSuccess, setConsultSuccess]       = useState(false);
  const [consultError, setConsultError]           = useState('');

  /* photo gallery lightbox state */
  const [lightboxOpen, setLightboxOpen]           = useState(false);
  const [lightboxIdx, setLightboxIdx]             = useState(0);

  const { user, openAuthModal } = useAuth();

  /* fetch tour + reviews + similar */
  const fetchReviewsAndPermissions = async () => {
    try {
      const reviewRes = await reviewAPI.getByTour(id);
      const raw = reviewRes.data?.results ?? reviewRes.data ?? [];
      setReviews(Array.isArray(raw) ? raw : []);
    } catch {
      setReviews([]);
    }
    if (user) {
      try {
        const canRes = await reviewAPI.canReview(id);
        setCanReviewData(canRes.data);
      } catch {
        setCanReviewData(null);
      }
    } else {
      setCanReviewData(null);
    }
  };

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

  useEffect(() => {
    if (user && id) {
      reviewAPI.canReview(id)
        .then(res => setCanReviewData(res.data))
        .catch(() => setCanReviewData(null));
    } else {
      setCanReviewData(null);
    }
  }, [user, id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (userComment.trim().length < 5) {
      setReviewError('Vui lòng nhập nhận xét ít nhất 5 ký tự.');
      return;
    }
    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await reviewAPI.create({
        tour: id,
        rating: userRating,
        comment: userComment.trim(),
      });
      setUserComment('');
      setUserRating(5);
      setReviewSuccess('Cảm ơn bạn! Đánh giá đã được đăng thành công.');
      await fetchReviewsAndPermissions();
      const updatedTour = await tourAPI.getById(id);
      setTour(updatedTour.data);
    } catch (err) {
      const msg = err.response?.data?.detail
        || Object.values(err.response?.data || {})[0]
        || 'Gửi đánh giá thất bại. Vui lòng thử lại.';
      setReviewError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Bạn có chắc muốn xoá đánh giá này?')) return;
    setDeletingReviewId(reviewId);
    try {
      await reviewAPI.delete(reviewId);
      await fetchReviewsAndPermissions();
      const updatedTour = await tourAPI.getById(id);
      setTour(updatedTour.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể xoá đánh giá.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  /* ── consultation handlers ───────────── */
  const handleOpenConsultModal = () => {
    if (user) {
      setConsultName(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username);
      setConsultEmail(user.email || '');
      setConsultPhone(user.phone || '');
    } else {
      try {
        const savedGuest = JSON.parse(localStorage.getItem('guest_contact') || '{}');
        if (savedGuest.name) setConsultName(savedGuest.name);
        if (savedGuest.phone) setConsultPhone(savedGuest.phone);
        if (savedGuest.email) setConsultEmail(savedGuest.email);
      } catch {
        // ignore
      }
    }
    setConsultNote('');
    setConsultSuccess(false);
    setConsultError('');
    setShowConsultModal(true);
  };

  const handleSubmitConsultation = async (e) => {
    e.preventDefault();
    if (!consultName.trim()) {
      setConsultError('Vui lòng nhập họ và tên của bạn.');
      return;
    }
    if (!consultPhone.trim()) {
      setConsultError('Vui lòng nhập số điện thoại để chúng tôi liên hệ tư vấn.');
      return;
    }
    if (!consultEmail.trim()) {
      setConsultError('Vui lòng nhập email để nhận lịch trình và xác nhận hỗ trợ.');
      return;
    }

    setConsultSubmitting(true);
    setConsultError('');
    try {
      await consultationAPI.create({
        tour_id: tour.id,
        customer_name: consultName.trim(),
        phone: consultPhone.trim(),
        email: consultEmail.trim(),
        note: consultNote.trim(),
      });
      try {
        localStorage.setItem('guest_contact', JSON.stringify({
          name: consultName.trim(),
          phone: consultPhone.trim(),
          email: consultEmail.trim(),
        }));
      } catch {
        // ignore
      }
      setConsultSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.customer_name?.[0]
        || err.response?.data?.phone?.[0]
        || err.response?.data?.email?.[0]
        || err.response?.data?.detail
        || 'Gửi yêu cầu không thành công. Vui lòng kiểm tra lại thông tin và thử lại!';
      setConsultError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setConsultSubmitting(false);
    }
  };

  /* ── derived values ──────────────────── */
  const effectivePriceAdult = tour
    ? (tour.is_priority_sale && tour.sale_percent > 0 && tour.sale_price
        ? parseFloat(tour.sale_price)
        : parseFloat(tour.price_adult))
    : 0;

  const totalPrice = tour
    ? (effectivePriceAdult * adults) + (effectivePriceAdult * 0.7 * children)
    : 0;

  const displayReviews = reviews;
  const avgRating = tour ? parseFloat(tour.rating) : 0;

  /* rating bar data */
  const ratingBars = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: displayReviews.filter(r => Math.round(r.rating || 5) === star).length,
    pct: 0,
  }));
  const totalRev = displayReviews.length || 1;
  ratingBars.forEach(b => { b.pct = Math.round((b.count / totalRev) * 100); });

  /* dynamic highlights & itinerary with fallback */
  const tourHighlights = (tour?.highlights && Array.isArray(tour.highlights) && tour.highlights.length > 0)
    ? tour.highlights
    : DEFAULT_HIGHLIGHTS;

  const tourItinerary = (tour?.itinerary && Array.isArray(tour.itinerary) && tour.itinerary.length > 0)
    ? tour.itinerary
    : DEFAULT_ITINERARY;

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

  /* ── build HD gallery (5-6 distinct photos) ── */
  const upgradeToHd = (url) => {
    if (!url) return '';
    return url.replace('w_500,h_313,c_fill,q_85', 'w_1200,h_800,c_fill,q_90');
  };
  const fallbackScenery = [
    'https://res.klook.com/image/upload/w_1200,h_800,c_fill,q_90/activities/d4qvu1nvhzpue5thgs2u.webp',
    'https://res.klook.com/image/upload/w_1200,h_800,c_fill,q_90/activities/vhjgb3krsepzdzboth4h.webp',
    'https://res.klook.com/image/upload/w_1200,h_800,c_fill,q_90/activities/c1dndlvxxxfgnj8spbgo.webp',
    'https://res.klook.com/image/upload/w_1200,h_800,c_fill,q_90/activities/mggyeli2qotfpcvbx0zg.webp',
    'https://res.klook.com/image/upload/w_1200,h_800,c_fill,q_90/activities/atxlxektyt8nfatloug0.webp',
  ];
  const rawGallery = Array.isArray(tour.gallery) && tour.gallery.length > 0
    ? tour.gallery.map(upgradeToHd).filter(Boolean)
    : [];
  const mainThumbHd = upgradeToHd(tour.thumbnail);
  const imgs = [];
  if (mainThumbHd) imgs.push(mainThumbHd);
  for (const gUrl of [...rawGallery, ...fallbackScenery]) {
    if (gUrl && !imgs.includes(gUrl)) imgs.push(gUrl);
    if (imgs.length >= 6) break;
  }

  const openLightbox = (index = 0) => {
    setLightboxIdx(index);
    setLightboxOpen(true);
  };
  const handleImgError = (e, idx = 0) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackScenery[idx % fallbackScenery.length];
  };

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

      {/* ── Gallery (5-photo Bento Grid + Lightbox Trigger) ─ */}
      <section className="tdp-gallery" id="tdp-gallery">
        <div className="tdp-gallery__main" onClick={() => openLightbox(0)}>
          <div className="tdp-gallery-badges">
            {Boolean(tour.is_hot) && <span className="tdp-hot-badge">🔥 Hot</span>}
            {Boolean(tour.is_priority_sale && Number(tour.sale_percent) > 0) && (
              <span className="tdp-sale-badge">⚡ SALE {tour.sale_percent}%</span>
            )}
          </div>
          <img src={imgs[0]} alt={tour.name} onError={(e) => handleImgError(e, 0)} />
          <div className="tdp-gallery__caption-pill">📸 Khám phá thực tế</div>
        </div>

        {imgs.slice(1, 5).map((imgUrl, idx) => {
          const actualIdx = idx + 1;
          const isLastCell = idx === 3;
          return (
            <div
              key={actualIdx}
              className="tdp-gallery__thumb"
              onClick={() => openLightbox(actualIdx)}
            >
              <img
                src={imgUrl}
                alt={`${tour.name} - Góc chụp ${actualIdx + 1}`}
                onError={(e) => handleImgError(e, actualIdx)}
              />
              {isLastCell && (
                <div
                  className="tdp-gallery__more-overlay"
                  onClick={(e) => {
                    e.stopPropagation();
                    openLightbox(0);
                  }}
                >
                  <span style={{ fontSize: 24 }}>🖼️</span>
                  <span>Xem tất cả {imgs.length} ảnh</span>
                </div>
              )}
            </div>
          );
        })}
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

            {tour.is_priority_sale && tour.sale_percent > 0 && (
              <div className="tdp-flash-sale-banner">
                <span className="tdp-flash-sale-icon">⚡</span>
                <div className="tdp-flash-sale-info">
                  <strong>Ưu đãi Flash Sale chốt đoàn: Giảm ngay {tour.sale_percent}%</strong>
                  <span>Số lượng chỗ ưu đãi có hạn – Đặt ngay hôm nay để nhận mức giá tốt nhất!</span>
                </div>
              </div>
            )}

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
              {tourHighlights.map((h, i) => (
                <div key={i} className="tdp-highlight-item">
                  <div className="tdp-highlight-icon">{h.icon}</div>
                  <div className="tdp-highlight-text">{h.text}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Guide info */}
          {tour.guide && (
            <section className="tdp-section" id="tdp-guide">
              <h2 className="tdp-section-title">Hướng dẫn viên phụ trách</h2>
              <div className="tdp-guide-card">
                <div className="tdp-guide-avatar-wrap">
                  {tour.guide.avatar ? (
                    <img src={tour.guide.avatar} alt={tour.guide.name} className="tdp-guide-avatar-img" />
                  ) : (
                    <div className="tdp-guide-avatar-fallback">
                      {(tour.guide.name || 'HDV').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="tdp-guide-badge" title="Đã được chứng nhận">✓</span>
                </div>
                <div className="tdp-guide-info">
                  <div className="tdp-guide-top">
                    <h3 className="tdp-guide-name">{tour.guide.name}</h3>
                    <span className="tdp-guide-role-tag">👷 HDV Chính thức</span>
                  </div>
                  <p className="tdp-guide-desc">
                    Người đồng hành, phụ trách thuyết minh và hỗ trợ an toàn cho bạn trong suốt chuyến đi.
                  </p>
                  <div className="tdp-guide-meta">
                    {tour.guide.phone && (
                      <span className="tdp-guide-phone">📞 Liên hệ / Zalo: <strong>{tour.guide.phone}</strong></span>
                    )}
                    <span className="tdp-guide-badge-note">🛡️ Hỗ trợ tận tâm 24/7</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Itinerary */}
          <section className="tdp-section" id="tdp-itinerary">
            <h2 className="tdp-section-title">Lịch trình chi tiết</h2>
            <ol className="tdp-itinerary">
              {tourItinerary.map((item, i) => (
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
            <h2 className="tdp-section-title">Đánh giá từ khách hàng ({displayReviews.length})</h2>

            {/* Thống kê tổng quan */}
            <div className="tdp-reviews-summary">
              <div className="tdp-reviews-score-big">
                <div className="tdp-score-number">{avgRating > 0 ? avgRating.toFixed(1) : '5.0'}</div>
                <div className="tdp-stars">{renderStars(avgRating > 0 ? avgRating : 5, 18)}</div>
                <div className="tdp-score-label">{displayReviews.length} đánh giá thực tế</div>
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

            {/* Banners & Form gửi đánh giá */}
            {!user && (
              <div className="tdp-review-banner tdp-review-banner--info">
                <div>
                  <strong>Bạn đã từng tham gia tour này?</strong>
                  <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.85 }}>Đăng nhập tài khoản để chia sẻ cảm nhận và hình ảnh chuyến đi của bạn.</p>
                </div>
                <button className="tdp-review-banner-btn" onClick={() => openAuthModal('login')}>
                  🔑 Đăng nhập để đánh giá
                </button>
              </div>
            )}

            {user && canReviewData?.has_reviewed && (
              <div className="tdp-review-banner tdp-review-banner--done">
                <span>🎉 <strong>Bạn đã gửi đánh giá cho tour này.</strong> Cảm ơn bạn đã đồng hành và chia sẻ trải nghiệm cùng chúng tôi!</span>
              </div>
            )}

            {user && !canReviewData?.can_review && !canReviewData?.has_reviewed && canReviewData?.message && (
              <div className="tdp-review-banner tdp-review-banner--info">
                <span>ℹ️ {canReviewData.message}</span>
              </div>
            )}

            {user && canReviewData?.can_review && (
              <form className="tdp-write-review-card" onSubmit={handleSubmitReview}>
                <h3 className="tdp-review-form-title">
                  ✍️ Viết đánh giá & nhận xét của bạn
                </h3>

                {reviewSuccess && (
                  <div className="tdp-review-alert tdp-review-alert--success">
                    ✅ {reviewSuccess}
                  </div>
                )}
                {reviewError && (
                  <div className="tdp-review-alert tdp-review-alert--error">
                    ⚠️ {reviewError}
                  </div>
                )}

                {/* Chọn số sao */}
                <div className="tdp-rating-input-row">
                  <span className="tdp-rating-input-label">Mức độ hài lòng:</span>
                  <div className="tdp-stars-selector">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const isFilled = star <= (hoverRating || userRating);
                      return (
                        <button
                          key={star}
                          type="button"
                          className="tdp-star-btn"
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setUserRating(star)}
                        >
                          <span style={{ color: isFilled ? '#fbbf24' : '#cbd5e1' }}>★</span>
                        </button>
                      );
                    })}
                  </div>
                  <span className="tdp-star-rating-hint">
                    {(() => {
                      const score = hoverRating || userRating;
                      if (score === 5) return '⭐⭐⭐⭐⭐ Tuyệt vời!';
                      if (score === 4) return '⭐⭐⭐⭐ Rất hài lòng';
                      if (score === 3) return '⭐⭐⭐ Bình thường';
                      if (score === 2) return '⭐⭐ Không hài lòng';
                      return '⭐ Rất tệ';
                    })()}
                  </span>
                </div>

                {/* Nhập nội dung nhận xét */}
                <textarea
                  className="tdp-review-textarea"
                  placeholder="Chia sẻ trải nghiệm thực tế của bạn về hướng dẫn viên, phương tiện di chuyển, bữa ăn, cảnh quan và dịch vụ..."
                  rows={4}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  maxLength={1000}
                />

                <div className="tdp-review-form-actions">
                  <span className="tdp-review-char-count">{userComment.length} / 1000 ký tự (tối thiểu 5)</span>
                  <button
                    type="submit"
                    className="tdp-btn-submit-review"
                    disabled={submittingReview || userComment.trim().length < 5}
                  >
                    {submittingReview ? 'Đang gửi...' : '🚀 Gửi đánh giá ngay'}
                  </button>
                </div>
              </form>
            )}

            {/* Danh sách các bài đánh giá */}
            <div className="tdp-review-list">
              {displayReviews.length === 0 ? (
                <div className="tdp-no-review">💬 Chưa có đánh giá nào. Hãy là người đầu tiên trải nghiệm và chia sẻ cảm nhận!</div>
              ) : (
                displayReviews.map((rev, idx) => {
                  const authorName = rev.user_name || rev.name || rev.user || 'Khách hàng';
                  const initials = authorName.slice(0, 2).toUpperCase();
                  const color = avatarColors[idx % avatarColors.length];
                  const canDelete = rev.is_mine || (user && (user.is_staff || user.is_superuser));

                  return (
                    <div key={rev.id || idx} className="tdp-review-card">
                      <div className="tdp-review-header">
                        {rev.user_avatar ? (
                          <img
                            src={rev.user_avatar}
                            alt={authorName}
                            className="tdp-reviewer-avatar-img"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="tdp-reviewer-avatar-placeholder" style={{ background: color }}>
                            {initials}
                          </div>
                        )}
                        <div className="tdp-reviewer-info">
                          <div className="tdp-reviewer-name">
                            {authorName}
                            <span className="tdp-review-badge-verified">✓ Đã trải nghiệm</span>
                          </div>
                          <div className="tdp-review-date">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString('vi-VN') : (rev.date || 'Gần đây')}
                          </div>
                        </div>
                        <div className="tdp-review-stars">
                          {Array.from({ length: Math.round(rev.rating || rev.star || 5) }, (_, i) => (
                            <span key={i} className="tdp-review-star">★</span>
                          ))}
                        </div>
                        {canDelete && (
                          <button
                            className="tdp-review-delete-btn"
                            title="Xoá đánh giá"
                            disabled={deletingReviewId === rev.id}
                            onClick={() => handleDeleteReview(rev.id)}
                          >
                            {deletingReviewId === rev.id ? 'Đang xoá...' : '🗑️ Xoá'}
                          </button>
                        )}
                      </div>
                      <p className="tdp-review-text">{rev.comment || rev.text || ''}</p>
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
            {tour.is_priority_sale && tour.sale_percent > 0 ? (
              <div className="tdp-widget-sale-block">
                <div className="tdp-widget-original-price">
                  <span>{fmt(tour.price_adult)}</span>
                  <span className="tdp-widget-sale-badge">⚡ SALE {tour.sale_percent}%</span>
                </div>
                <div className="tdp-widget-price sale-price-highlight">
                  {fmt(effectivePriceAdult)} <span>/ người lớn</span>
                </div>
              </div>
            ) : (
              <div className="tdp-widget-price">
                {fmt(tour.price_adult)} <span>/ người lớn</span>
              </div>
            )}
            {tour.promo && (
              <span className="tdp-widget-promo">🏷️ {tour.promo}</span>
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
                  <span>{fmt(effectivePriceAdult * adults)}</span>
                </div>
              )}
              {children > 0 && (
                <div className="tdp-price-row">
                  <span>Trẻ em × {children}</span>
                  <span>{fmt(effectivePriceAdult * 0.7 * children)}</span>
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
                /* Kiểm tra chọn ngày trước */
                if (!date) {
                  alert('Vui lòng chọn ngày khởi hành!');
                  return;
                }
                // Pre-fill từ profile user nếu đã đăng nhập, hoặc lấy thông tin khách gần nhất từ localStorage
                if (user) {
                  setContactName(user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username);
                  setContactEmail(user.email || '');
                  setContactPhone(user.phone || '');
                } else {
                  try {
                    const savedGuest = JSON.parse(localStorage.getItem('guest_contact') || '{}');
                    if (savedGuest.name) setContactName(savedGuest.name);
                    if (savedGuest.phone) setContactPhone(savedGuest.phone);
                    if (savedGuest.email) setContactEmail(savedGuest.email);
                  } catch {
                    // ignore
                  }
                }
                setBookingStep('form');
                setFormError('');
                setShowModal(true);
              }}
            >
              🎫 {user ? 'Đặt tour ngay' : 'Đặt ngay (Không cần tài khoản)'}
            </button>
            <button
              type="button"
              id="tdp-btn-consultation"
              className="tdp-btn-consultation"
              onClick={handleOpenConsultModal}
            >
              💬 Cần tư vấn thêm (Gọi lại miễn phí)
            </button>
            <button
              type="button"
              id="tdp-btn-wishlist"
              className={`tdp-btn-wishlist ${tour && isFavorite(tour.id) ? 'active' : ''}`}
              onClick={(e) => tour && toggleFavorite(tour.id, e)}
              title={tour && isFavorite(tour.id) ? 'Bỏ lưu khỏi danh sách yêu thích' : 'Lưu tour này vào danh sách yêu thích'}
            >
              {tour && isFavorite(tour.id) ? '❤️ Đã lưu yêu thích' : '🤍 Lưu yêu thích'}
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
              <h2 className="bm-title">
                {bookingStep === 'payment' && 'Thanh toán đơn tour'}
                {bookingStep === 'pay_later_success' && 'Giữ chỗ thành công'}
                {bookingStep === 'success' && 'Hoàn tất đặt tour'}
                {(bookingStep === 'form' || bookingStep === 'submitting') && 'Xác nhận đặt tour'}
              </h2>
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

                {!user && (
                  <div style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: 8,
                    padding: '10px 14px',
                    marginBottom: 14,
                    fontSize: 13,
                    color: '#1e40af',
                    lineHeight: 1.5
                  }}>
                    ✨ <strong>Khách vãng lai:</strong> Bạn không cần đăng ký tài khoản trước. Khi đặt tour, hệ thống sẽ tự động gửi email xác nhận và cấp <strong>mật khẩu tài khoản</strong> để bạn đăng nhập lần sau!
                  </div>
                )}

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
                    <label className="bm-label">Email liên hệ (nhận mật khẩu & mã vé) *</label>
                    <input
                      id="bm-contact-email"
                      type="email"
                      className="bm-input"
                      placeholder="email@example.com"
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                    />
                    <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                      {!user ? '📧 Chúng tôi sẽ gửi thông tin đơn tour và mật khẩu đăng nhập tài khoản vào email này.' : '📧 Email nhận thông báo xác nhận đơn đặt tour.'}
                    </span>
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

                        // Lưu vào localStorage cho khách vãng lai
                        try {
                          localStorage.setItem('guest_contact', JSON.stringify({
                            name: contactName.trim(),
                            phone: contactPhone.trim(),
                            email: contactEmail.trim(),
                          }));

                          const existing = JSON.parse(localStorage.getItem('guest_bookings') || '[]');
                          const newItem = {
                            id: res.data.id,
                            booking_code: res.data.booking_code,
                            tour: tour.id,
                            tour_title: tour.name,
                            tour_thumbnail: tour.thumbnail,
                            travel_date: date,
                            total_price: res.data.total_price || totalPrice,
                            num_adults: adults,
                            num_children: children,
                            status: res.data.status || 'pending',
                            contact_name: contactName.trim(),
                            contact_phone: contactPhone.trim(),
                            contact_email: contactEmail.trim(),
                            created_at: new Date().toISOString(),
                          };
                          localStorage.setItem('guest_bookings', JSON.stringify([newItem, ...existing.filter(b => b.id !== res.data.id)]));
                        } catch {
                          // ignore storage errors
                        }

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
                  Mã đơn: <strong>#{bookingResult?.id}</strong> {bookingResult?.booking_code ? <span style={{ color: '#4f46e5', fontWeight: 700 }}>({bookingResult.booking_code})</span> : ''} – Chọn phương thức thanh toán
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
                      <div className="bm-qr-row"><span>Nội dung:</span><strong>BOOKING {bookingResult?.id}</strong></div>
                    </div>
                    <img
                      src={`https://img.vietqr.io/image/MB-0797268696-compact2.png?amount=${bookingResult?.total_price || totalPrice}&addInfo=BOOKING${bookingResult?.id}&accountName=TOUR FOR YOU`}
                      alt="VietQR thanh toán"
                      className="bm-qr-img"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <p className="bm-qr-note">📱 Mở app ngân hàng bất kỳ → Quét QR → Xác nhận chuyển khoản</p>
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
                  <button className="bm-btn-cancel" onClick={() => setBookingStep('pay_later_success')}>
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

            {/* Step: pay_later_success */}
            {bookingStep === 'pay_later_success' && (
              <div className="bm-success">
                <div className="bm-success-icon" style={{ fontSize: 52, marginBottom: 8 }}>⏳</div>
                <h3 style={{ color: '#0f172a', fontSize: 20, fontWeight: 700, margin: '0 0 6px' }}>
                  Đặt tour & Giữ chỗ thành công!
                </h3>
                <p style={{ color: '#64748b', fontSize: 13.5, margin: '0 0 16px' }}>
                  Đơn đặt của bạn đã được tiếp nhận và giữ chỗ trong vòng <strong>24 giờ</strong>.
                </p>

                {/* Tóm tắt mã đơn & thông tin */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 16,
                  textAlign: 'left',
                  fontSize: 13.5
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottom: '1px dashed #cbd5e1' }}>
                    <span style={{ color: '#64748b', fontWeight: 500 }}>Mã tra cứu đơn:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <strong style={{ color: '#0284c7', background: '#e0f2fe', padding: '3px 9px', borderRadius: 6, letterSpacing: '0.5px', fontSize: 14 }}>
                        {bookingResult?.booking_code || `#${bookingResult?.id}`}
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          const code = bookingResult?.booking_code || String(bookingResult?.id || '');
                          navigator.clipboard.writeText(code);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 12,
                          cursor: 'pointer',
                          color: '#475569'
                        }}
                        title="Sao chép mã đơn"
                      >
                        {copiedCode ? '✅ Đã chép' : '📋 Chép'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ color: '#64748b' }}>Trạng thái:</span>
                    <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                      ⏳ Chờ thanh toán
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                    <span style={{ color: '#64748b' }}>Số tiền cần thanh toán:</span>
                    <strong style={{ color: '#ef4444', fontSize: 15 }}>{fmt(bookingResult?.total_price || totalPrice)}</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Người liên hệ:</span>
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{contactName} ({contactPhone})</span>
                  </div>
                </div>

                {/* Hộp thông báo hỗ trợ & email */}
                <div style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  color: '#1e40af',
                  textAlign: 'left',
                  lineHeight: 1.6,
                  marginBottom: 18
                }}>
                  <div style={{ marginBottom: 6 }}>
                    📧 Vé điện tử & thông tin chuyển khoản VietQR đã được gửi tới <strong>{contactEmail}</strong>.
                  </div>
                  <div>
                    📞 Chuyên viên tư vấn sẽ liên hệ SĐT <strong>{contactPhone}</strong> trong vòng 2 giờ để hỗ trợ và chốt lịch khởi hành.
                  </div>
                  {!user && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #93c5fd', color: '#047857' }}>
                      🔑 <strong>Tài khoản tra cứu tự động:</strong> Bạn có thể đăng nhập bằng email <strong>{contactEmail}</strong> (Mật khẩu: <strong>123456</strong>) để quản lý đơn hoặc xem lịch trình tour bất kỳ lúc nào!
                    </div>
                  )}
                </div>

                {/* Các nút hành động */}
                <div className="bm-success-actions" style={{ flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button
                      className="bm-btn-cancel"
                      style={{ flex: 1, padding: '11px 16px', fontSize: 14, fontWeight: 600 }}
                      onClick={() => setShowModal(false)}
                    >
                      🧭 Tiếp tục xem tour
                    </button>
                    <button
                      className="bm-btn-confirm"
                      style={{ flex: 1, padding: '11px 16px', fontSize: 14 }}
                      onClick={() => { setShowModal(false); navigate('/my-bookings'); }}
                    >
                      📋 Xem chi tiết đơn đặt
                    </button>
                  </div>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0284c7',
                      fontSize: 13.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '6px 0',
                      textDecoration: 'underline'
                    }}
                    onClick={() => setBookingStep('payment')}
                  >
                    💳 Đổi ý? Quay lại quét mã QR để thanh toán ngay
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
                <p>Mã đặt tour của bạn: <strong>#{bookingResult?.id}</strong> {bookingResult?.booking_code ? `(${bookingResult.booking_code})` : ''}</p>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, margin: '14px 0', fontSize: 13, color: '#334155', textAlign: 'left', lineHeight: 1.6 }}>
                  <div>📧 Chúng tôi đã gửi email xác nhận đặt tour đến: <strong>{contactEmail}</strong></div>
                  {!user && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', color: '#047857' }}>
                      🔑 <strong>Tài khoản đã tạo:</strong> Bạn có thể đăng nhập với email <strong>{contactEmail}</strong> và mật khẩu <strong>123456</strong> để theo dõi chuyến đi!
                    </div>
                  )}
                </div>
                <div className="bm-success-actions">
                  {user ? (
                    <button className="bm-btn-confirm" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
                      Xem lịch sử đặt tour
                    </button>
                  ) : (
                    <>
                      <button className="bm-btn-confirm" onClick={() => { setShowModal(false); openAuthModal('login'); }}>
                        🔑 Đăng nhập ngay
                      </button>
                      <button className="bm-btn-cancel" onClick={() => { setShowModal(false); navigate('/my-bookings'); }}>
                        Tra cứu đơn đặt
                      </button>
                    </>
                  )}
                  <button className="bm-btn-cancel" onClick={() => setShowModal(false)}>Đóng</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* ════ CONSULTATION MODAL ════ */}
      {showConsultModal && (
        <div className="bm-overlay" onClick={(e) => { if (e.target === e.currentTarget && !consultSubmitting) setShowConsultModal(false); }}>
          <div className="bm-modal tdp-consult-modal">
            <div className="bm-header">
              <div>
                <h2 className="bm-title" style={{ fontSize: 18, color: '#0f172a' }}>
                  💬 Yêu cầu tư vấn tour miễn phí
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: '#64748b' }}>
                  Để lại thông tin, hướng dẫn viên chuyên tuyến sẽ gọi lại hỗ trợ trong 15 phút.
                </p>
              </div>
              <button
                className="bm-close"
                disabled={consultSubmitting}
                onClick={() => setShowConsultModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="bm-body">
              {/* Card thông tin tour đang quan tâm */}
              <div className="tdp-consult-tour-card">
                <img
                  src={tour.thumbnail || '/placeholder-tour.jpg'}
                  alt={tour.name}
                  className="tdp-consult-tour-img"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200'; }}
                />
                <div className="tdp-consult-tour-info">
                  <div className="tdp-consult-tour-name">{tour.name}</div>
                  <div className="tdp-consult-tour-meta">
                    <span>📍 {tour.destination?.name || 'Điểm đến hấp dẫn'}</span>
                    <span className="tdp-consult-tour-price">
                      Từ {fmt(effectivePriceAdult)}
                    </span>
                  </div>
                  {tour.guide_name && (
                    <div className="tdp-consult-guide-badge">
                      👨‍💼 HDV phụ trách: <strong>{tour.guide_name}</strong>
                    </div>
                  )}
                </div>
              </div>

              {consultSuccess ? (
                <div className="tdp-consult-success-box">
                  <div className="tdp-consult-success-icon">🎉</div>
                  <h3 style={{ margin: '0 0 8px', color: '#166534', fontSize: 18 }}>
                    Gửi yêu cầu tư vấn thành công!
                  </h3>
                  <p style={{ color: '#374151', fontSize: 13.5, lineHeight: 1.6, margin: '0 0 16px' }}>
                    Cảm ơn bạn <strong>{consultName}</strong>! Hướng dẫn viên phụ trách sẽ liên hệ lại với bạn qua số điện thoại <strong style={{ color: '#0284c7' }}>{consultPhone}</strong> trong thời gian sớm nhất.
                  </p>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 13, color: '#334155', textAlign: 'left', lineHeight: 1.6, marginBottom: 16 }}>
                    <div>📧 Lịch trình chi tiết và thông tin hỗ trợ đã được gửi tới: <strong>{consultEmail}</strong></div>
                    {!user && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #cbd5e1', color: '#047857' }}>
                        🔑 <strong>Tài khoản tự động:</strong> Bạn có thể đăng nhập bằng email <strong>{consultEmail}</strong> (Mật khẩu: <strong>123456</strong>) để theo dõi các phản hồi và đặt tour ưu đãi!
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="bm-btn-confirm"
                    style={{ width: '100%', padding: '12px' }}
                    onClick={() => setShowConsultModal(false)}
                  >
                    Đã hiểu, cảm ơn!
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitConsultation}>
                  {consultError && (
                    <div className="bm-error" style={{ marginBottom: 14 }}>
                      ⚠️ {consultError}
                    </div>
                  )}

                  <div className="bm-field">
                    <label className="bm-label">
                      Họ và tên khách hàng <span className="bm-req">*</span>
                    </label>
                    <input
                      type="text"
                      className="bm-input"
                      placeholder="Ví dụ: Nguyễn Văn A"
                      value={consultName}
                      onChange={(e) => setConsultName(e.target.value)}
                      required
                      disabled={consultSubmitting}
                    />
                  </div>

                  <div className="bm-field">
                    <label className="bm-label">
                      Số điện thoại nhận tư vấn <span className="bm-req">*</span>
                    </label>
                    <input
                      type="tel"
                      className="bm-input"
                      placeholder="Ví dụ: 0912 345 678"
                      value={consultPhone}
                      onChange={(e) => setConsultPhone(e.target.value)}
                      required
                      disabled={consultSubmitting}
                    />
                  </div>

                  <div className="bm-field">
                    <label className="bm-label">
                      Email liên hệ <span className="bm-req">*</span>
                      <span style={{ fontSize: 11, fontWeight: 'normal', color: '#64748b', marginLeft: 6 }}>
                        (Nhận lịch trình & tài khoản tra cứu)
                      </span>
                    </label>
                    <input
                      type="email"
                      className="bm-input"
                      placeholder="email@example.com"
                      value={consultEmail}
                      onChange={(e) => setConsultEmail(e.target.value)}
                      required
                      disabled={consultSubmitting}
                    />
                  </div>

                  <div className="bm-field">
                    <label className="bm-label">
                      Nội dung bạn đang phân vân hoặc cần tư vấn
                    </label>
                    <textarea
                      className="bm-textarea"
                      rows={3}
                      placeholder="Ví dụ: Đoàn tôi 4 người muốn đi cuối tuần sau, có người lớn tuổi có cần lưu ý gì không?..."
                      value={consultNote}
                      onChange={(e) => setConsultNote(e.target.value)}
                      disabled={consultSubmitting}
                    />
                  </div>

                  <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: 6, fontSize: 12, color: '#64748b', marginBottom: 14 }}>
                    🔒 Cam kết bảo mật thông tin liên hệ. Cuộc gọi tư vấn hoàn toàn miễn phí 100%.
                  </div>

                  <div className="bm-actions">
                    <button
                      type="button"
                      className="bm-btn-cancel"
                      onClick={() => setShowConsultModal(false)}
                      disabled={consultSubmitting}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="bm-btn-confirm"
                      style={{ background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
                      disabled={consultSubmitting}
                    >
                      {consultSubmitting ? 'Đang gửi...' : '🚀 Gửi yêu cầu tư vấn'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════ PHOTO GALLERY LIGHTBOX MODAL ══════ */}
      {lightboxOpen && (
        <div
          className="tdp-lightbox-overlay"
          onClick={() => setLightboxOpen(false)}
        >
          <div
            className="tdp-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tdp-lightbox-header">
              <div className="tdp-lightbox-title">
                <span className="tdp-lightbox-counter">
                  🖼️ Ảnh {lightboxIdx + 1} / {imgs.length}
                </span>
                <span className="tdp-lightbox-tourname">{tour.name}</span>
              </div>
              <button
                type="button"
                className="tdp-lightbox-close"
                onClick={() => setLightboxOpen(false)}
                aria-label="Đóng bộ sưu tập ảnh"
              >
                ✕
              </button>
            </div>

            <div className="tdp-lightbox-stage">
              <button
                type="button"
                className="tdp-lightbox-nav tdp-lightbox-nav--prev"
                onClick={() => setLightboxIdx((lightboxIdx - 1 + imgs.length) % imgs.length)}
                aria-label="Ảnh trước"
              >
                ‹
              </button>

              <div className="tdp-lightbox-img-wrap">
                <img
                  src={imgs[lightboxIdx]}
                  alt={`${tour.name} - Ảnh ${lightboxIdx + 1}`}
                  className="tdp-lightbox-img"
                  onError={(e) => handleImgError(e, lightboxIdx)}
                />
              </div>

              <button
                type="button"
                className="tdp-lightbox-nav tdp-lightbox-nav--next"
                onClick={() => setLightboxIdx((lightboxIdx + 1) % imgs.length)}
                aria-label="Ảnh tiếp theo"
              >
                ›
              </button>
            </div>

            <div className="tdp-lightbox-thumbs">
              {imgs.map((thumbUrl, i) => (
                <button
                  type="button"
                  key={i}
                  className={`tdp-lightbox-thumb-btn ${i === lightboxIdx ? 'active' : ''}`}
                  onClick={() => setLightboxIdx(i)}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumb ${i + 1}`}
                    onError={(e) => handleImgError(e, i)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TourDetailPage;
