import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { destinationAPI } from '../../api/services';
import './DestinationsPage.css';

// Phân vùng địa lý & điểm nhấn đặc trưng cho 32 địa điểm nổi tiếng Việt Nam
const DESTINATION_META = {
  // Miền Bắc
  'ha-noi': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thủ đô ngàn năm văn hiến', bestSeason: 'Tháng 9 – Tháng 11' },
  'ha-long': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Di sản thiên nhiên thế giới', bestSeason: 'Tháng 4 – Tháng 10' },
  'sa-pa': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thành phố trong sương & Fansipan', bestSeason: 'Tháng 9 – Tháng 4' },
  'ninh-binh': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Quần thể danh thắng Tràng An', bestSeason: 'Tháng 2 – Tháng 6' },
  'hai-phong': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Đảo Cát Bà & Vịnh Lan Hạ', bestSeason: 'Tháng 4 – Tháng 9' },
  'ha-giang': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Cao nguyên đá Đồng Văn hùng vĩ', bestSeason: 'Tháng 10 – Tháng 12' },
  'moc-chau': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thảo nguyên đồi chè xanh mướt', bestSeason: 'Tháng 11 – Tháng 3' },
  'mu-cang-chai': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Tuyệt tác ruộng bậc thang mùa lúa chín', bestSeason: 'Tháng 9 – Tháng 10' },
  'tam-dao': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thị trấn săn mây gần Hà Nội', bestSeason: 'Quanh năm' },
  'cao-bang': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thác Bản Giốc & Suối Lê-nin', bestSeason: 'Tháng 9 – Tháng 11' },
  'mai-chau': { region: 'north', regionLabel: 'Miền Bắc', tag: 'Thung lũng bình yên văn hóa Thái', bestSeason: 'Tháng 10 – Tháng 4' },

  // Miền Trung & Tây Nguyên
  'da-nang': { region: 'central', regionLabel: 'Miền Trung', tag: 'Thành phố đáng sống & Bà Nà Hills', bestSeason: 'Tháng 3 – Tháng 8' },
  'da-lat': { region: 'central', regionLabel: 'Tây Nguyên', tag: 'Thành phố ngàn hoa & thông reo', bestSeason: 'Quanh năm' },
  'nha-trang': { region: 'central', regionLabel: 'Miền Trung', tag: 'Thiên đường vịnh biển & VinWonders', bestSeason: 'Tháng 3 – Tháng 9' },
  'hoi-an': { region: 'central', regionLabel: 'Miền Trung', tag: 'Phố cổ đèn lồng di sản UNESCO', bestSeason: 'Tháng 2 – Tháng 8' },
  'hue': { region: 'central', regionLabel: 'Miền Trung', tag: 'Kinh thành cổ kính bên dòng sông Hương', bestSeason: 'Tháng 1 – Tháng 5' },
  'phan-thiet': { region: 'central', regionLabel: 'Miền Trung', tag: 'Đồi cát bay Mũi Né & biển xanh', bestSeason: 'Tháng 11 – Tháng 5' },
  'quy-nhon': { region: 'central', regionLabel: 'Miền Trung', tag: 'Kỳ Co – Eo Gió tuyệt sắc miền Trung', bestSeason: 'Tháng 3 – Tháng 9' },
  'dong-hoi': { region: 'central', regionLabel: 'Miền Trung', tag: 'Vương quốc hang động Phong Nha - Kẻ Bàng', bestSeason: 'Tháng 4 – Tháng 8' },
  'buon-ma-thuot': { region: 'central', regionLabel: 'Tây Nguyên', tag: 'Thủ phủ cà phê & đại ngàn Tây Nguyên', bestSeason: 'Tháng 11 – Tháng 3' },
  'cua-lo': { region: 'central', regionLabel: 'Miền Trung', tag: 'Biển xanh xứ Nghệ & quê hương Bác', bestSeason: 'Tháng 4 – Tháng 8' },

  // Miền Nam & Biển Đảo
  'ho-chi-minh': { region: 'south', regionLabel: 'Miền Nam', tag: 'Đô thị sôi động bậc nhất phương Nam', bestSeason: 'Quanh năm' },
  'phu-quoc': { region: 'south', regionLabel: 'Biển Đảo', tag: 'Đảo Ngọc hoàng hôn & cáp treo Hòn Thơm', bestSeason: 'Tháng 11 – Tháng 4' },
  'tay-ninh': { region: 'south', regionLabel: 'Miền Nam', tag: 'Nóc nhà Nam Bộ núi Bà Đen linh thiêng', bestSeason: 'Tháng 11 – Tháng 5' },
  'my-tho': { region: 'south', regionLabel: 'Miền Tây', tag: 'Cửa ngõ sông nước Cửu Long trù phú', bestSeason: 'Quanh năm' },
  'vung-tau': { region: 'south', regionLabel: 'Miền Nam', tag: 'Phố biển nghỉ dưỡng cuối tuần lý tưởng', bestSeason: 'Quanh năm' },
  'can-tho': { region: 'south', regionLabel: 'Miền Tây', tag: 'Chợ nổi Cái Răng & bến Ninh Kiều', bestSeason: 'Tháng 8 – Tháng 4' },
  'con-dao': { region: 'south', regionLabel: 'Biển Đảo', tag: 'Hoang sơ biển ngọc & lịch sử hào hùng', bestSeason: 'Tháng 3 – Tháng 9' },
  'thanh-pho-ben-tre': { region: 'south', regionLabel: 'Miền Tây', tag: 'Xứ dừa miệt vườn xanh mát', bestSeason: 'Quanh năm' },
  'thanh-pho-chau-doc': { region: 'south', regionLabel: 'Miền Tây', tag: 'Rừng tràm Trà Sư & văn hóa tâm linh', bestSeason: 'Tháng 9 – Tháng 11' },
  'ca-mau': { region: 'south', regionLabel: 'Miền Tây', tag: 'Cực Nam Tổ Quốc & rừng ngập mặn', bestSeason: 'Tháng 12 – Tháng 4' },
  'bien-hoa': { region: 'south', regionLabel: 'Miền Nam', tag: 'Khu du lịch sinh thái & thác Giang Điền', bestSeason: 'Quanh năm' },
};

const REGION_TABS = [
  { id: 'all', label: '🇻🇳 Tất cả điểm đến' },
  { id: 'north', label: '🏔️ Miền Bắc' },
  { id: 'central', label: '🏖️ Miền Trung & Tây Nguyên' },
  { id: 'south', label: '🌴 Miền Nam & Miền Tây' },
];

export default function DestinationsPage() {
  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRegion, setActiveRegion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Khám phá Điểm đến Việt Nam | Tourism';

    let isMounted = true;
    destinationAPI.getAll()
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.results || res.data || [];
        if (Array.isArray(data)) {
          setDestinations(data);
        }
      })
      .catch((err) => console.error('Lỗi tải danh sách điểm đến:', err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const enrichedDestinations = useMemo(() => {
    return destinations.map((d) => {
      const meta = DESTINATION_META[d.slug] || {
        region: 'central',
        regionLabel: 'Việt Nam',
        tag: 'Điểm đến du lịch hấp dẫn',
        bestSeason: 'Quanh năm',
      };
      return { ...d, ...meta };
    });
  }, [destinations]);

  const filteredDestinations = useMemo(() => {
    return enrichedDestinations.filter((d) => {
      const matchRegion = activeRegion === 'all' || d.region === activeRegion;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.tag.toLowerCase().includes(q) ||
        d.regionLabel.toLowerCase().includes(q);
      return matchRegion && matchSearch;
    });
  }, [enrichedDestinations, activeRegion, searchQuery]);

  return (
    <div className="destinations-page">
      {/* HERO BANNER */}
      <section className="dest-hero">
        <div className="dest-hero-overlay" />
        <div className="dest-hero-content">
          <span className="dest-hero-badge">🗺️ BẢN ĐỒ DU LỊCH VIỆT NAM</span>
          <h1>Khám Phá 32 Điểm Đến Nổi Tiếng Nhất</h1>
          <p>
            Từ những đỉnh núi mây mù Tây Bắc, di sản miền Trung cổ kính đến vùng biển đảo phương Nam rực nắng —
            hãy chọn tọa độ tiếp theo cho hành trình của bạn.
          </p>

          {/* Thanh tìm kiếm địa điểm */}
          <div className="dest-search-bar">
            <span className="dest-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Tìm tỉnh/thành phố hoặc cảnh đẹp (VD: Đà Nẵng, Hà Giang, Phú Quốc...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="dest-search-clear"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </section>

      {/* FILTER TABS & GRID */}
      <div className="dest-container">
        <div className="dest-toolbar">
          <div className="dest-region-tabs">
            {REGION_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`dest-region-btn ${activeRegion === tab.id ? 'active' : ''}`}
                onClick={() => setActiveRegion(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="dest-count-label">
            Hiển thị <strong>{filteredDestinations.length}</strong> địa điểm
          </div>
        </div>

        {loading ? (
          <div className="dest-loading">Đang tải bản đồ điểm đến...</div>
        ) : filteredDestinations.length === 0 ? (
          <div className="dest-empty">
            <p>Không tìm thấy địa điểm nào khớp với từ khóa "{searchQuery}".</p>
            <button
              type="button"
              className="dest-reset-btn"
              onClick={() => { setActiveRegion('all'); setSearchQuery(''); }}
            >
              Xem tất cả 32 điểm đến
            </button>
          </div>
        ) : (
          <div className="dest-grid">
            {filteredDestinations.map((city) => {
              const imageUrl = city.image_url || city.image;
              const tourCount = city.tour_count || 0;
              return (
                <Link
                  key={city.id || city.slug}
                  to={`/tours?destination=${encodeURIComponent(city.slug)}`}
                  className="dest-card"
                >
                  <div className="dest-card-img-wrap">
                    <img
                      src={imageUrl}
                      alt={city.name}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://res.klook.com/image/upload/fl_lossy.progressive,w_530,h_707,c_fill,q_85/v1761129090/destination/ssfx9kapyozmdykbevx6.webp';
                      }}
                    />
                    <span className="dest-card-region-badge">{city.regionLabel}</span>
                    <span className="dest-card-count-badge">
                      {tourCount > 0 ? `${tourCount} hoạt động` : 'Khám phá ngay'}
                    </span>
                  </div>
                  <div className="dest-card-body">
                    <h3 className="dest-card-title">{city.name}</h3>
                    <p className="dest-card-tag">{city.tag}</p>
                    <div className="dest-card-footer">
                      <span className="dest-card-season">🌤️ Mùa đẹp: {city.bestSeason}</span>
                      <span className="dest-card-cta">Xem tour →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

