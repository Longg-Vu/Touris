import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './NotFoundPage.css';

export default function NotFoundPage() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = '404 - Không tìm thấy trang | Tourism';
  }, []);

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <div className="not-found-badge">🧭 LẠC ĐƯỜNG RỒI!</div>
        <div className="not-found-code">404</div>
        <h1>Trang bạn đang tìm kiếm không tồn tại</h1>
        <p>
          Có vẻ như tọa độ du lịch này đã thay đổi hoặc đường dẫn không chính xác.
          Hãy quay lại trang chủ để tiếp tục khám phá 32 điểm đến tuyệt đẹp khắp Việt Nam nhé!
        </p>
        <div className="not-found-actions">
          <Link to="/" className="btn-nf-primary">
            🏠 Về Trang Chủ
          </Link>
          <Link to="/tours" className="btn-nf-secondary">
            🌍 Khám Phá Các Tour
          </Link>
          <Link to="/destinations" className="btn-nf-secondary">
            🗺️ Xem 32 Điểm Đến
          </Link>
        </div>
      </div>
    </div>
  );
}

