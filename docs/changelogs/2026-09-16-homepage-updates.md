# Nhật ký thay đổi (Changelog) - Ngày 16/09/2026

## 1. Cập nhật Favicon
- **File**: `frontend/index.html` & `frontend/public/favicon.svg`
- Thay thế icon mặc định bằng icon trái đất **🌍** (sử dụng SVG inline Data URI trên thẻ `<link rel="icon">` và đồng bộ file `favicon.svg`).

## 2. Nâng cấp Hero Slideshow (Trang chủ)
- **File**: `frontend/src/pages/public/HomePage.jsx` & `frontend/src/pages/public/HomePage.css`
- Chuyển đổi khối Hero tĩnh thành **Slideshow ảnh tự động**:
  - Giữ lại 2 slide chất lượng cao từ Klook: **Cầu Vàng (Bà Nà Hills)** và **Núi Bà Đen (Tây Ninh)** với độ phân giải `1920x700`.
  - Tự động chuyển slide sau mỗi 5 giây, hỗ trợ dừng/reset khi click nút hoặc dot.
  - Tinh chỉnh chiều cao Hero gọn gàng (`height: 400px`).
  - Cân đối 2 nút điều hướng trái/phải (`‹`, `›`) với hiệu ứng bán trong suốt (glassmorphism).
  - Đẩy phần nội dung tiêu đề lệch sang phải một chút (`margin-left: 6rem`) để tăng tính thẩm mỹ.

## 3. Cập nhật Dữ liệu & Slider Tour Nổi Bật
- **File**: `frontend/src/pages/public/HomePage.jsx` & `frontend/src/pages/public/HomePage.css`
- Tách component `FeaturedTours` và `TourCard` theo chuẩn kiến trúc React.
- Cập nhật thông tin và hình ảnh thực tế từ Klook cho các tour tiêu biểu:
  - **Vé Bà Nà Hills** (Đà Nẵng)
  - **Tour Tham Quan Mê Kông 1 Ngày** (Mỹ Tho - TP.HCM)
- Sửa lỗi nút điều hướng slider tour bị đè lên card (thêm padding 48px cho slider wrapper và căn giữa biểu tượng mũi tên).

## 4. Thêm mục "Bạn muốn đi chơi ở đâu?" (Top Destinations) - Ngày 17/09/2026
- **File**: `frontend/src/pages/public/HomePage.jsx` & `frontend/src/pages/public/HomePage.css`
- Xây dựng component `TopDestinations` với phong cách thẻ hình chữ nhật đứng chuẩn Klook (`city-card-rectangle`).
- Lọc và lấy các địa điểm ở Việt Nam từ mã nguồn Klook do người dùng cung cấp:
  - **Đà Nẵng** (201 hoạt động, ảnh Klook gốc)
  - **Đà Lạt** (55 hoạt động, ảnh Klook gốc)
  - **Thành phố Hồ Chí Minh** (316 hoạt động, ảnh Klook gốc)
  - **Hà Nội** (246 hoạt động, ảnh Klook gốc)
  - Bổ sung thêm các điểm đến Việt Nam nổi bật: **Phú Quốc**, **Nha Trang**, **Hội An**, **Vịnh Hạ Long**.
- Hỗ trợ thanh cuộn slider mượt mà (smooth scroll), có nút điều hướng trái/phải (`‹`, `›`) ẩn/hiện thông minh khi cuộn, hiệu ứng hover phóng to ảnh nhẹ nhàng và đổ bóng sang trọng.
- **Căn chỉnh layout đồng bộ**: Đồng bộ `max-width: 1280px`, căn đều lề tiêu đề `padding: 0 48px`, căn thẳng hàng tuyệt đối giữa 2 phần "Bạn muốn đi chơi ở đâu ?" và "Tour Nổi Bật" ở cả 2 bên mép trái và mép phải.

