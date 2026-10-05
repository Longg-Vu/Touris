"""
BOOKINGS APP - Models
=====================
Bảng quản lý đặt tour của khách hàng.

Luồng nghiệp vụ:
  Khách chọn tour + ngày + số lượng người
    → Tạo Booking (trạng thái PENDING)
    → Thanh toán (trạng thái CONFIRMED)
    → Huỷ nếu cần (trạng thái CANCELLED)
"""

from django.db import models
from django.conf import settings
from tours.models import Tour


class Booking(models.Model):
    """
    Đơn đặt tour của khách hàng.
    Mỗi booking gắn với 1 user và 1 tour cụ thể.
    """

    # ── Trạng thái đơn ─────────────────────────────────────
    STATUS_PENDING   = 'pending'
    STATUS_CONFIRMED = 'confirmed'
    STATUS_CANCELLED = 'cancelled'
    STATUS_COMPLETED = 'completed'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Chờ xác nhận'),
        (STATUS_CONFIRMED, 'Đã xác nhận'),
        (STATUS_CANCELLED, 'Đã huỷ'),
        (STATUS_COMPLETED, 'Hoàn thành'),
    ]

    # ── Khoá ngoại ─────────────────────────────────────────
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookings',
        verbose_name='Khách hàng',
    )
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name='bookings',
        verbose_name='Tour',
    )

    # ── Thông tin đặt tour ──────────────────────────────────
    travel_date    = models.DateField(verbose_name='Ngày khởi hành')
    num_adults     = models.PositiveSmallIntegerField(default=1, verbose_name='Số người lớn')
    num_children   = models.PositiveSmallIntegerField(default=0, verbose_name='Số trẻ em')

    # ── Giá tiền (lưu snapshot tại thời điểm đặt) ──────────
    price_adult    = models.DecimalField(max_digits=12, decimal_places=0, verbose_name='Giá người lớn')
    price_child    = models.DecimalField(max_digits=12, decimal_places=0, default=0, verbose_name='Giá trẻ em')
    total_price    = models.DecimalField(max_digits=14, decimal_places=0, verbose_name='Tổng tiền')

    # ── Thông tin liên hệ (do khách nhập khi đặt) ──────────
    contact_name   = models.CharField(max_length=200, verbose_name='Tên liên hệ')
    contact_phone  = models.CharField(max_length=20, verbose_name='SĐT liên hệ')
    contact_email  = models.EmailField(verbose_name='Email liên hệ')
    special_request = models.TextField(blank=True, default='', verbose_name='Yêu cầu đặc biệt')

    # ── Trạng thái ──────────────────────────────────────────
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_PENDING,
        verbose_name='Trạng thái',
    )

    # ── Timestamps ──────────────────────────────────────────
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Ngày tạo')
    updated_at = models.DateTimeField(auto_now=True,     verbose_name='Cập nhật lần cuối')

    class Meta:
        db_table  = 'bookings'
        ordering  = ['-created_at']
        verbose_name        = 'Đơn đặt tour'
        verbose_name_plural = 'Đơn đặt tour'

    def __str__(self):
        return f'Booking #{self.pk} – {self.user.username} – {self.tour.name}'

    def save(self, *args, **kwargs):
        """Tự tính tổng tiền trước khi lưu nếu chưa được set."""
        if not self.total_price:
            self.total_price = (
                self.price_adult * self.num_adults
                + self.price_child * self.num_children
            )
        super().save(*args, **kwargs)
