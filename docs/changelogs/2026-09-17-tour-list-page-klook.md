# Nhật ký thay đổi (Changelog) - Ngày 17/09/2026

## Xây dựng Trang Danh Sách Tour (TourListPage) Chuẩn Giao Diện Klook

### 1. Nâng cấp Backend API & Dữ Liệu
- **File**: `backend/tours/views.py`
  - Mở rộng bộ lọc `TourViewSet`: hỗ trợ lọc theo `destination__slug`, `category__slug`.
  - Hỗ trợ sắp xếp đa dạng: `price_adult` (giá tăng/giảm), `rating` (đánh giá), `review_count` (lượt đặt/đánh giá).
- **File**: `backend/tours/management/commands/seed_data.py`
  - Nạp thêm các điểm đến mới: Sa Pa, Ninh Bình, Vũng Tàu, Biên Hòa... (tổng cộng **13 điểm đến**).
  - Nạp **11 danh mục** du lịch chuẩn (Cáp treo, Công viên giải trí, Công viên nước, Vé tham quan, Du thuyền, Show diễn, Spa...).
  - Nạp **24 hoạt động & tour tiêu biểu** theo mẫu Klook thực tế (Fansipan, Bà Nà Hills, Ký Ức Hội An, Tràng An, VinWonders Phú Quốc, Xe buýt 2 tầng TP.HCM...).

### 2. Xây dựng Frontend TourListPage
- **File**: `frontend/src/pages/public/TourListPage.jsx` & `frontend/src/pages/public/TourListPage.css`
- **Thanh Breadcrumb & Tiêu đề**: Tự động hiển thị tên thành phố đang lọc kèm ô tìm kiếm nhanh từ khóa.
- **Thanh Filter Bar chuẩn Klook (`country-ttd-filter-container__filter`)**:
  - Dropdown **Thành phố**: Menu chọn thành phố động lấy từ Database.
  - Dropdown **Ngày**: Lọc nhanh (Hôm nay, Ngày mai, Cuối tuần...).
  - **Category Tags Bar**: Dải thẻ tag danh mục cuộn ngang, bấm chọn/bỏ chọn linh hoạt.
  - **Active Filter Chips**: Hiển thị các tiêu chí đang được lọc kèm nút xóa nhanh hoặc nút "Xóa tất cả".
- **Thanh Thống kê & Sắp xếp**:
  - Đếm số kết quả: `Xem X hoạt động ở Việt Nam`.
  - Dropdown sắp xếp: "Nên đặt", "Giá thấp nhất", "Giá cao nhất", "Đặt nhiều nhất", "Ưa thích nhất".
- **Lưới hiển thị Adaptive Cards (4 cột responsive)**:
  - Tỉ lệ ảnh 16:10, hiệu ứng zoom nhẹ khi hover.
  - Nút tim Yêu thích (Favorite) lưu trạng thái trực tiếp vào `localStorage`.
  - Nhãn Hot, Subtext Danh mục · Địa điểm, Tiêu đề tour 2 dòng.
  - Nhãn dịch vụ (Xác nhận tức thời, Miễn phí huỷ...), Rating sao & số lượt đặt.
  - Giá VNĐ nổi bật kèm nhãn khuyến mãi Sale/Combo.
- **Trạng thái Skeleton & Empty State**:
  - Hiển thị hiệu ứng Skeleton Shimmer khi đang tải dữ liệu.
  - Hiển thị Empty State thân thiện kèm nút reset bộ lọc khi không có kết quả phù hợp.
