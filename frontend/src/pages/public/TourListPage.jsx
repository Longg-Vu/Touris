import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { tourAPI, destinationAPI, categoryAPI } from '../../api/services';
import { useFavorites } from '../../context/FavoritesContext';
import DatePickerModal, { formatDateKey, formatDisplayDate } from '../../components/common/DatePickerModal';
import './TourListPage.css';

// Format tiền tệ VNĐ
function formatCurrency(amount) {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  return new Intl.NumberFormat('vi-VN').format(num) + ' ₫';
}

function TourListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Dữ liệu từ API
  const [tours, setTours] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Bộ lọc
  const [selectedCity, setSelectedCity] = useState(searchParams.get('destination') || searchParams.get('dest') || '');
  const [selectedCategories, setSelectedCategories] = useState(() => {
    const cat = searchParams.get('category');
    return cat ? [cat] : [];
  });
  const [selectedDateRange, setSelectedDateRange] = useState({ startDate: null, endDate: null });
  const [sortBy, setSortBy] = useState('most_relevant');
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('search') || '');
  const [onlySale, setOnlySale] = useState(searchParams.get('on_sale') === 'true' || searchParams.get('sale') === 'true');

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 12;

  // Bật/tắt chọn danh mục (hỗ trợ chọn nhiều danh mục)
  const toggleCategory = (slug) => {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setCurrentPage(1);
  };

  // Trạng thái menu dropdown đang mở ('city' | 'date' | 'sort' | null)
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Panel lọc nâng cao
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 103311259]);
  const PRICE_MAX = 103311259;
  const [guideLanguage, setGuideLanguage] = useState([]);
  // Danh mục đang chọn trong panel (tạm thời, chỉ apply khi bấm nút)
  const [panelCategories, setPanelCategories] = useState([]);

  // Mở panel thì sync panelCategories với selectedCategories
  const openFilterPanel = () => {
    setPanelCategories([...selectedCategories]);
    setFilterPanelOpen(true);
  };

  const applyFilterPanel = () => {
    setSelectedCategories(panelCategories);
    setCurrentPage(1);
    setFilterPanelOpen(false);
  };

  const clearFilterPanel = () => {
    setPanelCategories([]);
    setPriceRange([0, PRICE_MAX]);
    setGuideLanguage([]);
  };

  // Khóa scroll body khi panel lọc đang mở
  useEffect(() => {
    if (filterPanelOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [filterPanelOpen]);

  // Reset trang về 1 khi bất kỳ tiêu chí lọc nào thay đổi
  const prevFiltersRef = useRef({ selectedCity, selectedCategories, sortBy, searchKeyword, selectedDateRange, onlySale });
  useEffect(() => {
    const prev = prevFiltersRef.current;
    if (
      prev.selectedCity !== selectedCity ||
      prev.selectedCategories !== selectedCategories ||
      prev.sortBy !== sortBy ||
      prev.searchKeyword !== searchKeyword ||
      prev.onlySale !== onlySale ||
      prev.selectedDateRange?.startDate !== selectedDateRange?.startDate ||
      prev.selectedDateRange?.endDate !== selectedDateRange?.endDate
    ) {
      setCurrentPage(1);
      prevFiltersRef.current = { selectedCity, selectedCategories, sortBy, searchKeyword, selectedDateRange, onlySale };
    }
  }, [selectedCity, selectedCategories, sortBy, searchKeyword, selectedDateRange, onlySale]);

  const { isFavorite, toggleFavorite } = useFavorites();
  const filterContainerRef = useRef(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterContainerRef.current && !filterContainerRef.current.contains(e.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 1. Tải danh mục và điểm đến ban đầu
  useEffect(() => {
    destinationAPI.getAll()
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setDestinations(data);
      })
      .catch((err) => console.warn('Lỗi lấy destinations:', err));

    categoryAPI.getAll()
      .then((res) => {
        const data = res.data?.results || res.data || [];
        setCategories(data);
      })
      .catch((err) => console.warn('Lỗi lấy categories:', err));
  }, []);

  // 2. Đồng bộ URL searchParams với state bộ lọc khi URL thay đổi (VD: bấm điểm đến từ Trang chủ hoặc Back/Forward)
  useEffect(() => {
    const dest = searchParams.get('destination') || searchParams.get('dest') || '';
    const search = searchParams.get('search') || '';
    const cat = searchParams.get('category');
    const isSale = searchParams.get('on_sale') === 'true' || searchParams.get('sale') === 'true';

    setSelectedCity(dest);
    setSearchKeyword(search);
    setOnlySale(isSale);
    setSelectedCategories(cat ? [cat] : []);
    window.scrollTo(0, 0);
  }, [searchParams]);

  // 3. Tải danh sách Tour khi bộ lọc hoặc trang thay đổi
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const params = {
      page: currentPage,
    };

    // Lọc theo ngày
    if (selectedDateRange.startDate) {
      params.start_date = formatDateKey(selectedDateRange.startDate);
      if (selectedDateRange.endDate) {
        params.end_date = formatDateKey(selectedDateRange.endDate);
      }
    }

    // Tìm kiếm theo từ khóa
    if (searchKeyword.trim()) {
      params.search = searchKeyword.trim();
    }

    // Lọc theo thành phố (nếu có)
    if (selectedCity) {
      // Tìm xem selectedCity là slug hay tên
      const dest = destinations.find(
        (d) => d.slug === selectedCity || d.name.toLowerCase() === selectedCity.toLowerCase()
      );
      if (dest) {
        params.destination = dest.id;
      } else {
        params.destination__slug = selectedCity;
      }
    }

    // Lọc theo danh mục (hỗ trợ chọn nhiều danh mục)
    if (selectedCategories.length > 0) {
      params.categories = selectedCategories.join(',');
    }

    // Sắp xếp
    if (sortBy === 'price_asc') {
      params.ordering = 'price_adult';
    } else if (sortBy === 'price_desc') {
      params.ordering = '-price_adult';
    } else if (sortBy === 'rating_desc') {
      params.ordering = '-rating';
    } else if (sortBy === 'participants') {
      params.ordering = '-review_count';
    }

    // Lọc tour đang giảm giá
    if (onlySale) {
      params.on_sale = 'true';
    }

    tourAPI.getAll(params)
      .then((res) => {
        if (!isMounted) return;
        const count = res.data?.count ?? (res.data?.results ? res.data.results.length : (Array.isArray(res.data) ? res.data.length : 0));
        const data = res.data?.results || (Array.isArray(res.data) ? res.data : []);
        setTours(data);
        setTotalCount(count);
      })
      .catch((err) => {
        console.error('Lỗi lấy tour:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentPage, selectedCity, selectedCategories, sortBy, searchKeyword, selectedDateRange, onlySale, destinations, categories]);



  // Xóa toàn bộ bộ lọc
  const handleClearAllFilters = () => {
    setSelectedCity('');
    setSelectedCategories([]);
    setSelectedDateRange({ startDate: null, endDate: null });
    setSortBy('most_relevant');
    setSearchKeyword('');
    setOnlySale(false);
    setCurrentPage(1);
    setSearchParams({});
  };

  // Tính toán số trang và hàm chuyển trang
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  const handlePageChange = (page) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    if (filterContainerRef.current) {
      filterContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const getPaginationRange = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  // Tên thành phố hiển thị trên nút dropdown
  const getCityButtonLabel = () => {
    if (!selectedCity) return 'Thành phố';
    const dest = destinations.find(
      (d) => d.slug === selectedCity || d.name.toLowerCase() === selectedCity.toLowerCase()
    );
    return dest ? dest.name : selectedCity;
  };

  // Tên ngày hiển thị trên nút dropdown
  const getDateButtonLabel = () => {
    if (!selectedDateRange.startDate) return 'Ngày';
    if (!selectedDateRange.endDate) {
      return formatDisplayDate(selectedDateRange.startDate);
    }
    return `${formatDisplayDate(selectedDateRange.startDate)} - ${formatDisplayDate(selectedDateRange.endDate)}`;
  };

  // Tên tiêu chí sắp xếp hiện tại
  const getSortLabel = () => {
    switch (sortBy) {
      case 'price_asc': return 'Giá thấp nhất';
      case 'price_desc': return 'Giá cao nhất';
      case 'participants': return 'Đặt nhiều nhất';
      case 'rating_desc': return 'Ưa thích nhất';
      default: return 'Nên đặt';
    }
  };

  // Tìm destination tương ứng nếu có để đổi background header theo điểm đến
  const currentDestination = destinations.find(
    (d) => d.slug === selectedCity || d.name.toLowerCase() === selectedCity.toLowerCase()
  );
  const headerBgImage = currentDestination?.image_url || '/vietnam-header-bg.jpg';

  return (
    <div className="tour-list-page-wrapper">
      {/* Tiêu đề trang & Breadcrumb tràn viền full-width */}
      <div
        className="tour-list-header"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.4) 60%, rgba(0, 0, 0, 0.25) 100%), url(${headerBgImage})`
        }}
      >
        <div className="tour-list-header-content">
          <div className="tour-list-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span>›</span>
            <span>Việt Nam</span>
            {selectedCity && (
              <>
                <span>›</span>
                <span>{getCityButtonLabel()}</span>
              </>
            )}
            <span>›</span>
            <span className="breadcrumb-current">Tất cả hoạt động</span>
          </div>
          <h1 className="tour-list-title">
            {selectedCity ? `Hoạt động & Tour du lịch tại ${getCityButtonLabel()}` : 'Hoạt động & Tour du lịch tại Việt Nam'}
          </h1>
          <p className="tour-list-desc">
            Khám phá những trải nghiệm hàng đầu, vé tham quan và hoạt động được yêu thích nhất
          </p>

          {/* Ô tìm kiếm nhanh */}
          <div className="tour-list-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Tìm theo tên tour, địa danh (Hội An, Cáp treo, Sa Pa...)"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
            {searchKeyword && (
              <button className="clear-search" onClick={() => setSearchKeyword('')} aria-label="Xóa tìm kiếm">
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tour-list-page">
        {/* ========== FILTER BAR (Chuẩn Klook) ========== */}
        <div className="country-ttd-filter-container" ref={filterContainerRef}>
        <div className="country-ttd-filter-container__filter">
          <div className="ttd-activities-filter">
            {/* 1. Nút Dropdown Thành phố */}
            <div className="filter-dropdown-wrapper" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className={`filter-btn ${selectedCity ? 'active' : ''} ${activeDropdown === 'city' ? 'open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'city' ? null : 'city')}
              >
                <span className="text">{getCityButtonLabel()}</span>
                {selectedCity ? (
                  <span
                    className="filter-btn-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCity('');
                    }}
                    title="Bỏ chọn thành phố"
                  >
                    ✕
                  </span>
                ) : (
                  <span className="icon">
                    <svg width="12" height="12" viewBox="0 0 48 48" fill="none">
                      <path d="M22.54 31.44L10.58 18.68C9.98 18.05 10.43 17 11.31 17L36.69 17C37.57 17 38.02 18.05 37.42 18.68L25.46 31.44C24.67 32.29 23.33 32.29 22.54 31.44Z" fill="currentColor" stroke="currentColor" strokeWidth="2"></path>
                    </svg>
                  </span>
                )}
              </button>

              {activeDropdown === 'city' && (
                <div className="dropdown-menu">
                  <div
                    className={`dropdown-item ${!selectedCity ? 'selected' : ''}`}
                    onClick={() => { setSelectedCity(''); setActiveDropdown(null); }}
                  >
                    <span>Tất cả thành phố</span>
                  </div>
                  {destinations.map((d) => (
                    <div
                      key={d.id}
                      className={`dropdown-item ${selectedCity === d.slug || selectedCity === d.name ? 'selected' : ''}`}
                      onClick={() => { setSelectedCity(d.slug); setActiveDropdown(null); }}
                    >
                      <span>{d.name}</span>
                      {d.tour_count > 0 && <small style={{ color: '#888' }}>{d.tour_count}</small>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Nút Dropdown Ngày */}
            <div className="filter-dropdown-wrapper" style={{ flexShrink: 0 }}>
              <button
                type="button"
                className={`filter-btn ${selectedDateRange.startDate ? 'active' : ''} ${activeDropdown === 'date' ? 'open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'date' ? null : 'date')}
              >
                <span className="text">{getDateButtonLabel()}</span>
                {selectedDateRange.startDate ? (
                  <span
                    className="filter-btn-clear"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateRange({ startDate: null, endDate: null });
                    }}
                    title="Bỏ chọn ngày"
                  >
                    ✕
                  </span>
                ) : (
                  <span className="icon">
                    <svg width="12" height="12" viewBox="0 0 48 48" fill="none">
                      <path d="M22.54 31.44L10.58 18.68C9.98 18.05 10.43 17 11.31 17L36.69 17C37.57 17 38.02 18.05 37.42 18.68L25.46 31.44C24.67 32.29 23.33 32.29 22.54 31.44Z" fill="currentColor" stroke="currentColor" strokeWidth="2"></path>
                    </svg>
                  </span>
                )}
              </button>

              {activeDropdown === 'date' && (
                <DatePickerModal
                  selectedRange={selectedDateRange}
                  totalCount={totalCount}
                  onApply={(range) => {
                    setSelectedDateRange(range);
                    setActiveDropdown(null);
                  }}
                  onClose={() => setActiveDropdown(null)}
                />
              )}
            </div>

            <div className="filter-divider" style={{ flexShrink: 0 }}></div>

            {/* Nút lọc nhanh Tour Giảm Giá */}
            <button
              type="button"
              className={`filter-btn ${onlySale ? 'active' : ''}`}
              onClick={() => {
                setOnlySale(prev => !prev);
                setCurrentPage(1);
              }}
              style={{
                flexShrink: 0,
                color: onlySale ? '#dc2626' : undefined,
                borderColor: onlySale ? '#f87171' : undefined,
                backgroundColor: onlySale ? '#fef2f2' : undefined,
                fontWeight: onlySale ? 600 : undefined
              }}
            >
              <span className="text">⚡ Giảm giá</span>
              {onlySale && (
                <span
                  className="filter-btn-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOnlySale(false);
                    setCurrentPage(1);
                  }}
                  title="Bỏ lọc giảm giá"
                >
                  ✕
                </span>
              )}
            </button>

            {/* 3. Thanh cuộn ngang Category Tabs (kiểu klk-tabs Klook) */}
            <div className="klk-tabs">
              <div className="klk-tabs-header">
                <div className="klk-tabs-items">
                  <div
                    className={`klk-tabs-item ${selectedCategories.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedCategories([])}
                  >
                    <span>Tất cả</span>
                  </div>
                  {categories.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.slug);
                    return (
                      <div
                        key={cat.id}
                        className={`klk-tabs-item ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleCategory(cat.slug)}
                      >
                        <span>{cat.name}</span>
                        {isSelected && (
                          <span
                            className="tab-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCategory(cat.slug);
                            }}
                            title="Bỏ chọn"
                          >
                            ✕
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 4. Nút icon Lọc (Filter icon button) */}
            <button
              type="button"
              className={`filter-icon-btn${(selectedCategories.length > 0 || guideLanguage.length > 0) ? ' has-filter' : ''}`}
              onClick={openFilterPanel}
              aria-label="Lọc"
              title="Lọc nâng cao"
              style={{ flexShrink: 0, marginLeft: '0.5rem' }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                <circle cx="33" cy="10" r="5.2" stroke="currentColor" strokeWidth="3.6"></circle>
                <circle cx="15" cy="24" r="5.2" stroke="currentColor" strokeWidth="3.6"></circle>
                <circle cx="33" cy="38" r="5.2" stroke="currentColor" strokeWidth="3.6"></circle>
                <path d="M4.75 10H27" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
                <path d="M4.75 38H27" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
                <path d="M4.75 24H9" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
                <path d="M21 24L43.25 24" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
                <path d="M39 10L43.25 10" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
                <path d="M39 38L43.25 38" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round"></path>
              </svg>
              {(selectedCategories.length > 0 || guideLanguage.length > 0) && (
                <span className="filter-icon-dot"></span>
              )}
            </button>
          </div>
        </div>

        {/* ========== FILTER PANEL OVERLAY ========== */}
        {filterPanelOpen && (
          <div className="filter-panel-overlay" onClick={() => setFilterPanelOpen(false)}>
            <div className="filter-panel" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="filter-panel__header">
                <h2 className="filter-panel__title">Lọc</h2>
                <button className="filter-panel__close" onClick={() => setFilterPanelOpen(false)} aria-label="Đóng">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Body - Scrollable */}
              <div className="filter-panel__body">
                {/* Danh mục chính */}
                <div className="filter-panel__section">
                  <h3 className="filter-panel__section-title">Danh mục chính</h3>
                  <div className="filter-panel__pills">
                    {[{ slug: 'tour-trai-nghiem', label: 'Tour & Trải nghiệm' }, { slug: 've-tham-quan', label: 'Vé tham quan' }].map(item => (
                      <button key={item.slug} type="button"
                        className={`filter-pill${panelCategories.includes(item.slug) ? ' active' : ''}`}
                        onClick={() => setPanelCategories(prev => prev.includes(item.slug) ? prev.filter(s => s !== item.slug) : [...prev, item.slug])}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Danh mục */}
                <div className="filter-panel__section">
                  <h3 className="filter-panel__section-title">Danh mục</h3>
                  <div className="filter-panel__pills">
                    {categories.map((cat) => (
                      <button key={cat.id} type="button"
                        className={`filter-pill${panelCategories.includes(cat.slug) ? ' active' : ''}`}
                        onClick={() => setPanelCategories(prev => prev.includes(cat.slug) ? prev.filter(s => s !== cat.slug) : [...prev, cat.slug])}>
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ngôn ngữ hướng dẫn */}
                <div className="filter-panel__section">
                  <h3 className="filter-panel__section-title">Ngôn ngữ hướng dẫn</h3>
                  <div className="filter-panel__pills">
                    {[{ id: 'vi', label: 'Hướng dẫn tiếng Việt' }, { id: 'en', label: 'Hướng dẫn tiếng Anh' }, { id: 'ja', label: 'Hướng dẫn tiếng Nhật' }, { id: 'ko', label: 'Hướng dẫn tiếng Hàn' }].map(lang => (
                      <button key={lang.id} type="button"
                        className={`filter-pill${guideLanguage.includes(lang.id) ? ' active' : ''}`}
                        onClick={() => setGuideLanguage(prev => prev.includes(lang.id) ? prev.filter(l => l !== lang.id) : [...prev, lang.id])}>
                        {lang.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Giá */}
                <div className="filter-panel__section">
                  <h3 className="filter-panel__section-title">Giá</h3>
                  <div className="filter-panel__price-label">
                    <span>₫ {priceRange[0].toLocaleString('vi-VN')}</span>
                    <span>₫ {priceRange[1].toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="filter-panel__price-slider-wrapper">
                    <div className="filter-panel__range-track"></div>
                    <div className="filter-panel__range-track-fill" style={{ left: `${(priceRange[0] / PRICE_MAX) * 100}%`, right: `${100 - (priceRange[1] / PRICE_MAX) * 100}%` }}></div>
                    <input type="range" min="0" max={PRICE_MAX} step="100000" value={priceRange[0]}
                      onChange={(e) => { const v = Number(e.target.value); if (v < priceRange[1]) setPriceRange([v, priceRange[1]]); }}
                      className="filter-panel__range-input" />
                    <input type="range" min="0" max={PRICE_MAX} step="100000" value={priceRange[1]}
                      onChange={(e) => { const v = Number(e.target.value); if (v > priceRange[0]) setPriceRange([priceRange[0], v]); }}
                      className="filter-panel__range-input" />
                  </div>
                  <div className="filter-panel__price-bounds">
                    <span>₫ 0</span>
                    <span>₫ {PRICE_MAX.toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="filter-panel__footer">
                <button type="button" className="filter-panel__clear" onClick={clearFilterPanel}>Xóa</button>
                <button type="button" className="filter-panel__apply" onClick={applyFilterPanel}>
                  Hiển {totalCount > 0 ? `${totalCount.toLocaleString()}+` : ''} kết quả
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== ROW: SỐ LƯỢNG & SẮP XẾP ========== */}
        <div className="country-ttd-filter-container__num-sort">
          <div className="country-ttd-filter-container__num-activities">
            {loading ? 'Đang tải hoạt động...' : `Xem ${totalCount} hoạt động ở Việt Nam`}
          </div>

          <div className="country-ttd-filter-container__desktop-sort">
            <span className="country-ttd-filter-container__sort-by">Sắp xếp theo</span>
            <div className="sort-select-box">
              <button
                type="button"
                className={`sort-select-btn ${activeDropdown === 'sort' ? 'open' : ''}`}
                onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
              >
                <span>{getSortLabel()}</span>
                <svg width="12" height="12" viewBox="0 0 48 48" fill="none">
                  <path d="M10 17L24 32L31 24.5L38 17" stroke="currentColor" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </button>

              {activeDropdown === 'sort' && (
                <div className="dropdown-menu" style={{ right: 0, left: 'auto' }}>
                  {[
                    { id: 'most_relevant', label: 'Nên đặt' },
                    { id: 'price_asc', label: 'Giá thấp nhất' },
                    { id: 'price_desc', label: 'Giá cao nhất' },
                    { id: 'participants', label: 'Đặt nhiều nhất' },
                    { id: 'rating_desc', label: 'Ưa thích nhất' },
                  ].map((s) => (
                    <div
                      key={s.id}
                      className={`dropdown-item ${sortBy === s.id ? 'selected' : ''}`}
                      onClick={() => { setSortBy(s.id); setActiveDropdown(null); }}
                    >
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========== GRID DANH SÁCH TOUR (ADAPTIVE CARDS KLOOK) ========== */}
        <div className="country-ttd-filter-container__list">
          {loading ? (
            // Skeleton Loading State
            Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="skeleton-card">
                <div className="skeleton-img"></div>
                <div className="skeleton-content">
                  <div className="skeleton-line" style={{ width: '40%' }}></div>
                  <div className="skeleton-line" style={{ width: '90%', height: '18px' }}></div>
                  <div className="skeleton-line" style={{ width: '60%' }}></div>
                  <div className="skeleton-line" style={{ width: '35%', marginTop: '1rem' }}></div>
                </div>
              </div>
            ))
          ) : tours.length === 0 ? (
            // Empty State
            <div className="tour-list-empty">
              <div className="tour-list-empty-icon">🔍</div>
              <h3>Không tìm thấy hoạt động nào phù hợp</h3>
              <p>Hãy thử thay đổi thành phố, danh mục hoặc xóa bộ lọc để xem thêm các trải nghiệm khác</p>
              <button onClick={handleClearAllFilters}>Xóa tất cả bộ lọc</button>
            </div>
          ) : (
            // Danh sách Tour Card
            tours.map((tour) => {
              const isFav = isFavorite(tour.id);
              const category = tour.category_name || tour.category || 'Hoạt động';
              const destination = tour.destination_name || tour.destination || '';
              const tags = Array.isArray(tour.tags) ? tour.tags : [];
              const price = typeof tour.price_adult === 'string' ? parseFloat(tour.price_adult) : (tour.price_adult || 0);
              const reviewCount = tour.review_count || 0;
              const rating = tour.rating || 0;
              const salePercent = Number(tour.sale_percent) || 0;
              const isSale = Boolean((tour.is_priority_sale || salePercent > 0) && salePercent > 0);

              return (
                <Link to={`/tours/${tour.id}`} key={tour.id} className="adaptive-card">
                  {/* Ảnh thẻ & nút yêu thích */}
                  <div className="card-img">
                    <img src={tour.thumbnail} alt={tour.name} loading="lazy" />
                    <div className="card-badges-wrapper">
                      {tour.is_hot ? <div className="card-hot-badge">Hot</div> : null}
                      {isSale ? (
                        <div className="card-sale-badge">
                          ⚡ SALE {salePercent}%
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

                  {/* Thông tin Card */}
                  <div className="card-info">
                    <div className="card-info-top">
                      {/* Danh mục & Địa điểm */}
                      <div className="card-subText">
                        {category}{destination ? ` · ${destination}` : ''}
                      </div>

                      {/* Tiêu đề tour */}
                      <h3 className="card-title" title={tour.name}>
                        {tour.name}
                      </h3>

                      {/* Danh sách Tags */}
                      {tags.length > 0 && (
                        <div className="tag-list">
                          {tags.slice(0, 3).map((tag, i) => (
                            <div key={i} className="tag">
                              {tag}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Đánh giá & Số lượt đặt */}
                      <div className="atomic-minimal-rating">
                        <span className="review-star">★ {rating}</span>
                        <span className="review-booked">
                          ({reviewCount.toLocaleString()} đánh giá
                          {tour.booked_count && ` • ${tour.booked_count} Đã đặt`})
                        </span>
                      </div>
                    </div>

                    {/* Giá & Khuyến mãi */}
                    <div className="card-price-bottom">
                      <div className="card-price">
                        {isSale ? (
                          <div className="card-price-sale-wrap">
                            <span className="original-price-strike">
                              {formatCurrency(price)}
                            </span>
                            <div className="sell-price sale-highlight">
                              <span className="sell-price-prefix">₫</span>
                              {formatCurrency(tour.sale_price || Math.round(price * (100 - salePercent) / 100)).replace(' ₫', '')}
                            </div>
                          </div>
                        ) : (
                          <div className="sell-price">
                            <span className="sell-price-prefix">₫</span>
                            {formatCurrency(price).replace(' ₫', '')}
                          </div>
                        )}
                      </div>
                      {tour.promo && (
                        <div className="promo-tag">
                          <span className="promo-badge-sale">{tour.promo}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* ========== THANH PHÂN TRANG (PAGINATION) ========== */}
        {!loading && totalPages > 1 && (
          <div className="tour-pagination">
            <button
              type="button"
              className="pagination-btn pagination-nav"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
              aria-label="Trang trước"
              title="Trang trước"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>

            {getPaginationRange().map((p, idx) =>
              p === '...' ? (
                <span key={`dots-${idx}`} className="pagination-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={`pagination-btn pagination-num ${currentPage === p ? 'active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              )
            )}

            <button
              type="button"
              className="pagination-btn pagination-nav"
              disabled={currentPage === totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
              aria-label="Trang sau"
              title="Trang sau"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  </div>
);
}

export default TourListPage;
