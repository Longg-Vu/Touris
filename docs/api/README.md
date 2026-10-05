# Tài Liệu API - Hệ Thống Du Lịch (Tourism)

- **Base URL Backend**: `http://localhost:8000/api`
- **Tài khoản quản trị Django Admin**: `http://localhost:8000/admin/` (User: `admin` / Password: `admin123`)

---

## 1. Điểm Đến (Destinations)

### Lấy danh sách điểm đến
- **Endpoint**: `GET /api/tours/destinations/`
- **Quyền**: Không yêu cầu đăng nhập (`AllowAny`)
- **Phản hồi mẫu**:
```json
{
  "count": 12,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Đà Nẵng",
      "slug": "da-nang",
      "image_url": "https://res.klook.com/image/upload/...",
      "tour_count": 201
    }
  ]
}
```

---

## 2. Quản Lý Tour (Tours)

### Lấy danh sách tour (kèm bộ lọc)
- **Endpoint**: `GET /api/tours/tours/`
- **Quyền**: Không yêu cầu đăng nhập (`AllowAny`)
- **Tham số truy vấn (Query Params)**:
  - `is_featured=true`: Lấy các tour nổi bật (dùng cho slider trang chủ).
  - `is_hot=true`: Lấy tour có nhãn Hot.
  - `destination=<id>`: Lọc tour theo điểm đến.
  - `category=<id>`: Lọc tour theo danh mục.
  - `search=<từ khóa>`: Tìm kiếm theo tên tour hoặc tên điểm đến.
  - `ordering=price_adult`: Sắp xếp theo giá tăng dần (hoặc `-price_adult` giảm dần).
  - `ordering=-rating`: Sắp xếp theo đánh giá cao nhất.

- **Phản hồi mẫu**:
```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Cáp Treo Sun World Ba Den Mountain Ở Tây Ninh",
      "category_name": "Cáp treo",
      "destination_name": "Tây Ninh",
      "price_adult": "149733",
      "thumbnail": "https://images.unsplash.com/...",
      "rating": "4.8",
      "review_count": 2868,
      "booked_count": "400K+",
      "tags": ["Xác nhận tức thời"],
      "promo": "Giảm đến 300,000 VND",
      "is_hot": false,
      "is_featured": true
    }
  ]
}
```

---

## 3. Danh Mục Tour (Categories)

### Lấy danh sách danh mục
- **Endpoint**: `GET /api/tours/categories/`
- **Quyền**: Không yêu cầu đăng nhập (`AllowAny`)
