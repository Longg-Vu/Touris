"""
REVIEWS APP - Models
====================
Bảng quản lý đánh giá & nhận xét của khách hàng về tour.

Ràng buộc & Nghiệp vụ:
- Mỗi user chỉ được gửi 1 đánh giá cho 1 tour cụ thể (unique_together).
- Điểm đánh giá rating từ 1 đến 5 sao.
- Tự động cập nhật rating trung bình và review_count trên bảng Tour.
"""

from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Count
from tours.models import Tour


class Review(models.Model):
    """
    Đánh giá của khách hàng về tour đã trải nghiệm.
    """
    tour = models.ForeignKey(
        Tour,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Tour du lịch'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews',
        verbose_name='Khách hàng'
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=5,
        verbose_name='Số sao (1 - 5)'
    )
    comment = models.TextField(
        verbose_name='Nội dung nhận xét'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Ngày tạo'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='Cập nhật lần cuối'
    )

    class Meta:
        db_table = 'reviews'
        ordering = ['-created_at']
        unique_together = ('tour', 'user')
        verbose_name = 'Đánh giá & Nhận xét'
        verbose_name_plural = 'Đánh giá & Nhận xét'

    def __str__(self):
        return f'{self.user.username} - {self.tour.name} ({self.rating}★)'

    def update_tour_rating_cache(self):
        """Tính lại rating trung bình và tổng số review của Tour liên quan."""
        stats = self.tour.reviews.aggregate(avg=Avg('rating'), count=Count('id'))
        avg = stats['avg'] or 0
        count = stats['count'] or 0
        self.tour.rating = round(avg, 1)
        self.tour.review_count = count
        self.tour.save(update_fields=['rating', 'review_count'])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.update_tour_rating_cache()

    def delete(self, *args, **kwargs):
        tour = self.tour
        super().delete(*args, **kwargs)
        stats = tour.reviews.aggregate(avg=Avg('rating'), count=Count('id'))
        tour.rating = round(stats['avg'] or 0, 1)
        tour.review_count = stats['count'] or 0
        tour.save(update_fields=['rating', 'review_count'])
