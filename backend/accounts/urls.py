from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, ProfileView, GoogleLoginView, ChangePasswordView,
    AdminUserViewSet
)

router = DefaultRouter()
router.register(r'admin/users', AdminUserViewSet, basename='admin-users')

urlpatterns = [
    # Quản trị người dùng (Admin/Staff)
    path('', include(router.urls)),

    # Đăng ký tài khoản mới
    path('register/', RegisterView.as_view(), name='auth-register'),

    # Đăng nhập bằng username/password → trả về access + refresh token
    path('login/', TokenObtainPairView.as_view(), name='auth-login'),

    # Làm mới access token bằng refresh token
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),

    # Xem / cập nhật thông tin cá nhân (cần đăng nhập)
    path('profile/', ProfileView.as_view(), name='auth-profile'),

    # Đổi mật khẩu (cần đăng nhập)
    path('change-password/', ChangePasswordView.as_view(), name='auth-change-password'),

    # Đăng nhập bằng Google OAuth
    path('google/', GoogleLoginView.as_view(), name='auth-google'),
]
