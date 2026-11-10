import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { consultationAPI, tourAPI } from '../../api/services';
import './ContactPage.css';

const FAQ_ITEMS = [
  {
    q: 'Thanh toán qua mã VietQR trên hệ thống hoạt động như thế nào?',
    a: 'Ngay sau khi bạn chọn ngày khởi hành và xác nhận đặt tour, hệ thống sẽ tự động tạo mã VietQR chuẩn Napas247 chứa sẵn số tài khoản công ty, số tiền chính xác và nội dung chuyển khoản (BOOKING + Mã đơn). Bạn chỉ cần mở ứng dụng ngân hàng bất kỳ quét mã là hoàn tất trong 5 giây.'
  },
  {
    q: 'Chính sách hoàn hủy hoặc đổi ngày khởi hành như thế nào?',
    a: 'Du khách được hỗ trợ hủy hoặc đổi lịch miễn phí trước ngày khởi hành từ 3 – 7 ngày (tùy tuyến tour). Bạn có thể quản lý đơn trực tiếp tại mục "Đơn đặt của tôi" hoặc nhắn qua khung Chat trực tuyến 24/7 để được hỗ trợ ngay.'
  },
  {
    q: 'Giá vé dành cho trẻ em được tính ra sao?',
    a: 'Hệ thống áp dụng mức giá ưu đãi cho trẻ em bằng 70% giá vé người lớn. Trẻ nhỏ dưới chiều cao quy định tại các khu vui chơi/cáp treo được miễn phí theo chính sách từng điểm đến.'
  },
  {
    q: 'Đoàn đông người hoặc công ty muốn thiết kế lịch trình riêng thì làm thế nào?',
    a: 'Bạn chỉ cần điền thông tin vào biểu mẫu "Đăng ký tư vấn & Đặt tour đoàn" ngay trên trang này. Đội ngũ điều hành tour và Hướng dẫn viên trưởng vùng sẽ liên hệ thiết kế lịch trình riêng cùng mức chiết khấu đoàn lên tới 25%.'
  },
  {
    q: 'Làm sao để tôi liên hệ với Hướng dẫn viên phụ trách chuyến đi?',
    a: 'Mỗi tour đều có Hướng dẫn viên bản địa phụ trách riêng. Khi bạn gửi yêu cầu tư vấn hoặc đặt tour, hệ thống sẽ tự động phân công đúng Hướng dẫn viên của tuyến đó để gọi điện hướng dẫn chuẩn bị hành lý và điểm đón.'
  }
];

export default function ContactPage() {
  const { user, isAuthenticated } = useAuth();
  const [featuredTours, setFeaturedTours] = useState([]);
  const [openFaq, setOpenFaq] = useState(0);

  const [formData, setFormData] = useState({
    customer_name: '',
    phone: '',
    email: '',
    tour_id: '',
    group_size: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'Liên hệ & Tư vấn Tour | Tourism';

    tourAPI.getAll({ is_featured: true })
      .then((res) => {
        const list = res.data?.results || res.data || [];
        if (Array.isArray(list)) setFeaturedTours(list);
      })
      .catch(() => {});
  }, []);

  // Tự động điền thông tin nếu người dùng đã đăng nhập
  useEffect(() => {
    if (isAuthenticated && user) {
      const fullName = user.first_name
        ? `${user.first_name} ${user.last_name || ''}`.trim()
        : user.username || '';
      setFormData((prev) => ({
        ...prev,
        customer_name: prev.customer_name || fullName,
        phone: prev.phone || user.phone || '',
        email: prev.email || user.email || '',
      }));
    }
  }, [isAuthenticated, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMsg) setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.customer_name.trim() || !formData.phone.trim() || !formData.email.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Họ tên, Số điện thoại và Email.');
      return;
    }

    setSubmitting(true);
    try {
      const combinedNote = [
        formData.group_size ? `[Quy mô đoàn: ${formData.group_size}]` : '',
        formData.note.trim(),
      ]
        .filter(Boolean)
        .join(' - ');

      const payload = {
        customer_name: formData.customer_name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        note: combinedNote || 'Yêu cầu tư vấn lịch trình từ trang Liên hệ',
      };
      if (formData.tour_id) {
        payload.tour_id = Number(formData.tour_id);
      }

      await consultationAPI.create(payload);
      setSubmitSuccess(true);
      setFormData((prev) => ({ ...prev, tour_id: '', group_size: '', note: '' }));
    } catch (err) {
      const detail =
        err.response?.data?.customer_name?.[0] ||
        err.response?.data?.phone?.[0] ||
        err.response?.data?.email?.[0] ||
        err.response?.data?.detail ||
        'Không thể gửi yêu cầu lúc này. Vui lòng kiểm tra lại thông tin.';
      setErrorMsg(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-page">
      {/* HERO */}
      <section className="contact-hero">
        <div className="contact-hero-overlay" />
        <div className="contact-hero-content">
          <span className="contact-badge">📞 HỖ TRỢ KHÁCH HÀNG 24/7</span>
          <h1>Đồng Hành Cùng Bạn Trên Mọi Cung Đường</h1>
          <p>
            Bạn cần tư vấn lịch trình chi tiết, báo giá tour đoàn công ty hay hỗ trợ đặt vé nhanh?
            Đội ngũ chuyên viên và Hướng dẫn viên bản địa của Tourism luôn sẵn sàng lắng nghe.
          </p>
        </div>
      </section>

      {/* MAIN CONTENT: INFO + CONSULTATION FORM */}
      <div className="contact-container">
        <div className="contact-grid">
          {/* Cột thông tin liên hệ */}
          <div className="contact-info-col">
            <span className="contact-sec-tag">THÔNG TIN LIÊN HỆ</span>
            <h2 className="contact-sec-title">Kết Nối Trực Tiếp Với Tourism</h2>
            <p className="contact-sec-desc">
              Mọi thắc mắc về lịch trình, thanh toán VietQR hoặc đặt tour thiết kế riêng đều được phản hồi nhanh chóng trong vòng 15 phút.
            </p>

            <div className="contact-cards-list">
              <div className="contact-info-card">
                <div className="contact-card-icon">☎️</div>
                <div>
                  <h4>Tổng Đài Tư Vấn 24/7</h4>
                  <p className="contact-highlight">1900 6868 • 0123 456 789</p>
                  <span>Hỗ trợ khẩn cấp & đặt chỗ nhanh toàn quốc</span>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-card-icon">✉️</div>
                <div>
                  <h4>Hộp Thư Điện Tử</h4>
                  <p className="contact-highlight">thaihuulongvu15092004@gmail.com</p>
                  <span>Tiếp nhận yêu cầu báo giá đoàn & hợp tác doanh nghiệp</span>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-card-icon">🏢</div>
                <div>
                  <h4>Hệ Thống Văn Phòng</h4>
                  <p><strong>Đà Nẵng:</strong> Hải Châu, TP. Đà Nẵng</p>
                  <p><strong>Hà Nội:</strong> Hoàn Kiếm, TP. Hà Nội</p>
                  <p><strong>TP.HCM:</strong> Quận 1, TP. Hồ Chí Minh</p>
                </div>
              </div>

              <div className="contact-info-card">
                <div className="contact-card-icon">⏰</div>
                <div>
                  <h4>Giờ Làm Việc</h4>
                  <p><strong>Thứ 2 – Chủ Nhật:</strong> 07:30 – 22:00</p>
                  <span>Trợ lý ảo AI & Live Chat hoạt động xuyên suốt 24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Form gửi yêu cầu tư vấn */}
          <div className="contact-form-col">
            <div className="contact-form-box">
              <div className="contact-form-header">
                <h3>📝 Đăng Ký Tư Vấn & Báo Giá Tour</h3>
                <p>Điền thông tin bên dưới, Hướng dẫn viên phụ trách sẽ gọi lại tư vấn miễn phí cho bạn.</p>
              </div>

              {submitSuccess ? (
                <div className="contact-success-state">
                  <div className="success-check">🎉</div>
                  <h4>Đã Gửi Yêu Cầu Tư Vấn Thành Công!</h4>
                  <p>
                    Cảm ơn <strong>{formData.customer_name}</strong>! Hệ thống đã ghi nhận yêu cầu và gửi email xác nhận.
                    Chuyên viên tư vấn sẽ liên hệ với bạn qua số <strong>{formData.phone}</strong> trong ít phút tới.
                  </p>
                  <div className="success-actions">
                    <button
                      type="button"
                      className="btn-contact-submit"
                      onClick={() => setSubmitSuccess(false)}
                    >
                      Gửi thêm yêu cầu khác
                    </button>
                    <Link to="/tours" className="btn-contact-secondary">
                      Xem các Tour đang ưu đãi →
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                  {errorMsg && <div className="contact-error-alert">{errorMsg}</div>}

                  <div className="form-group">
                    <label>Họ và tên của bạn *</label>
                    <input
                      type="text"
                      name="customer_name"
                      placeholder="Nhập họ và tên (VD: Nguyễn Văn A)"
                      value={formData.customer_name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Số điện thoại liên hệ *</label>
                      <input
                        type="tel"
                        name="phone"
                        placeholder="VD: 0905 123 456"
                        value={formData.phone}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Địa chỉ Email *</label>
                      <input
                        type="email"
                        name="email"
                        placeholder="VD: ban@gmail.com"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div className="form-group">
                      <label>Tuyến tour đang quan tâm</label>
                      <select name="tour_id" value={formData.tour_id} onChange={handleChange}>
                        <option value="">-- Tư vấn chung / Thiết kế riêng --</option>
                        {featuredTours.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name && t.name.length > 50 ? `${t.name.slice(0, 50)}...` : t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Số lượng khách dự kiến</label>
                      <select name="group_size" value={formData.group_size} onChange={handleChange}>
                        <option value="">-- Chọn quy mô đoàn --</option>
                        <option value="1 - 3 khách (Cá nhân / Cặp đôi)">1 - 3 khách (Cá nhân / Cặp đôi)</option>
                        <option value="4 - 10 khách (Gia đình / Nhóm bạn)">4 - 10 khách (Gia đình / Nhóm bạn)</option>
                        <option value="10 - 30 khách (Đoàn riêng)">10 - 30 khách (Đoàn riêng)</option>
                        <option value="Trên 30 khách (Công ty / Team Building)">Trên 30 khách (Công ty / Team Building)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Ghi chú / Yêu cầu chi tiết</label>
                    <textarea
                      name="note"
                      rows="4"
                      placeholder="Chia sẻ điểm đến mong muốn, ngày dự kiến khởi hành hoặc yêu cầu đặc biệt của đoàn..."
                      value={formData.note}
                      onChange={handleChange}
                    />
                  </div>

                  <button type="submit" className="btn-contact-submit" disabled={submitting}>
                    {submitting ? 'Đang gửi yêu cầu...' : '🚀 Gửi Yêu Cầu Tư Vấn Miễn Phí'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FAQ SECTION */}
        <section className="contact-faq-section">
          <div className="faq-header">
            <span className="contact-sec-tag">GIẢI ĐÁP NHANH</span>
            <h2>Câu Hỏi Thường Gặp (FAQ)</h2>
            <p>Những thông tin hữu ích giúp bạn đặt tour và thanh toán thuận tiện nhất</p>
          </div>

          <div className="faq-list">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  >
                    <span>{item.q}</span>
                    <span className="faq-toggle-icon">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && <div className="faq-answer">{item.a}</div>}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

