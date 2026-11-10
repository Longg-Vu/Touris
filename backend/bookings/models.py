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
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='bookings',
        verbose_name='Khách hàng',
    )
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name='bookings',
        verbose_name='Tour',
    )
    assigned_guide = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_bookings',
        verbose_name='HDV phụ trách đơn',
    )

    # ── Mã tra cứu đơn hàng (dành cho cả khách vãng lai và thành viên) ───
    booking_code = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name='Mã tra cứu đơn',
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
        uname = self.user.username if self.user else (self.contact_name or self.contact_phone or 'Khách vãng lai')
        code_str = f" [{self.booking_code}]" if self.booking_code else ""
        return f'Booking #{self.pk}{code_str} – {uname} – {self.tour.name}'

    def save(self, *args, **kwargs):
        """Tự tính tổng tiền và tạo mã tra cứu nếu chưa có."""
        if not self.total_price:
            self.total_price = (
                self.price_adult * self.num_adults
                + self.price_child * self.num_children
            )
        if not self.booking_code:
            import random
            import string
            from django.utils import timezone
            prefix = timezone.now().strftime('%y%m%d')
            rand_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            self.booking_code = f"BK{prefix}-{rand_suffix}"
        super().save(*args, **kwargs)


class ConsultationRequest(models.Model):
    """
    Yêu cầu tư vấn từ khách hàng quan tâm đến tour.
    Khách có thể gửi từ trang chi tiết tour khi cần tư vấn thông tin đặc thù
    hoặc chưa muốn đặt cọc ngay.
    """
    STATUS_PENDING   = 'pending'
    STATUS_CONTACTED = 'contacted'
    STATUS_RESOLVED  = 'resolved'
    STATUS_CANCELLED = 'cancelled'

    STATUS_CHOICES = [
        (STATUS_PENDING,   'Chờ liên hệ'),
        (STATUS_CONTACTED, 'Đã liên hệ'),
        (STATUS_RESOLVED,  'Đã chốt / Thành công'),
        (STATUS_CANCELLED, 'Đã huỷ'),
    ]

    customer_name = models.CharField(max_length=150, verbose_name='Họ tên khách hàng')
    phone         = models.CharField(max_length=20, verbose_name='Số điện thoại')
    email         = models.EmailField(verbose_name='Email liên hệ')  # Bắt buộc theo yêu cầu
    note          = models.TextField(blank=True, default='', verbose_name='Nội dung cần tư vấn')
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING, verbose_name='Trạng thái')
    admin_note    = models.TextField(blank=True, default='', verbose_name='Ghi chú của tư vấn viên / HDV')

    tour = models.ForeignKey(
        Tour,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='consultations',
        verbose_name='Tour quan tâm',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='consultations',
        verbose_name='Tài khoản khách (nếu có)',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_consultations',
        verbose_name='Nhân viên / HDV phụ trách',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Thời gian tạo')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Thời gian cập nhật')

    class Meta:
        db_table = 'consultation_requests'
        ordering = ['-created_at']
        verbose_name = 'Yêu cầu tư vấn'
        verbose_name_plural = 'Yêu cầu tư vấn'

    def __str__(self):
        tour_str = f" - {self.tour.name}" if self.tour else ""
        return f"[{self.get_status_display()}] {self.customer_name} ({self.phone}){tour_str}"

