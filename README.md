# 🌍 Hệ Thống Website Quản Lý và Đặt Tour Du Lịch

> Đồ án tốt nghiệp - Xây dựng hệ thống website quản lý và đặt tour du lịch cho công ty du lịch

## Công nghệ sử dụng

| Thành phần | Công nghệ                                         |
| ---------- | ------------------------------------------------- |
| Frontend   | ReactJS, React Router DOM, Axios, Vite            |
| Backend    | Python, Django, Django REST Framework, Simple JWT |
| Database   | PostgreSQL                                        |
| Biểu đồ    | Recharts                                          |

## Cấu trúc dự án

```
Tourism/
├── backend/           # Django REST Framework Backend
│   ├── accounts/      # Quản lý tài khoản & xác thực JWT
│   ├── tours/         # Quản lý tour du lịch
│   ├── bookings/      # Đặt tour & thanh toán
│   ├── reviews/       # Đánh giá tour
│   └── tourism_backend/  # Django project settings
├── frontend/          # ReactJS Frontend (Vite)
│   └── src/
│       ├── api/       # Axios config & API services
│       ├── components/# UI components
│       ├── pages/     # Page components
│       ├── context/   # React Context (Auth)
│       ├── hooks/     # Custom hooks
│       └── utils/     # Helper functions
└── docs/              # Tài liệu dự án
    ├── changelogs/    # Lịch sử thay đổi code
    ├── api/           # Tài liệu API
    └── database/      # Tài liệu database
```

## Cài đặt & Chạy

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # Sửa thông tin database
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend chạy tại: `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Frontend chạy tại: `http://localhost:5173`

## Vai trò người dùng

| Vai trò           | Quyền hạn                                |
| ----------------- | ---------------------------------------- |
| **Khách hàng**    | Xem tour, đặt tour, thanh toán, đánh giá |
| **Nhân viên**     | Quản lý tour, xử lý đơn đặt              |
| **Quản trị viên** | Toàn quyền + Dashboard thống kê          |

## API Endpoints

| Module   | Prefix           | Mô tả                         |
| -------- | ---------------- | ----------------------------- |
| Auth     | `/api/auth/`     | Đăng ký, đăng nhập, JWT       |
| Tours    | `/api/tours/`    | CRUD tour, danh mục, địa điểm |
| Bookings | `/api/bookings/` | Đặt tour, thanh toán          |
| Reviews  | `/api/reviews/`  | Đánh giá tour                 |
