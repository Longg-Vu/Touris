from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User Model - mở rộng từ Django's AbstractUser.
    Thêm các trường tùy chỉnh cho ứng dụng du lịch.

    Phân quyền:
      - is_superuser: Quản trị viên (toàn quyền)
      - is_staff: Nhân viên / Hướng dẫn viên (phụ trách tour)
      - còn lại: Khách hàng
    """
    phone = models.CharField(max_length=20, blank=True, null=True, verbose_name='Số điện thoại')
    avatar = models.TextField(blank=True, null=True, verbose_name='Avatar URL hoặc base64')

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Người dùng'

    def __str__(self):
        return self.email or self.username
