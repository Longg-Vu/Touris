# Nhật ký thay đổi (Changelog) - Ngày 17/09/2026

## Tích Hợp Backend (Django REST Framework) + PostgreSQL + Kết Nối Frontend

### 1. Khởi tạo Cơ sở Dữ liệu PostgreSQL qua Docker
- **File**: `docker-compose.yml`, `backend/.env`, `backend/.env.example`
- Thiết lập dịch vụ PostgreSQL 16 Alpine container: `tourism_postgres`.
- Cấu hình port **5434** (ánh xạ sang port nội bộ 5432) để tránh xung đột với các container PostgreSQL hiện có trên máy.
- Cấu hình file `backend/.env` với database `tourism_db`, user `postgres`, port `5434`.

### 2. Thiết Kế & Xây Dựng Backend (App `tours` & `accounts`)
- **Models (`backend/tours/models.py`, `backend/accounts/models.py`)**:
  - `User`: Mở rộng từ `AbstractUser` với `phone`, `avatar`.
  - `Destination`: Lưu các điểm đến du lịch (tên, slug, ảnh đại diện, số hoạt động, thứ tự hiển thị).
  - `Category`: Lưu danh mục tour (Cáp treo, Tour, Vé tham quan, Nghỉ dưỡng...).
  - `Tour`: Quản lý tour chi tiết (tên, giá người lớn, ảnh thumbnail, rating, review_count, booked_count, tags, khuyến mãi, cờ `is_featured`, `is_hot`).
- **Serializers (`backend/tours/serializers.py`)**:
  - `TourListSerializer`: Serialize danh sách tour kèm tên danh mục và điểm đến (`category_name`, `destination_name`).
  - `DestinationSerializer`: Serialize điểm đến cho trang chủ.
  - `CategorySerializer`: Serialize danh mục.
- **Views & URLs (`backend/tours/views.py`, `backend/tours/urls.py`)**:
  - Dùng `ReadOnlyModelViewSet` với quyền truy cập công khai `AllowAny`.
  - Hỗ trợ bộ lọc (`is_featured`, `is_hot`, `destination`, `category`) và tìm kiếm.
  - Các endpoint API hoạt động:
    - `GET /api/tours/destinations/`
    - `GET /api/tours/tours/?is_featured=true`
    - `GET /api/tours/categories/`
- **Django Admin (`backend/tours/admin.py`, `backend/accounts/admin.py`)**:
  - Đăng ký quản lý dữ liệu Tour, Điểm đến, Danh mục, Người dùng tại `/admin/`.

### 3. Tự Động Nạp Dữ Liệu Ban Đầu (Seed Data)
- **File**: `backend/tours/management/commands/seed_data.py`
- Lệnh chạy: `python manage.py seed_data`
- Tự động tạo:
  - Tài khoản quản trị Superuser: `admin` / `admin123`.
  - 5 Danh mục chuẩn (Cáp treo, Tour, Vé tham quan, Nghỉ dưỡng, Công viên...).
  - 12 Điểm đến nổi bật (Đà Nẵng, Đà Lạt, TP.HCM, Hà Nội, Phú Quốc, Nha Trang, Hội An, Vịnh Hạ Long, Tây Ninh, Komodo, Bali, Mỹ Tho).
  - 8 Tour mẫu có cờ `is_featured=True`.

### 4. Kết Nối Frontend (React + Axios)
- **File**: `frontend/src/pages/public/HomePage.jsx`
- Sử dụng `tourAPI` và `destinationAPI` từ `frontend/src/api/services.js`.
- **Đã xóa hoàn toàn** các mảng dữ liệu tĩnh hardcode (`SAMPLE_TOURS`, `VIETNAM_DESTINATIONS`) khỏi file `HomePage.jsx`.
- Khởi tạo state rỗng ban đầu (`useState([])`) và tự động nạp 100% dữ liệu từ Backend PostgreSQL thông qua API:
  - `TopDestinations`: Gọi `destinationAPI.getAll()` (`GET /api/tours/destinations/`).
  - `FeaturedTours`: Gọi `tourAPI.getAll({ is_featured: true })` (`GET /api/tours/tours/?is_featured=true`).
