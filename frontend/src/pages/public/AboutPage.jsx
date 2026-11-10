import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AboutPage.css';

// Dữ liệu đội ngũ HDV tiêu biểu
const TEAM_GUIDES = [
  {
    id: 1,
    name: 'Phùng Thanh Độ',
    role: 'Trưởng ban HDV Miền Trung',
    experience: '8 năm kinh nghiệm',
    specialty: 'Đà Nẵng - Hội An - Huế',
    rating: '5.0',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
    quote: 'Mỗi chuyến đi không chỉ là tham quan, mà là một câu chuyện văn hóa sống động.'
  },
  {
    id: 2,
    name: 'Nguyễn Hải Đăng',
    role: 'Chuyên gia Tour Tây Bắc',
    experience: '6 năm kinh nghiệm',
    specialty: 'Sa Pa - Hà Giang - Fansipan',
    rating: '4.9',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    quote: 'Chinh phục những cung đường hùng vĩ cùng sự an toàn tuyệt đối cho du khách.'
  },
  {
    id: 3,
    name: 'Lê Minh Hoàng',
    role: 'Chuyên gia Biển Đảo',
    experience: '7 năm kinh nghiệm',
    specialty: 'Phú Quốc - Nha Trang - Côn Đảo',
    rating: '5.0',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    quote: 'Đem đến những trải nghiệm lặn biển và ngắm hoàng hôn rực rỡ nhất Việt Nam.'
  },
  {
    id: 4,
    name: 'Trần Thu Trang',
    role: 'Chuyên gia Di Sản & Lịch Sử',
    experience: '5 năm kinh nghiệm',
    specialty: 'Hà Nội - Vịnh Hạ Long - Ninh Bình',
    rating: '4.9',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    quote: 'Luôn lắng nghe, chu đáo và chăm sóc đoàn khách như những người thân trong gia đình.'
  }
];

// Các mốc số liệu thống kê
const STATS = [
  { number: '50+', label: 'Tuyến Tour Chọn Lọc', icon: '🌍' },
  { number: '15.000+', label: 'Du Khách Hài Lòng', icon: '🎒' },
  { number: '99.2%', label: 'Đánh Giá 5 Sao', icon: '⭐' },
  { number: '100%', label: 'HDV Bản Địa Chuyên Nghiệp', icon: '🧑‍💼' }
];

// Giá trị cốt lõi
const CORE_VALUES = [
  {
    icon: '⚡',
    title: 'Thanh Toán VietQR Tức Thì',
    desc: 'Tự động tạo mã QR chính xác từng đồng, tích hợp sẵn số tài khoản và mã đơn đặt tour, xác nhận cọc nhanh chóng.'
  },
  {
    icon: '💬',
    title: 'Tư Vấn Trực Tuyến Hybrid',
    desc: 'Hệ thống trợ lý ảo thông minh trả lời ngay lập tức 24/7, đồng thời kết nối trực tiếp với Hướng dẫn viên phụ trách tour.'
  },
  {
    icon: '🛡️',
    title: 'An Toàn & Bảo Hiểm Toàn Diện',
    desc: 'Mọi hành trình đều có bảo hiểm du lịch trọn gói, phương tiện đời mới và tuân thủ các tiêu chuẩn an toàn cao nhất.'
  },
  {
    icon: '🏷️',
    title: 'Giá Minh Bạch - Không Chi Phí Ẩn',
    desc: 'Báo giá rõ ràng từ đầu, chính sách trẻ em và điều khoản hủy tour công khai, đem lại sự an tâm tuyệt đối.'
  }
];

export default function AboutPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Về chúng tôi | Tourism - Hệ thống đặt tour thông minh';
  }, []);

  return (
    <div className="about-page">
      {/* 1. HERO BANNER */}
      <section className="about-hero">
        <div className="about-hero-overlay" />
        <div className="about-hero-content">
          <span className="about-badge">✨ VỀ CHÚNG TÔI • TOURISM</span>
          <h1 className="about-hero-title">
            Kết Nối Đam Mê Xê Dịch <br />
            <span className="text-highlight">Nâng Tầm Trải Nghiệm Du Lịch Việt</span>
          </h1>
          <p className="about-hero-subtitle">
            Chúng tôi tiên phong ứng dụng công nghệ hiện đại vào ngành lữ hành, mang đến cho bạn 
            những chuyến đi trọn vẹn cảm xúc với quy trình đặt chỗ thông minh, tiện lợi và an toàn.
          </p>
          <div className="about-hero-actions">
            <Link to="/tours" className="btn-about-primary">
              Khám Phá Tour Ngay 🚀
            </Link>
            <a href="#story" className="btn-about-secondary">
              Tìm Hiểu Thêm ↓
            </a>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR */}
      <section className="about-stats-section">
        <div className="about-container">
          <div className="about-stats-grid">
            {STATS.map((stat, idx) => (
              <div key={idx} className="about-stat-card">
                <span className="stat-icon">{stat.icon}</span>
                <h3 className="stat-number">{stat.number}</h3>
                <p className="stat-label">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. CÂU CHUYỆN THƯƠNG HIỆU */}
      <section id="story" className="about-story-section">
        <div className="about-container">
          <div className="about-story-grid">
            <div className="about-story-text">
              <span className="section-tag">CÂU CHUYỆN KHỞI NGUỒN</span>
              <h2 className="section-title">
                Hành Trình Kiến Tạo <br />
                Giải Pháp Du Lịch Thông Minh
              </h2>
              <p className="story-paragraph">
                <strong>Tourism</strong> được thành lập từ tình yêu sâu sắc với vẻ đẹp non nước Việt Nam 
                và sự trăn trở trước những rào cản truyền thống: quy trình đặt tour rườm rà, thông tin lịch trình thiếu minh bạch, 
                và khách hàng thường phải chờ đợi rất lâu để nhận được tư vấn.
              </p>
              <p className="story-paragraph">
                Với mục tiêu <em>"Chuyển đổi số ngành du lịch"</em>, chúng tôi xây dựng một nền tảng all-in-one: 
                nơi du khách có thể khám phá lịch trình chi tiết theo từng ngày, lưu lại các tour yêu thích, 
                thanh toán cọc tự động qua mã <strong>VietQR</strong> chỉ trong vài giây, và nhận hỗ trợ 24/7 
                từ cả Trợ lý ảo AI và đội ngũ <strong>Hướng dẫn viên bản địa</strong> dày dạn kinh nghiệm.
              </p>

              <div className="story-highlights">
                <div className="highlight-item">
                  <div className="highlight-icon">🎯</div>
                  <div>
                    <h4>Sứ Mệnh</h4>
                    <p>Giúp mọi người tiếp cận vẻ đẹp đất nước dễ dàng, an tâm với chi phí hợp lý nhất.</p>
                  </div>
                </div>
                <div className="highlight-item">
                  <div className="highlight-icon">🔭</div>
                  <div>
                    <h4>Tầm Nhìn</h4>
                    <p>Trở thành nền tảng du lịch trực tuyến số 1 về trải nghiệm khách hàng và dịch vụ công nghệ tại Việt Nam.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="about-story-media">
              <div className="story-image-wrap">
                <img 
                  src="https://images.unsplash.com/photo-1528127269322-539801943592?w=800&auto=format&fit=crop&q=80" 
                  alt="Du lịch Việt Nam" 
                  className="story-main-img"
                />
                <div className="story-floating-card">
                  <div className="floating-badge">🏆 Cam Kết 100%</div>
                  <p className="floating-text">Trải nghiệm du lịch chất lượng, lịch trình chuẩn chỉ từng điểm đến.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. GIÁ TRỊ CỐT LÕI (WHY CHOOSE US) */}
      <section className="about-values-section">
        <div className="about-container">
          <div className="section-header text-center">
            <span className="section-tag">TẠI SAO CHỌN TOURISM</span>
            <h2 className="section-title">Trải Nghiệm Khác Biệt Chúng Tôi Mang Lại</h2>
            <p className="section-subtitle">
              Sự hài lòng và an toàn của du khách là kim chỉ nam trong mọi hoạt động của Tourism.
            </p>
          </div>

          <div className="about-values-grid">
            {CORE_VALUES.map((val, idx) => (
              <div key={idx} className="value-card">
                <div className="value-icon">{val.icon}</div>
                <h3 className="value-title">{val.title}</h3>
                <p className="value-desc">{val.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. ĐỘI NGŨ HƯỚNG DẪN VIÊN */}
      <section className="about-team-section">
        <div className="about-container">
          <div className="section-header text-center">
            <span className="section-tag">ĐỘI NGŨ CHUYÊN NGHIỆP</span>
            <h2 className="section-title">Những Người Đồng Hành Tận Tâm</h2>
            <p className="section-subtitle">
              Mỗi tour du lịch đều có Hướng dẫn viên bản địa phụ trách trực tiếp, sẵn sàng giải đáp thắc mắc và chăm sóc đoàn khách.
            </p>
          </div>

          <div className="about-team-grid">
            {TEAM_GUIDES.map(guide => (
              <div key={guide.id} className="guide-card">
                <div className="guide-img-box">
                  <img src={guide.avatar} alt={guide.name} className="guide-avatar" />
                  <span className="guide-rating">⭐ {guide.rating}</span>
                </div>
                <div className="guide-info">
                  <h3 className="guide-name">{guide.name}</h3>
                  <span className="guide-role">{guide.role}</span>
                  <div className="guide-meta">
                    <span className="meta-tag">⏳ {guide.experience}</span>
                    <span className="meta-tag">📍 {guide.specialty}</span>
                  </div>
                  <p className="guide-quote">"{guide.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. QUY TRÌNH 4 BƯỚC ĐƠN GIẢN */}
      <section className="about-process-section">
        <div className="about-container">
          <div className="section-header text-center">
            <span className="section-tag">QUY TRÌNH TIỆN LỢI</span>
            <h2 className="section-title">Chỉ Với 4 Bước Đơn Giản Cho Mọi Chuyến Đi</h2>
          </div>

          <div className="process-steps-grid">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">🔍</div>
              <h4>Khám Phá & Chọn Tour</h4>
              <p>Lọc tour theo ngân sách, thời gian, điểm đến yêu thích và xem lịch trình chi tiết.</p>
            </div>
            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">💬</div>
              <h4>Nhận Tư Vấn Trực Tuyến</h4>
              <p>Hỏi đáp ngay với trợ lý ảo hoặc bấm "Cần tư vấn" để HDV gọi điện tư vấn miễn phí.</p>
            </div>
            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">📱</div>
              <h4>Quét Mã VietQR</h4>
              <p>Thanh toán cọc nhanh chóng qua ứng dụng ngân hàng bất kỳ với mã QR tự sinh.</p>
            </div>
            <div className="step-card">
              <div className="step-number">04</div>
              <div className="step-icon">🎒</div>
              <h4>Lên Đường Trải Nghiệm</h4>
              <p>Nhận xác nhận qua tài khoản, HDV đón tiếp đoàn và bắt đầu hành trình tuyệt vời.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. CTA BANNER */}
      <section className="about-cta-section">
        <div className="about-cta-box">
          <div className="cta-content">
            <h2>Sẵn Sàng Cho Hành Trình Mới Cùng Tourism?</h2>
            <p>Hàng chục tour ưu đãi hấp dẫn đang chờ bạn khám phá. Đặt chỗ ngay hôm nay để nhận ưu đãi đặc biệt!</p>
            <div className="cta-buttons">
              <Link to="/tours" className="btn-cta-white">
                Khám Phá Các Tuyến Tour 🌊
              </Link>
              <Link to="/favorites" className="btn-cta-outline">
                Danh Sách Yêu Thích ❤️
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
