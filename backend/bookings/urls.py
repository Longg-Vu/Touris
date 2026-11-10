"""
BOOKINGS APP - URL Configuration
=================================
Đăng ký các endpoint API cho bookings.

Customer:
  /api/bookings/bookings/                → CRUD booking của user
  /api/bookings/bookings/{id}/cancel/    → huỷ booking
  /api/bookings/bookings/{id}/pay/       → thanh toán

Admin/Staff:
  /api/bookings/admin/bookings/                    → xem tất cả đơn
  /api/bookings/admin/bookings/{id}/confirm/       → xác nhận
  /api/bookings/admin/bookings/{id}/complete/      → hoàn thành
  /api/bookings/admin/bookings/{id}/cancel/        → huỷ

Stats:
  /api/bookings/stats/                             → thống kê dashboard
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookingViewSet,
    AdminBookingViewSet,
    dashboard_stats,
    ConsultationViewSet,
    AdminConsultationViewSet,
)

# ── Customer router ────────────────────────────────────────
router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'consultations', ConsultationViewSet, basename='consultation')

# ── Admin router ───────────────────────────────────────────
admin_router = DefaultRouter()
admin_router.register(r'bookings', AdminBookingViewSet, basename='admin-booking')
admin_router.register(r'consultations', AdminConsultationViewSet, basename='admin-consultation')

urlpatterns = [
    path('', include(router.urls)),
    path('admin/', include(admin_router.urls)),
    path('stats/', dashboard_stats, name='dashboard-stats'),
]
