from django.contrib.auth.models import AbstractUser
from django.db import models

from .rbac import ALL_PERMISSIONS


class User(AbstractUser):
    """
    Custom User Model - mở rộng từ Django's AbstractUser.
    Thêm các trường tùy chỉnh cho ứng dụng du lịch.

    Phân quyền (RBAC):
      - is_superuser          → Quản trị viên (toàn quyền)
      - is_staff + Group      → Nhân viên, quyền theo nhóm quyền được gán
      - còn lại               → Khách hàng
    Các quyền chi tiết khai báo trong accounts/rbac.py (Meta.permissions bên dưới).
    """
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Số điện thoại')
    avatar = models.TextField(blank=True, null=True, verbose_name='Avatar URL hoặc base64')

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Người dùng'
        # Các quyền chi tiết của hệ thống (tạo thành bảng auth_permission khi migrate)
        permissions = ALL_PERMISSIONS

    def __str__(self):
        return self.email or self.username
