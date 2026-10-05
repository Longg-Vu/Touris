import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tourAPI, destinationAPI } from '../../api/services';
import './HomePage.css';

// Dữ liệu ảnh cho Hero Slideshow - 2 slide
const HERO_SLIDES = [
  {
    id: 1,
    image: 'https://res.klook.com/image/upload/w_1920,h_700,c_fill,q_85/activities/np2kfk6khyd2iayoguhe.webp',
    title: 'Chinh Phục Cầu Vàng Bà Nà Hills',
    subtitle: 'Biểu tượng nổi tiếng nhất Việt Nam - Thiên đường trên mây tại Đà Nẵng',
    label: 'Cáp treo • Đà Nẵng',
  },
  {
    id: 2,
    image: 'https://res.klook.com/image/upload/w_1920,h_700,c_fill,q_85/activities/zreu5sm9zgqbnrntyoho.webp',
    title: 'Sun World Ba Den Mountain',
    subtitle: 'Hành trình khám phá núi Bà Đen huyền thoại tại Tây Ninh',
    label: 'Cáp treo • Tây Ninh',
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
  const category = tour.category_name || tour.category || 'Tour';
  const destination = tour.destination_name || tour.destination || '';
  const price = typeof tour.price_adult === 'string' ? parseFloat(tour.price_adult) : (tour.price_adult || 0);
  const tags = Array.isArray(tour.tags) ? tour.tags : [];
  const reviewCount = tour.review_count || 0;

  return (
    <Link to={`/tours/${tour.id}`} className="tour-card">
      {/* Hình ảnh */}
      <div className="tour-card-img">
        <img src={tour.thumbnail} alt={tour.name} loading="lazy" />
        {/* Badge nổi bật trên ảnh */}
        {tour.is_hot && (
          <div className="tour-card-hot-badge">
            <span>🔥 Hot</span>
          </div>
        )}
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
            <span className="price-amount">{formatCurrency(price)}</span>
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
          <p className="destination-desc">Khám phá các điểm đến hấp dẫn trên khắp Việt Nam</p>
        </div>
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
                <Link to={`/tours?search=${encodeURIComponent(city.name)}`} className="city-card-rectangle">
                  <div className="city-card-rectangle_image">
                    <img src={imageUrl} alt={city.name} loading="lazy" />
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

function HomePage() {
  return (
    <div className="home-page">
      {/* Hero Slideshow */}
      <HeroSlider />

      {/* Bạn muốn đi chơi ở đâu ? - Klook style */}
      <TopDestinations />

      {/* Tour Nổi Bật - Klook style */}
      <FeaturedTours />
    </div>
  );
}

export default HomePage;
