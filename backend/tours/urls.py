"""
BƯỚC 4: URLS - Đăng ký đường dẫn API

Router tự động tạo các URL chuẩn RESTful từ ViewSet:
  tours/   → list (GET danh sách)
  tours/{id}/ → detail (GET chi tiết)

File này được include vào tourism_backend/urls.py với prefix 'api/tours/'
Kết quả cuối cùng:
  /api/tours/tours/              → Danh sách tour (public)
  /api/tours/tours/?is_featured=true → Tour nổi bật trang chủ
  /api/tours/destinations/       → Danh sách điểm đến
  /api/tours/admin/tours/        → CRUD tour (Admin/Staff)
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TourViewSet, DestinationViewSet, CategoryViewSet, AdminTourViewSet, FavoriteViewSet

# ── Public & Customer router ──────────────────────────────
router = DefaultRouter()
router.register(r'tours',        TourViewSet,        basename='tour')
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'categories',   CategoryViewSet,    basename='category')
router.register(r'favorites',    FavoriteViewSet,    basename='favorite')

# ── Admin router (Admin/Staff quản lý) ────────────────────
admin_router = DefaultRouter()
admin_router.register(r'tours', AdminTourViewSet, basename='admin-tour')

urlpatterns = [
    path('',       include(router.urls)),
    path('admin/', include(admin_router.urls)),
]
