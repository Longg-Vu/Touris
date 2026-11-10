"""
REVIEWS APP - Serializers
=========================
Chuyển đổi dữ liệu Đánh giá ↔ JSON cho API.
"""

from rest_framework import serializers
from .models import Review
from tours.models import Tour
from bookings.models import Booking


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer cho Đánh giá (Review).
    Hỗ trợ cả xem danh sách (READ) lẫn gửi đánh giá mới (CREATE).
    """
    user_name   = serializers.SerializerMethodField(read_only=True)
    user_avatar = serializers.CharField(source='user.avatar', read_only=True, default='')
    tour_name   = serializers.CharField(source='tour.name', read_only=True)
    is_mine     = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model  = Review
        fields = [
            'id',
            'tour',
            'tour_name',
            'user',
            'user_name',
            'user_avatar',
            'rating',
            'comment',
            'is_mine',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']

    def get_user_name(self, obj):
        full_name = f"{obj.user.first_name} {obj.user.last_name}".strip()
        return full_name if full_name else obj.user.username

    def get_is_mine(self, obj):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            return False
        return request.user.pk == obj.user.pk

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError('Điểm đánh giá phải từ 1 đến 5 sao.')
        return value

    def validate_comment(self, value):
        val = value.strip()
        if len(val) < 5:
            raise serializers.ValidationError('Nội dung nhận xét tối thiểu từ 5 ký tự.')
        return val

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not request.user or not request.user.is_authenticated:
            raise serializers.ValidationError('Bạn cần đăng nhập để gửi đánh giá.')

        user = request.user
        tour = attrs.get('tour')

        # Khi tạo mới (create)
        if self.instance is None:
            # Kiểm tra xem user đã từng đánh giá tour này chưa
            if Review.objects.filter(tour=tour, user=user).exists():
                raise serializers.ValidationError({
                    'detail': 'Bạn đã đánh giá tour này rồi. Mỗi khách hàng chỉ được gửi 1 đánh giá cho mỗi tour.'
                })

            # Kiểm tra xem user đã từng đặt tour này chưa (status: confirmed hoặc completed)
            # Cho phép Admin / Staff kiểm thử linh hoạt
            if not (user.is_staff or user.is_superuser):
                has_booked = Booking.objects.filter(
                    user=user,
                    tour=tour,
                    status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]
                ).exists()

                if not has_booked:
                    raise serializers.ValidationError({
                        'detail': 'Bạn chỉ có thể gửi đánh giá sau khi đã đặt và tham gia tour này.'
                    })

        return attrs

    def create(self, validated_data):
        user = self.context['request'].user
        return Review.objects.create(user=user, **validated_data)
