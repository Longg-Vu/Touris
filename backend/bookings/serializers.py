"""
BOOKINGS APP - Serializers
==========================
Chuyển đổi Booking object ↔ JSON để giao tiếp với frontend.
"""

from rest_framework import serializers
from .models import Booking
from tours.models import Tour


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Dùng khi khách hàng TẠO MỚI một booking (POST).
    Frontend gửi: tour_id, travel_date, num_adults, num_children,
                  contact_name, contact_phone, contact_email, special_request
    """

    class Meta:
        model  = Booking
        fields = [
            'tour',
            'travel_date',
            'num_adults',
            'num_children',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
        ]

    def validate_tour(self, tour):
        if not tour.is_active:
            raise serializers.ValidationError('Tour này hiện không còn hoạt động.')
        return tour

    def validate_travel_date(self, value):
        from datetime import date
        if value < date.today():
            raise serializers.ValidationError('Ngày khởi hành phải từ hôm nay trở đi.')
        return value

    def validate(self, attrs):
        if attrs.get('num_adults', 1) < 1:
            raise serializers.ValidationError({'num_adults': 'Phải có ít nhất 1 người lớn.'})
        return attrs

    def create(self, validated_data):
        tour = validated_data['tour']

        # Tính giá tại thời điểm đặt (snapshot)
        price_adult = tour.price_adult
        price_child = round(float(price_adult) * 0.7)  # trẻ em = 70% giá người lớn

        num_adults   = validated_data.get('num_adults', 1)
        num_children = validated_data.get('num_children', 0)
        total_price  = price_adult * num_adults + price_child * num_children

        booking = Booking.objects.create(
            **validated_data,
            user=self.context['request'].user,
            price_adult=price_adult,
            price_child=price_child,
            total_price=total_price,
            status=Booking.STATUS_PENDING,
        )
        return booking


class BookingListSerializer(serializers.ModelSerializer):
    """
    Dùng khi HIỂN THỊ danh sách / chi tiết booking (GET) cho Khách hàng.
    Trả về thêm thông tin tour để hiển thị trên MyBookingsPage.
    """

    tour_title     = serializers.CharField(source='tour.name',      read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id',
            'tour',
            'tour_title',
            'tour_thumbnail',
            'travel_date',
            'num_adults',
            'num_children',
            'price_adult',
            'price_child',
            'total_price',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
            'status',
            'status_display',
            'created_at',
        ]


class AdminBookingSerializer(serializers.ModelSerializer):
    """
    Dùng cho Admin/Staff – hiển thị đầy đủ thông tin đơn bao gồm cả user.
    """

    tour_title     = serializers.CharField(source='tour.name',       read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail',  read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name  = serializers.SerializerMethodField()
    customer_email = serializers.CharField(source='user.email',      read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id',
            'tour',
            'tour_title',
            'tour_thumbnail',
            'travel_date',
            'num_adults',
            'num_children',
            'price_adult',
            'price_child',
            'total_price',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
            'status',
            'status_display',
            'created_at',
            'updated_at',
            # Thông tin khách hàng
            'customer_name',
            'customer_email',
        ]

    def get_customer_name(self, obj):
        """Ưu tiên first_name + last_name, fallback về username."""
        if obj.user.first_name:
            return f"{obj.user.first_name} {obj.user.last_name or ''}".strip()
        return obj.user.username
