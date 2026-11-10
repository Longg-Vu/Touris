import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Cột 1: Thương hiệu & Phương thức thanh toán */}
        <div className="footer-section footer-brand-col">
          <Link to="/" className="footer-brand-logo">🌍 Tourism</Link>
          <p className="footer-brand-desc">
            Nền tảng đặt tour và vé tham quan trực tuyến thông minh tại Việt Nam.
            Tích hợp thanh toán tự động VietQR Napas247 và tư vấn trực tuyến Hybrid AI & Hướng dẫn viên 24/7.
          </p>
          <div className="footer-payment-badges">
            <span className="payment-pill">💳 VietQR</span>
            <span className="payment-pill">🏦 Napas 247</span>
            <span className="payment-pill">🛡️ MB Bank</span>
          </div>
        </div>

        {/* Cột 2: Khám phá nhanh */}
        <div className="footer-section">
          <h4>Khám phá</h4>
          <ul>
            <li><Link to="/">Trang chủ</Link></li>
            <li><Link to="/tours">Tất cả Tour du lịch</Link></li>
            <li><Link to="/tours?on_sale=true">⚡ Tour đang giảm giá</Link></li>
            <li><Link to="/destinations">Bản đồ 32 Điểm đến</Link></li>
            <li><Link to="/favorites">Danh sách Yêu thích</Link></li>
            <li><Link to="/about">Về chúng tôi</Link></li>
          </ul>
        </div>

        {/* Cột 3: Điểm đến nổi bật */}
        <div className="footer-section">
          <h4>Điểm đến hàng đầu</h4>
          <ul>
            <li><Link to="/tours?destination=da-nang">Du lịch Đà Nẵng</Link></li>
            <li><Link to="/tours?destination=phu-quoc">Đảo Ngọc Phú Quốc</Link></li>
            <li><Link to="/tours?destination=ha-long">Du thuyền Vịnh Hạ Long</Link></li>
            <li><Link to="/tours?destination=sa-pa">Săn mây Sa Pa</Link></li>
            <li><Link to="/tours?destination=da-lat">Thành phố Đà Lạt</Link></li>
            <li><Link to="/tours?destination=nha-trang">Vịnh biển Nha Trang</Link></li>
          </ul>
        </div>

        {/* Cột 4: Liên hệ & Hỗ trợ */}
        <div className="footer-section">
          <h4>Liên hệ & Hỗ trợ 24/7</h4>
          <ul className="footer-contact-list">
            <li>📍 Hải Châu, TP. Đà Nẵng, Việt Nam</li>
            <li>📞 Hotline: <strong>1900 6868 • 0123 456 789</strong></li>
            <li>📧 thaihuulongvu15092004@gmail.com</li>
            <li>⏰ Hoạt động: 07:30 – 22:00 (T2 – CN)</li>
          </ul>
          <Link to="/contact" className="footer-cta-btn">
            📝 Gửi yêu cầu tư vấn tour
          </Link>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <p>&copy; 2026 Tourism Vietnam. Hệ thống quản lý & đặt tour du lịch trực tuyến – Đồ án tốt nghiệp.</p>
          <div className="footer-bottom-links">
            <Link to="/about">Giới thiệu</Link>
            <span>•</span>
            <Link to="/contact">Chính sách hoàn hủy & FAQ</Link>
            <span>•</span>
            <Link to="/contact">Liên hệ hỗ trợ</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
