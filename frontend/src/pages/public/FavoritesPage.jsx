import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tourAPI } from '../../api/services';
import { useFavorites } from '../../context/FavoritesContext';
import './FavoritesPage.css';

function formatCurrency(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

export default function FavoritesPage() {
  const { favoriteIds, removeFavorite, clearAllFavorites } = useFavorites();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearModal, setShowClearModal] = useState(false);
  const navigate = useNavigate();

  // Tải danh sách tour tương ứng với các ID đã lưu
  const fetchFavoriteTours = useCallback(async () => {
    if (!favoriteIds || favoriteIds.length === 0) {
      setTours([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await tourAPI.getByIds(favoriteIds);
      const data = res.data?.results || res.data || [];
      if (Array.isArray(data)) {
        // Sắp xếp tour theo thứ tự mới lưu nhất (theo thứ tự favoriteIds đảo ngược)
        const idIndexMap = new Map(favoriteIds.map((id, index) => [Number(id), index]));
        const sorted = [...data].sort((a, b) => {
          const idxA = idIndexMap.get(Number(a.id)) ?? 0;
          const idxB = idIndexMap.get(Number(b.id)) ?? 0;
          return idxB - idxA;
        });
        setTours(sorted);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách tour yêu thích:', err);
    } finally {
      setLoading(false);
    }
  }, [favoriteIds]);

  useEffect(() => {
    fetchFavoriteTours();
  }, [fetchFavoriteTours]);

  // Xóa 1 tour
  const handleRemove = (e, tourId) => {
    e.preventDefault();
    e.stopPropagation();
    removeFavorite(tourId);
    setTours(prev => prev.filter(t => t.id !== tourId));
  };

  // Xác nhận xóa tất cả
  const handleConfirmClearAll = () => {
    clearAllFavorites();
    setTours([]);
    setShowClearModal(false);
  };

  return (
    <div className="fav-page">
      {/* ── Breadcrumb ── */}
      <div className="fav-breadcrumb-container">
        <div className="fav-breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="fav-breadcrumb-sep">/</span>
          <span className="fav-breadcrumb-current">Tour yêu thích</span>
        </div>
      </div>

      <div className="fav-container">
        {/* ── Header trang ── */}
        <div className="fav-header">
          <div className="fav-header-left">
            <div className="fav-icon-title">
              <span className="fav-header-emoji">❤️</span>
              <h1 className="fav-title">Danh sách tour yêu thích</h1>
            </div>
            <p className="fav-subtitle">
              Lưu giữ những hành trình và trải nghiệm du lịch tuyệt vời mà bạn đang quan tâm
            </p>
          </div>

          {tours.length > 0 && (
            <div className="fav-header-actions">
              <span className="fav-counter-badge">
                Đã lưu <strong>{tours.length}</strong> tour
              </span>
              <button
                type="button"
                className="fav-btn-clear-all"
                onClick={() => setShowClearModal(true)}
                title="Xóa toàn bộ tour đã lưu"
              >
                🗑️ Xóa tất cả
              </button>
            </div>
          )}
        </div>

        {/* ── Nội dung chính ── */}
        {loading ? (
          <div className="fav-loading-state">
            <div className="fav-spinner" />
            <p>Đang tải danh sách tour yêu thích của bạn...</p>
          </div>
        ) : tours.length === 0 ? (
          /* ── Empty State khi chưa có tour ── */
          <div className="fav-empty-state">
            <div className="fav-empty-illustration">
              <div className="fav-empty-icon-wrap">
                <span className="fav-empty-icon">🤍</span>
                <span className="fav-empty-sparkle">✨</span>
              </div>
            </div>
            <h2 className="fav-empty-title">Bạn chưa lưu tour nào</h2>
            <p className="fav-empty-desc">
              Khám phá các tour du lịch nổi bật, vé tham quan và hoạt động trải nghiệm hấp dẫn để lưu lại chuyến đi trong mơ của bạn ngay hôm nay!
            </p>
            <div className="fav-empty-actions">
              <Link to="/tours" className="fav-btn-explore">
                🗺️ Khám phá các tour nổi bật ngay
              </Link>
              <Link to="/" className="fav-btn-home">
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          /* ── Danh sách dạng lưới (Grid) ── */
          <div className="fav-grid">
            {tours.map((tour) => {
              const price = typeof tour.price_adult === 'string' ? parseFloat(tour.price_adult) : (tour.price_adult || 0);
              const salePercent = Number(tour.sale_percent) || 0;
              const isSale = Boolean((tour.is_priority_sale || salePercent > 0) && salePercent > 0);
              const finalPrice = isSale
                ? (tour.sale_price || Math.round(price * (100 - salePercent) / 100))
                : price;

              return (
                <div key={tour.id} className="fav-card">
                  {/* Ảnh đại diện & Badges */}
                  <div className="fav-card-image-wrap">
                    <img
                      src={tour.thumbnail || '/placeholder-tour.jpg'}
                      alt={tour.name}
                      className="fav-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500';
                      }}
                    />

                    {/* Nút xóa khỏi yêu thích nổi trên ảnh */}
                    <button
                      type="button"
                      className="fav-card-remove-btn"
                      onClick={(e) => handleRemove(e, tour.id)}
                      title="Xóa khỏi danh sách yêu thích"
                      aria-label="Xóa khỏi yêu thích"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M11.9979 21.5C6.83695 18.5141 1.56054 14.3057 1.50051 8.7407C1.50017 8.7146 1.5 8.6884 1.5 8.6622L1.50001 8.6551L1.5 8.6448C1.50912 5.52565 3.96624 3 6.9959 3C9.21955 3 11.1348 4.36055 12 6.31775C12.8652 4.36055 14.7805 3 17.0041 3C20.0394 3 22.5 5.53505 22.5 8.6622C22.5 8.756 22.4978 8.8492 22.4934 8.94185H22.4959C22.4959 14.4555 17.1884 18.5894 11.9979 21.5Z"
                        />
                      </svg>
                    </button>

                    <div className="fav-card-badges">
                      {tour.is_hot ? <span className="fav-badge-hot">🔥 Hot</span> : null}
                      {isSale ? (
                        <span className="fav-badge-sale">⚡ SALE {salePercent}%</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Nội dung chi tiết */}
                  <div className="fav-card-body">
                    <div className="fav-card-meta">
                      <span className="fav-meta-cat">{tour.category_name || 'Tour du lịch'}</span>
                      {tour.destination_name && (
                        <span className="fav-meta-dest">📍 {tour.destination_name}</span>
                      )}
                    </div>

                    <h3 className="fav-card-title" title={tour.name}>
                      <Link to={`/tours/${tour.id}`}>{tour.name}</Link>
                    </h3>

                    {/* Đánh giá & Số lượt đặt */}
                    <div className="fav-card-rating">
                      <span className="fav-star">★ {tour.rating || '5.0'}</span>
                      <span className="fav-reviews">({(tour.review_count || 0).toLocaleString()} đánh giá)</span>
                      {tour.booked_count && (
                        <span className="fav-booked">• {tour.booked_count} đã đặt</span>
                      )}
                    </div>

                    {/* Giá tiền */}
                    <div className="fav-card-price-section">
                      <span className="fav-price-label">Giá chỉ từ:</span>
                      <div className="fav-price-values">
                        {isSale && (
                          <span className="fav-price-orig">{formatCurrency(price)}</span>
                        )}
                        <span className="fav-price-final">{formatCurrency(finalPrice)}</span>
                      </div>
                    </div>

                    {/* Các nút hành động */}
                    <div className="fav-card-actions">
                      <Link to={`/tours/${tour.id}`} className="fav-btn-view">
                        👁️ Xem chi tiết
                      </Link>
                      <button
                        type="button"
                        className="fav-btn-book-now"
                        onClick={() => navigate(`/tours/${tour.id}?bookNow=true`)}
                      >
                        🎫 Đặt ngay
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal xác nhận xóa tất cả ── */}
      {showClearModal && (
        <div className="fav-modal-backdrop" onClick={() => setShowClearModal(false)}>
          <div className="fav-modal" onClick={e => e.stopPropagation()}>
            <div className="fav-modal-icon">⚠️</div>
            <h3 className="fav-modal-title">Xóa tất cả tour yêu thích?</h3>
            <p className="fav-modal-text">
              Bạn có chắc chắn muốn xóa toàn bộ <strong>{tours.length}</strong> tour khỏi danh sách yêu thích không? Thao tác này không thể hoàn tác.
            </p>
            <div className="fav-modal-actions">
              <button
                type="button"
                className="fav-modal-btn-cancel"
                onClick={() => setShowClearModal(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="fav-modal-btn-confirm"
                onClick={handleConfirmClearAll}
              >
                Đồng ý xóa hết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
