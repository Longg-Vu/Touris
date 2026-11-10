import uuid
from django.db import models
from django.conf import settings
from tours.models import Tour


class ChatSession(models.Model):
    """
    Quản lý phiên chat giữa khách hàng (vãng lai hoặc đã đăng nhập) với Hệ thống (Bot + Staff).
    """
    STATUS_ACTIVE        = 'active'
    STATUS_WAITING_STAFF = 'waiting_staff'
    STATUS_RESOLVED      = 'resolved'

    STATUS_CHOICES = [
        (STATUS_ACTIVE,        'Đang trò chuyện'),
        (STATUS_WAITING_STAFF, 'Chờ nhân viên trả lời'),
        (STATUS_RESOLVED,      'Đã hoàn thành / Đóng'),
    ]

    session_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        verbose_name='Mã phiên chat (Client ID)',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='chat_sessions',
        verbose_name='Tài khoản đăng nhập (nếu có)',
    )
    customer_name = models.CharField(
        max_length=150,
        default='Khách hàng',
        verbose_name='Họ tên khách',
    )
    customer_phone = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='Số điện thoại',
    )
    customer_email = models.EmailField(
        blank=True,
        default='',
        verbose_name='Email liên hệ',
    )
    current_tour = models.ForeignKey(
        Tour,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='chat_sessions',
        verbose_name='Tour khách đang xem',
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='assigned_chats',
        verbose_name='Nhân viên / HDV phụ trách',
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_ACTIVE,
        verbose_name='Trạng thái phiên',
    )
    unread_staff_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Tin nhắn khách chưa đọc (phía Staff)',
    )
    unread_customer_count = models.PositiveIntegerField(
        default=0,
        verbose_name='Tin nhắn staff/bot chưa đọc (phía Khách)',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Thời gian tạo')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Cập nhật lần cuối')

    class Meta:
        db_table = 'chat_sessions'
        ordering = ['-updated_at']
        verbose_name = 'Phiên trò chuyện'
        verbose_name_plural = 'Phiên trò chuyện'

    def __str__(self):
        return f"Chat #{self.id} [{self.get_status_display()}] - {self.customer_name}"


class ChatMessage(models.Model):
    """
    Từng tin nhắn trong cuộc trò chuyện (từ Khách, từ Bot, hoặc từ Nhân viên).
    """
    SENDER_CUSTOMER = 'customer'
    SENDER_BOT      = 'bot'
    SENDER_STAFF    = 'staff'

    SENDER_CHOICES = [
        (SENDER_CUSTOMER, 'Khách hàng'),
        (SENDER_BOT,      'Trợ lý ảo Bot'),
        (SENDER_STAFF,    'Nhân viên / HDV'),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name='Phiên chat',
    )
    sender_type = models.CharField(
        max_length=10,
        choices=SENDER_CHOICES,
        default=SENDER_CUSTOMER,
        verbose_name='Người gửi',
    )
    sender_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        verbose_name='Tài khoản nhân viên (nếu sender_type=staff)',
    )
    message = models.TextField(verbose_name='Nội dung tin nhắn')
    message_type = models.CharField(
        max_length=30,
        default='text',
        verbose_name='Loại tin nhắn (text, tours_carousel, contact_prompt)',
    )
    metadata = models.JSONField(
        blank=True,
        null=True,
        default=dict,
        verbose_name='Dữ liệu đính kèm (danh sách tour gợi ý, v.v.)',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Thời gian gửi')

    class Meta:
        db_table = 'chat_messages'
        ordering = ['created_at']
        verbose_name = 'Tin nhắn chat'
        verbose_name_plural = 'Tin nhắn chat'

    def __str__(self):
        return f"[{self.get_sender_type_display()}] {self.message[:40]}"
