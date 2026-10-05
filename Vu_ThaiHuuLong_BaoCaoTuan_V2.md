# BÁO CÁO TIẾN ĐỘ TUẦN 1 & KẾ HOẠCH TUẦN TIẾP THEO

- **Họ và tên SV:** Thái Hữu Long Vũ
- **Tên đề tài:** Xây dựng hệ thống website quản lý và đặt tour du lịch (ReactJS + Django REST Framework + PostgreSQL)

---

### I/ KẾT QUẢ TUẦN 1

- **Đã hoàn thành theo kế hoạch:**
  - **Backend Auth API (`accounts`):** Hoàn thành bộ API đăng ký, đăng nhập cấp JWT Token (Access & Refresh), làm mới token, xem & cập nhật hồ sơ cá nhân (`profile`), đổi mật khẩu.
  - **Frontend Auth UI:** Xây dựng popup `AuthModal.jsx` (Đăng nhập / Đăng ký), quản lý phiên làm việc toàn cục qua `AuthContext.jsx`, tự động lưu JWT vào LocalStorage và gắn Axios Header.
  - **Trang Chi tiết Tour (`TourDetailPage`):** Hoàn thiện giao diện xem chi tiết tour (Gallery ảnh, Lịch trình theo ngày, Điểm nổi bật, Chính sách tour) và Widget đặt tour (chọn ngày đi, số vé người lớn/trẻ em, tự tính tổng tiền).
  - **Thiết kế CSDL Đặt tour (`bookings`):** Thiết kế Model `Booking`, `Payment`, chạy migration thành công vào CSDL PostgreSQL.
  - **Kiểm thử liên thông:** Hoàn thành kiểm thử luồng nghiệp vụ cốt lõi từ Đăng ký/Đăng nhập → Duyệt tour → Xem chi tiết tour → Đặt tour.

- **Chưa hoàn thành:**
  - **Đăng nhập Google OAuth:** Đã tích hợp code thư viện nhưng còn gặp lỗi uỷ quyền (do chưa cấu hình Google Client ID thật trên Google Cloud Console).
  - **Trang riêng `/login` và `/register`:** Chưa thiết kế form riêng lẻ (hệ thống hiện tại đang sử dụng popup `AuthModal` tích hợp trên Header).

- **Các mục hoàn thành thêm ngoài kế hoạch:**
  - **Backend API Đặt tour (`bookings`):** Viết xong toàn bộ API tạo đơn, xem chi tiết đơn, xem danh sách đơn của khách hàng, huỷ đơn.
  - **Trang Đơn đặt của tôi (`MyBookingsPage`):** Xây dựng giao diện xem lịch sử đơn đặt tour, lọc theo trạng thái đơn và thao tác huỷ tour trực tiếp.
  - **Trang Hồ sơ cá nhân (`ProfilePage`):** Xây dựng giao diện xem/sửa thông tin cá nhân và form đổi mật khẩu trực tiếp.

> **Tự đánh giá kết quả hoàn thiện:** Đạt **100% tiến độ đề ra theo kế hoạch** và **hoàn thành vượt tiến độ** thêm 3 chức năng lớn của tuần sau (API Đặt tour, Trang My Bookings, Trang Profile cá nhân).

---

### II/ KẾ HOẠCH CHO TUẦN TIẾP THEO

- **1. Khắc phục lỗi uỷ quyền Google OAuth:** Tạo Client ID thật trên Google Cloud Console, whitelist domain `http://localhost:5173` (hoặc tạm ẩn nút Google nếu chưa cấu hình xong).
- **2. Xây dựng Module Đánh giá tour (`reviews`):** Thiết kế CSDL Model `Review`, viết API CRUD đánh giá; kết nối hiển thị đánh giá thật trên `TourDetailPage` và form gửi đánh giá từ đơn đã hoàn thành trong `MyBookingsPage`.
- **3. Phát triển Trang Quản trị Dashboard (`admin/DashboardPage`):** Viết API thống kê (doanh thu theo tháng, tổng số tour, tổng đơn đặt, tỷ lệ huỷ) và dựng biểu đồ trực quan bằng thư viện `Recharts`.
- **4. Xây dựng chức năng Quản lý Đơn đặt tour phía Admin/Staff:** Giao diện duyệt đơn, xác nhận thanh toán chuyển khoản, cập nhật trạng thái đơn (*Chờ xử lý → Đã xác nhận → Hoàn thành*).
- **5. Tối ưu hoá UI/UX & Responsive:** Cấu hình redirect URL `/login`, `/register` tự mở `AuthModal`, kiểm tra và tinh chỉnh độ mượt trên thiết bị di động (Mobile).
