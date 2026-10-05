"""
BƯỚC 1: MODELS - Định nghĩa cấu trúc bảng trong Database

Mỗi class = 1 bảng trong PostgreSQL.
Django sẽ tự tạo bảng khi chạy lệnh migrate.

Luồng dữ liệu:
  PostgreSQL DB
    ↓
  models.py (định nghĩa cấu trúc bảng - ĐÂY)
    ↓
  serializers.py (chuyển object Python → JSON)
    ↓
  views.py (xử lý request, trả về response)
    ↓
  urls.py (định nghĩa đường dẫn API)
    ↓
  Frontend React gọi axios
"""

from django.db import models


class Destination(models.Model):
    """
    Bảng điểm đến du lịch (Đà Nẵng, Hà Nội, Phú Quốc...)
    Tương ứng với phần 'Bạn muốn đi chơi ở đâu?' trên trang chủ.
    """
    name = models.CharField(max_length=200, verbose_name='Tên điểm đến')
    slug = models.SlugField(max_length=200, unique=True, verbose_name='Slug URL')
    image_url = models.URLField(max_length=500, verbose_name='URL ảnh đại diện')
    # tour_count sẽ được tính tự động, nhưng lưu cache để hiển thị nhanh
    tour_count = models.PositiveIntegerField(default=0, verbose_name='Số hoạt động')
    is_active = models.BooleanField(default=True, verbose_name='Hiển thị')
    order = models.PositiveSmallIntegerField(default=0, verbose_name='Thứ tự hiển thị')

    class Meta:
        db_table = 'destinations'
        ordering = ['order', 'name']
        verbose_name = 'Điểm đến'
        verbose_name_plural = 'Điểm đến'

    def __str__(self):
        return self.name


class Category(models.Model):
    """
    Bảng danh mục tour (Cáp treo, Tour, Công viên...)
    """
    name = models.CharField(max_length=100, verbose_name='Tên danh mục')
    slug = models.SlugField(max_length=100, unique=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Danh mục'
        verbose_name_plural = 'Danh mục'

    def __str__(self):
        return self.name


class Tour(models.Model):
    """
    Bảng tour - dữ liệu chính của ứng dụng.
    
    Liên kết:
      - category: ForeignKey → Category (nhiều tour thuộc 1 danh mục)
      - destination: ForeignKey → Destination (nhiều tour thuộc 1 điểm đến)
    """
    name = models.CharField(max_length=500, verbose_name='Tên tour')
    
    # ForeignKey: kết nối với bảng Category và Destination
    # SET_NULL: nếu category/destination bị xóa, tour vẫn giữ lại (set NULL)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tours',
        verbose_name='Danh mục'
    )
    destination = models.ForeignKey(
        Destination,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='tours',
        verbose_name='Điểm đến'
    )
    
    # Giá và hình ảnh
    price_adult = models.DecimalField(
        max_digits=12, decimal_places=0,
        verbose_name='Giá người lớn (VNĐ)'
    )
    thumbnail = models.URLField(max_length=500, verbose_name='URL ảnh thumbnail')
    
    # Thống kê
    rating = models.DecimalField(
        max_digits=3, decimal_places=1,
        default=0, verbose_name='Rating'
    )
    review_count = models.PositiveIntegerField(default=0, verbose_name='Số đánh giá')
    booked_count = models.CharField(
        max_length=20, default='0',
        verbose_name='Số lượt đặt (hiển thị)'
    )
    
    # Tags dạng JSON array, ví dụ: ["Xác nhận tức thời", "Miễn phí huỷ"]
    tags = models.JSONField(default=list, blank=True, verbose_name='Tags')
    
    # Khuyến mãi
    promo = models.CharField(
        max_length=200, blank=True, null=True,
        verbose_name='Nhãn khuyến mãi'
    )
    
    # Cờ hiển thị
    is_hot = models.BooleanField(default=False, verbose_name='Tour Hot')
    is_featured = models.BooleanField(default=False, verbose_name='Tour nổi bật (trang chủ)')
    is_active = models.BooleanField(default=True, verbose_name='Hiển thị')
    
    # Thời gian tạo/cập nhật
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tours'
        ordering = ['-is_featured', '-rating']
        verbose_name = 'Tour'
        verbose_name_plural = 'Tours'

    def __str__(self):
        return self.name


# Tự động đồng bộ số lượng tour (tour_count) của Destination khi Tour được thêm, sửa hoặc xóa
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


@receiver([post_save, post_delete], sender=Tour)
def update_destination_tour_count_on_change(sender, instance, **kwargs):
    if instance.destination:
        instance.destination.tour_count = instance.destination.tours.filter(is_active=True).count()
        instance.destination.save(update_fields=['tour_count'])
