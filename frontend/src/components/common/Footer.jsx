import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>🌍 Tourism</h3>
          <p>Hệ thống quản lý và đặt tour du lịch trực tuyến.</p>
        </div>
        <div className="footer-section">
          <h4>Liên kết</h4>
          <ul>
            <li><a href="/">Trang chủ</a></li>
            <li><a href="/tours">Tour du lịch</a></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Liên hệ</h4>
          <p>📧 thaihuulongvu15092004@gmail.com</p>
          <p>📞 0123 456 789</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 Tourism. Đồ án tốt nghiệp.</p>
      </div>
    </footer>
  );
}

export default Footer;
