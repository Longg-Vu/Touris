import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tourAPI, destinationAPI, categoryAPI } from '../../api/services';
import { useFavorites } from '../../context/FavoritesContext';
import './HomePage.css';

// Dữ liệu ảnh cho Hero Slideshow - Độ phân giải cao sắc nét
const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://res.klook.com/image/upload/w_1920,h_700,c_fill,q_90/activities/np2kfk6khyd2iayoguhe.webp',
    title: 'Chinh Phục Cầu Vàng Bà Nà Hills',
    subtitle: 'Biểu tượng nổi tiếng nhất Việt Nam - Thiên đường trên mây tại Đà Nẵng',
    label: 'Cáp treo • Đà Nẵng',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1920&h=800&fit=crop&q=90',
    title: 'Kỳ Quan Thiên Nhiên Vịnh Hạ Long',
    subtitle: 'Hành trình du thuyền 5 sao giữa hàng ngàn đảo đá vôi kỳ vĩ',
    label: 'Du thuyền • Quảng Ninh',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1920&h=800&fit=crop&q=90',
    title: 'Thiên Đường Biển Đảo Phú Quốc',
    subtitle: 'Tận hưởng làn nước trong xanh ngọc bích và cáp treo vượt biển dài nhất thế giới',
    label: 'Khám phá đảo • Phú Quốc',
  },
];

// Component Hero Slideshow
function HeroSlider() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);
  const total = HERO_SLIDES.length;

  const goTo = (index) => {
    setCurrent((index + total) % total);
  };

  const resetTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % total);
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const handlePrev = () => { goTo(current - 1); resetTimer(); };
  const handleNext = () => { goTo(current + 1); resetTimer(); };

  return (
    <div className="hero-slider">
      {/* Các slide ảnh */}
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.id}
          className={`hero-slide ${i === current ? 'active' : ''}`}
          style={{ backgroundImage: `url(${slide.image})` }}
        >
          {/* Overlay tối */}
          <div className="hero-overlay" />

          {/* Nội dung text */}
          <div className="hero-content">
            <span className="hero-label">{slide.label}</span>
            <h1>{slide.title}</h1>
            <p>{slide.subtitle}</p>
            <Link to="/tours" className="hero-btn">Xem Tour Ngay</Link>
          </div>
        </div>
      ))}

      {/* Nút điều hướng */}
      <button className="hero-nav hero-nav-left" onClick={handlePrev} aria-label="Trước">&#8249;</button>
      <button className="hero-nav hero-nav-right" onClick={handleNext} aria-label="Tiếp">&#8250;</button>

      {/* Dots chỉ số slide */}
      <div className="hero-dots">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            className={`hero-dot ${i === current ? 'active' : ''}`}
            onClick={() => { goTo(i); resetTimer(); }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// Format tiền VNĐ
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' ₫';
}

// Component Card Tour 
function TourCard({ tour }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const category = tour.category_name || tour.category || 'Tour';
  const destination = tour.destination_name || tour.destination || '';
  const price = typeof tour.price_adult === 'string' ? parseFloat(tour.price_adult) : (tour.price_adult || 0);
  const tags = Array.isArray(tour.tags) ? tour.tags : [];
  const reviewCount = tour.review_count || 0;
  const isFav = isFavorite(tour.id);
  const salePercent = Number(tour.sale_percent) || 0;
  const isSale = Boolean((tour.is_priority_sale || salePercent > 0) && salePercent > 0);

  return (
    <Link to={`/tours/${tour.id}`} className="tour-card">
      {/* Hình ảnh */}
      <div className="tour-card-img">
        <img src={tour.thumbnail} alt={tour.name} loading="lazy" />
        {/* Badge nổi bật trên ảnh */}
        <div className="tour-card-badges-wrapper">
          {tour.is_hot ? (
            <div className="tour-card-hot-badge">
              <span>🔥 Hot</span>
            </div>
          ) : null}
          {isSale ? (
            <div className="tour-card-sale-badge">
              <span>⚡ SALE {salePercent}%</span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className={`favorite-tag ${isFav ? 'is-fav' : ''}`}
          onClick={(e) => toggleFavorite(tour.id, e)}
          aria-label="Yêu thích"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.9979 21.5C6.83695 18.5141 1.56054 14.3057 1.50051 8.7407C1.50017 8.7146 1.5 8.6884 1.5 8.6622L1.50001 8.6551L1.5 8.6448C1.50912 5.52565 3.96624 3 6.9959 3C9.21955 3 11.1348 4.36055 12 6.31775C12.8652 4.36055 14.7805 3 17.0041 3C20.0394 3 22.5 5.53505 22.5 8.6622C22.5 8.756 22.4978 8.8492 22.4934 8.94185H22.4959C22.4959 14.4555 17.1884 18.5894 11.9979 21.5Z"
              fill={isFav ? '#FF5B00' : 'rgba(0,0,0,0.35)'}
              stroke={isFav ? '#FF5B00' : '#fff'}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Nội dung card */}
      <div className="tour-card-info">
        <div className="tour-card-info-top">
          {/* Danh mục & địa điểm */}
          <p className="tour-card-sub">{category}{destination ? ` • ${destination}` : ''}</p>

          {/* Tên tour */}
          <h3 className="tour-card-title">{tour.name}</h3>

          {/* Tags dịch vụ */}
          <div className="tour-card-tags">
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="tour-tag">{tag}</span>
            ))}
          </div>

          {/* Đánh giá */}
          <div className="tour-card-rating">
            <span className="rating-star">★ {tour.rating}</span>
            <span className="rating-count">({reviewCount.toLocaleString()})</span>
            {tour.booked_count && (
              <span className="rating-booked">• {tour.booked_count} Đã đặt</span>
            )}
          </div>
        </div>

        {/* Giá và khuyến mãi */}
        <div className="tour-card-info-bottom">
          <div className="tour-card-price">
            <span className="price-label">Từ</span>
            {isSale ? (
              <div className="tour-card-price-sale">
                <span className="tour-price-original">{formatCurrency(price)}</span>
                <span className="price-amount sale-active">
                  {formatCurrency(tour.sale_price || Math.round(price * (100 - salePercent) / 100))}
                </span>
              </div>
            ) : (
              <span className="price-amount">{formatCurrency(price)}</span>
            )}
          </div>
          {tour.promo && (
            <div className="tour-card-promo">
              <span className="promo-badge">🏷 {tour.promo}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// Component Slider Tour Nổi Bật
function FeaturedTours() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    let isMounted = true;
    tourAPI.getAll({ is_featured: true })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data;
        if (Array.isArray(data)) {
          setTours(data);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách tour từ Backend API:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  return (
    <section className="featured-section">
      <div className="featured-header">
        <div>
          <h2 className="featured-title">🌟 Tour Nổi Bật</h2>
          <p className="featured-desc">Các tour du lịch được yêu thích và đặt nhiều nhất</p>
        </div>
        <Link to="/tours" className="view-all-btn">Xem tất cả →</Link>
      </div>

      {/* Slider container */}
      <div className="slider-wrapper">
        {/* Nút trái */}
        {canScrollLeft && (
          <button className="slider-btn slider-btn-left" onClick={scrollLeft} aria-label="Trước">
            ‹
          </button>
        )}

        {/* Danh sách card */}
        <div
          className="tour-slider"
          ref={sliderRef}
          onScroll={handleScroll}
        >
          {tours.map(tour => (
            <div key={tour.id} className="tour-slide-item">
              <TourCard tour={tour} />
            </div>
          ))}
        </div>

        {/* Nút phải */}
        {canScrollRight && (
          <button className="slider-btn slider-btn-right" onClick={scrollRight} aria-label="Tiếp">
            ›
          </button>
        )}
      </div>
    </section>
  );
}

// Component Điểm Đến Hàng Đầu - Bạn muốn đi chơi ở đâu?
function TopDestinations() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    let isMounted = true;
    destinationAPI.getAll()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data;
        if (Array.isArray(data)) {
          setDestinations(data);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách điểm đến từ Backend API:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  const handleScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -360, behavior: 'smooth' });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({ left: 360, behavior: 'smooth' });
  };

  return (
    <section className="destination-section">
      <div className="destination-header">
        <div>
          <h2 className="destination-title">Bạn muốn đi chơi ở đâu ?</h2>
          <p className="destination-desc">Khám phá 32 điểm đến nổi tiếng nhất trên khắp Việt Nam</p>
        </div>
        <Link to="/destinations" className="view-all-btn">
          Xem tất cả 32 điểm đến →
        </Link>
      </div>

      <div className="slider-wrapper">
        {canScrollLeft && (
          <button className="slider-btn slider-btn-left" onClick={scrollLeft} aria-label="Trước">
            ‹
          </button>
        )}

        <div
          className="destination-slider"
          ref={sliderRef}
          onScroll={handleScroll}
        >
          {destinations.map(city => {
            const imageUrl = city.image_url || city.image;
            const countText = city.count || (city.tour_count ? `${city.tour_count} hoạt động` : 'Khám phá');
            return (
              <div key={city.id || city.slug} className="destination-slide-item">
                <Link to={`/tours?destination=${encodeURIComponent(city.slug || city.name)}`} className="city-card-rectangle">
                  <div className="city-card-rectangle_image">
                    <img
                      src={imageUrl}
                      alt={city.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://res.klook.com/image/upload/fl_lossy.progressive,w_530,h_707,c_fill,q_85/v1761129090/destination/ssfx9kapyozmdykbevx6.webp';
                      }}
                    />
                  </div>
                  <div className="city-card-rectangle_overlay">
                    <div className="city-card-rectangle_content">
                      <div className="city-card-rectangle_title">{city.name}</div>
                      <div className="city-card-rectangle_count">{countText}</div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>

        {canScrollRight && (
          <button className="slider-btn slider-btn-right" onClick={scrollRight} aria-label="Tiếp">
            ›
          </button>
        )}
      </div>
    </section>
  );
}

// Component Slider Tour Yêu Thích - Chỉ hiện khi người dùng có lưu tour yêu thích
function FavoriteToursSlider() {
  const { favoriteIds } = useFavorites();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!favoriteIds || favoriteIds.length === 0) {
      setTours([]);
      return;
    }

    setLoading(true);
    tourAPI.getByIds(favoriteIds)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data;
        if (Array.isArray(data)) {
          // Sắp xếp theo thứ tự mới lưu nhất
          const idIndexMap = new Map(favoriteIds.map((id, index) => [Number(id), index]));
          const sorted = [...data].sort((a, b) => {
            const idxA = idIndexMap.get(Number(a.id)) ?? 0;
            const idxB = idIndexMap.get(Number(b.id)) ?? 0;
            return idxB - idxA;
          });
          setTours(sorted);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải tour yêu thích ở HomePage:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [favoriteIds]);

  const handleScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
  }, [tours]);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  // Nếu không có tour yêu thích nào, KHÔNG RENDER (ẩn hoàn toàn)
  if (!favoriteIds || favoriteIds.length === 0 || tours.length === 0) {
    return null;
  }

  return (
    <section className="featured-section fav-slider-section">
      <div className="featured-header">
        <div>
          <h2 className="featured-title">❤️ Tour Yêu Thích Của Bạn</h2>
          <p className="featured-desc">Những chuyến đi bạn đã lưu và đang quan tâm ({tours.length})</p>
        </div>
        <Link to="/favorites" className="view-all-btn">Xem tất cả →</Link>
      </div>

      {/* Slider container */}
      <div className="slider-wrapper">
        {canScrollLeft && (
          <button className="slider-btn slider-btn-left" onClick={scrollLeft} aria-label="Trước">
            ‹
          </button>
        )}

        <div
          className="tour-slider"
          ref={sliderRef}
          onScroll={handleScroll}
        >
          {tours.map(tour => (
            <div key={tour.id} className="tour-slide-item">
              <TourCard tour={tour} />
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button className="slider-btn slider-btn-right" onClick={scrollRight} aria-label="Tiếp">
            ›
          </button>
        )}
      </div>
    </section>
  );
}

// Component Slider Tour Đang Giảm Giá (Sale) - Thiết kế kiểu Tour Yêu Thích
function SaleToursSlider() {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;
    tourAPI.getAll({ on_sale: true })
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data;
        if (Array.isArray(data)) {
          // Lọc chắc chắn các tour đang có ưu đãi giảm giá
          const saleList = data.filter(
            (t) => t.is_priority_sale || (t.sale_percent && t.sale_percent > 0)
          );
          setTours(saleList);
        }
      })
      .catch((err) => {
        console.error('Lỗi khi tải danh sách tour sale ở HomePage:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const handleScroll = () => {
    if (sliderRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
  }, [tours]);

  const scrollLeft = () => {
    sliderRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
  };

  const scrollRight = () => {
    sliderRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
  };

  // Nếu không có tour sale nào hoặc đang tải mà rỗng, không render
  if (!loading && tours.length === 0) {
    return null;
  }

  return (
    <section className="featured-section">
      <div className="featured-header">
        <div>
          <h2 className="featured-title">⚡ Tour Đang Giảm Giá</h2>
          <p className="featured-desc">
            Cơ hội săn vé du lịch giá tốt nhất với mức ưu đãi lên đến 30% ({tours.length})
          </p>
        </div>
        <Link to="/tours?on_sale=true" className="view-all-btn">
          Xem tất cả →
        </Link>
      </div>

      {/* Slider container */}
      <div className="slider-wrapper">
        {canScrollLeft && (
          <button className="slider-btn slider-btn-left" onClick={scrollLeft} aria-label="Trước">
            ‹
          </button>
        )}

        <div
          className="tour-slider"
          ref={sliderRef}
          onScroll={handleScroll}
        >
          {tours.map(tour => (
            <div key={tour.id} className="tour-slide-item">
              <TourCard tour={tour} />
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button className="slider-btn slider-btn-right" onClick={scrollRight} aria-label="Tiếp">
            ›
          </button>
        )}
      </div>
    </section>
  );
}

const QUICK_CATEGORY_PILLS = [
  { label: 'Săn Deal Giảm Giá', icon: '⚡', isSale: true, highlight: true },
  { label: 'Tour Trọn Gói', icon: '🚐', slug: 'tour' },
  { label: 'Cáp Treo', icon: '🚠', slug: 'cap-treo' },
  { label: 'Công Viên Giải Trí', icon: '🎢', slug: 'cong-vien-giai-tri' },
  { label: 'Du Thuyền & Vịnh', icon: '🚢', slug: 'du-thuyen' },
  { label: 'Vé Tham Quan', icon: '🎫', slug: 've-tham-quan' },
  { label: 'Hoạt Động Ngoài Trời', icon: '🏕️', slug: 'hoat-dong-ngoai-troi' },
  { label: 'Văn Hoá & Lịch Sử', icon: '🏮', slug: 'trai-nghiem-van-hoa' },
];

// Component Thanh Tìm Kiếm Nhanh & Dãy Danh Mục Nổi dưới Hero
function HeroQuickSearch() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [selectedDest, setSelectedDest] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [onlySale, setOnlySale] = useState(false);
  const [destinations, setDestinations] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    let isMounted = true;
    destinationAPI.getAll()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data || [];
        if (Array.isArray(data)) setDestinations(data);
      })
      .catch(() => {});

    categoryAPI.getAll()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data || [];
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});

    return () => { isMounted = false; };
  }, []);

  const handlePillClick = (item) => {
    if (item.isSale) {
      setOnlySale((prev) => !prev);
    } else if (item.slug) {
      setSelectedCat((prev) => (prev === item.slug ? '' : item.slug));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('search', keyword.trim());
    if (selectedDest) params.set('destination', selectedDest);
    if (selectedCat) params.set('category', selectedCat);
    if (onlySale) params.set('on_sale', 'true');
    const queryString = params.toString();
    navigate(queryString ? `/tours?${queryString}` : '/tours');
  };

  return (
    <section className="hero-search-section">
      <div className="hero-search-card">
        <form className="hero-search-form" onSubmit={handleSearchSubmit}>
          <div className="search-field search-field-keyword">
            <span className="search-field-icon">🔍</span>
            <div className="search-field-body">
              <label>Bạn muốn trải nghiệm gì?</label>
              <input
                type="text"
                placeholder="Tìm tên tour, Bà Nà Hills, Vịnh Hạ Long..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="search-field-divider" />

          <div className="search-field">
            <span className="search-field-icon">📍</span>
            <div className="search-field-body">
              <label>Điểm đến</label>
              <select value={selectedDest} onChange={(e) => setSelectedDest(e.target.value)}>
                <option value="">Tất cả 32 địa điểm</option>
                {destinations.map((d) => (
                  <option key={d.id || d.slug} value={d.slug}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="search-field-divider" />

          <div className="search-field">
            <span className="search-field-icon">🎒</span>
            <div className="search-field-body">
              <label>Danh mục</label>
              <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
                <option value="">Tất cả loại hình</option>
                {categories.map((c) => (
                  <option key={c.id || c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="hero-search-submit-btn">
            Tìm Kiếm
          </button>
        </form>

        {/* Dãy nút chọn nhanh danh mục (chọn trước, bấm Tìm Kiếm mới chuyển trang) */}
        <div className="quick-category-pills">
          {QUICK_CATEGORY_PILLS.map((item, idx) => {
            const isActive = item.isSale ? onlySale : selectedCat === item.slug;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handlePillClick(item)}
                className={`quick-cat-pill ${item.highlight ? 'is-sale-pill' : ''} ${isActive ? 'active' : ''}`}
              >
                <span className="pill-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Banner Tư vấn đoàn riêng & Khám phá điểm đến
function PromoBannerSection() {
  return (
    <section className="home-promo-banner-section">
      <div className="home-promo-banner">
        <div className="home-promo-content">
          <span className="home-promo-tag">✨ ĐẶC QUYỀN ĐOÀN RIÊNG & GIA ĐÌNH</span>
          <h2>Bạn Cần Thiết Kế Lịch Trình Riêng Hoặc Đặt Tour Đoàn Đông?</h2>
          <p>
            Đội ngũ điều hành tour và Hướng dẫn viên trưởng vùng của Tourism sẵn sàng lên kế hoạch riêng theo ngân sách của bạn với mức chiết khấu hấp dẫn lên đến 25%.
          </p>
          <div className="home-promo-actions">
            <Link to="/contact" className="btn-promo-primary">
              📝 Đăng Ký Tư Vấn Miễn Phí
            </Link>
            <Link to="/destinations" className="btn-promo-secondary">
              🗺️ Xem Bản Đồ 32 Điểm Đến
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Khối Đánh giá từ khách hàng thực tế ở cuối trang chủ
function CustomerReviewsSection() {
  const REVIEWS = [
    {
      id: 1,
      name: 'Nguyễn Minh Quân',
      location: 'Hà Nội',
      avatar: 'MQ',
      rating: 5,
      tourName: 'Tour Bà Nà Hills & Cầu Vàng Đà Nẵng',
      date: 'Tháng 10/2026',
      comment: 'Đặt tour trên web cực kỳ tiện, quét mã VietQR cái là nhận email xác nhận ngay. Bạn hướng dẫn viên nhiệt tình, chụp ảnh cho cả gia đình rất đẹp!'
    },
    {
      id: 2,
      name: 'Trần Ngọc Mai',
      location: 'TP. Hồ Chí Minh',
      avatar: 'NM',
      rating: 5,
      tourName: 'Du Thuyền 5 Sao Vịnh Hạ Long',
      date: 'Tháng 10/2026',
      comment: 'Lịch trình từng ngày trên trang chi tiết rất rõ ràng, ảnh thực tế sắc nét. Lúc cần hỏi giờ đón mình nhắn vào khung chat 24/7 được hỗ trợ liền.'
    },
    {
      id: 3,
      name: 'Lê Hoàng Nam',
      location: 'Đà Nẵng',
      avatar: 'HN',
      rating: 5,
      tourName: 'Tour Khám Phá 3 Đảo & Cáp Treo Phú Quốc',
      date: 'Tháng 11/2026',
      comment: 'Săn được tour đúng đợt đang giảm giá 20% trên trang chủ nên tiết kiệm được kha khá cho nhóm 6 người. Dịch vụ cano và bữa trưa hải sản rất chất lượng.'
    }
  ];

  return (
    <section className="home-reviews-section">
      <div className="home-reviews-header">
        <div>
          <span className="home-reviews-badge">⭐ KHÁCH HÀNG NÓI GÌ VỀ CHÚNG TÔI</span>
          <h2 className="featured-title">Trải Nghiệm Thực Tế Từ Du Khách</h2>
          <p className="featured-desc">Hơn 15.000+ lượt khách đã đồng hành và hài lòng tuyệt đối cùng Tourism</p>
        </div>
        <Link to="/about" className="view-all-btn">Tìm hiểu về Tourism →</Link>
      </div>

      <div className="home-reviews-grid">
        {REVIEWS.map((rev) => (
          <div key={rev.id} className="home-review-card">
            <div className="home-review-stars">
              {'★'.repeat(rev.rating)} <span>5.0 Tuyệt vời</span>
            </div>
            <p className="home-review-comment">"{rev.comment}"</p>
            <div className="home-review-tour-tag">🎫 {rev.tourName}</div>
            <div className="home-review-author">
              <div className="home-review-avatar">{rev.avatar}</div>
              <div>
                <h4>{rev.name}</h4>
                <span>Du khách từ {rev.location} • {rev.date}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Slideshow */}
      <HeroSlider />

      {/* Thanh tìm kiếm nhanh & Danh mục nổi */}
      <HeroQuickSearch />

      {/* Bạn muốn đi chơi ở đâu ? - Klook style */}
      <TopDestinations />

      {/* Tour Yêu Thích Của Bạn - Chỉ hiện khi có tour lưu */}
      <FavoriteToursSlider />

      {/* Tour Đang Giảm Giá (Sale) - Kiểu Tour Yêu Thích */}
      <SaleToursSlider />

      {/* Tour Nổi Bật - Klook style */}
      <FeaturedTours />

      {/* Banner Đặt tour đoàn / Tư vấn lịch trình riêng */}
      <PromoBannerSection />

      {/* Đánh giá thực tế từ khách hàng */}
      <CustomerReviewsSection />
    </div>
  );
}

export default HomePage;
