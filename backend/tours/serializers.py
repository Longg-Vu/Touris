"""
BƯỚC 2: SERIALIZERS - Chuyển đổi dữ liệu Python ↔ JSON

Khi Frontend gọi API, Django trả về JSON.
Serializer có nhiệm vụ:
  - Đọc object Model từ DB → chuyển thành dict Python → trả về JSON
  - (Chiều ngược lại: nhận JSON → validate → lưu vào DB)

Luồng:
  DB → Model object → Serializer → JSON → Frontend
"""

from rest_framework import serializers
from .models import Tour, Destination, Category, SaleAlert, Favorite


class CategorySerializer(serializers.ModelSerializer):
    """Serialize danh mục (chỉ trả về id và name)"""
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class DestinationSerializer(serializers.ModelSerializer):
    """
    Serialize điểm đến cho trang chủ và dropdown bộ lọc.
    tour_count được tính tự động từ số lượng tour thực tế đang hiển thị (is_active=True).
    """
    tour_count = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = ['id', 'name', 'slug', 'image_url', 'tour_count']

    def get_tour_count(self, obj):
        if hasattr(obj, 'calculated_tour_count'):
            return obj.calculated_tour_count
        return obj.tours.filter(is_active=True).count()


class TourListSerializer(serializers.ModelSerializer):
    """
    Serialize tour cho danh sách (trang chủ + trang danh sách tour).
    Dùng SerializerMethodField để lấy tên danh mục và điểm đến thay vì chỉ trả ID.
    """
    # Lấy tên thay vì ID của category và destination
    category_name = serializers.CharField(source='category.name', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)
    
    # Chuyển Decimal sang float để JSON serialize được
    price_adult = serializers.DecimalField(max_digits=12, decimal_places=0)
    rating = serializers.DecimalField(max_digits=3, decimal_places=1)
    sale_price = serializers.SerializerMethodField(read_only=True)

    def get_sale_price(self, obj):
        if obj.is_priority_sale and (obj.sale_percent or 0) > 0:
            return round(float(obj.price_adult) * (100 - obj.sale_percent) / 100)
        return float(obj.price_adult)

    class Meta:
        model = Tour
        fields = [
            'id',
            'name',
            'category_name',
            'destination_name',
            'price_adult',
            'sale_price',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'tags',
            'promo',
            'is_hot',
            'is_featured',
            'is_priority_sale',
            'sale_percent',
        ]


class TourDetailSerializer(serializers.ModelSerializer):
    """
    Serialize đầy đủ thông tin tour cho trang chi tiết.
    Bao gồm nested objects của category và destination.
    """
    category = CategorySerializer(read_only=True)
    destination = DestinationSerializer(read_only=True)
    price_adult = serializers.DecimalField(max_digits=12, decimal_places=0)
    rating = serializers.DecimalField(max_digits=3, decimal_places=1)
    guide = serializers.SerializerMethodField(read_only=True)
    sale_price = serializers.SerializerMethodField(read_only=True)

    def get_sale_price(self, obj):
        if obj.is_priority_sale and (obj.sale_percent or 0) > 0:
            return round(float(obj.price_adult) * (100 - obj.sale_percent) / 100)
        return float(obj.price_adult)

    def get_guide(self, obj):
        if not obj.guide:
            return None
        full_name = f"{obj.guide.first_name} {obj.guide.last_name}".strip()
        return {
            'id': obj.guide.id,
            'name': full_name if full_name else obj.guide.username,
            'avatar': obj.guide.avatar or '',
            'phone': obj.guide.phone or '',
        }

    class Meta:
        model = Tour
        fields = [
            'id',
            'name',
            'category',
            'destination',
            'guide',
            'price_adult',
            'sale_price',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'tags',
            'highlights',
            'itinerary',
            'gallery',
            'promo',
            'is_hot',
            'is_featured',
            'is_priority_sale',
            'sale_percent',
            'created_at',
            'updated_at',
        ]


class AdminTourSerializer(serializers.ModelSerializer):
    """
    Serialize đầy đủ cho Admin/Staff quản lý tour.
    Hỗ trợ cả READ (hiển thị tên) lẫn WRITE (nhận ID để tạo/sửa).
    """
    category_name    = serializers.CharField(source='category.name',      read_only=True)
    destination_name        = serializers.CharField(source='destination.name',   read_only=True)
    guide_name              = serializers.SerializerMethodField(read_only=True)
    price_adult             = serializers.DecimalField(max_digits=12, decimal_places=0)
    rating                  = serializers.DecimalField(max_digits=3,  decimal_places=1, required=False)
    target_participants     = serializers.IntegerField(required=False, default=20)
    current_booked_guests   = serializers.SerializerMethodField(read_only=True)
    confirmed_booked_guests = serializers.SerializerMethodField(read_only=True)
    remaining_needed        = serializers.SerializerMethodField(read_only=True)
    fill_rate               = serializers.SerializerMethodField(read_only=True)
    has_shortage            = serializers.SerializerMethodField(read_only=True)
    active_bookings_count   = serializers.SerializerMethodField(read_only=True)
    next_travel_date        = serializers.SerializerMethodField(read_only=True)
    sale_price              = serializers.SerializerMethodField(read_only=True)

    def get_sale_price(self, obj):
        if obj.is_priority_sale and (obj.sale_percent or 0) > 0:
            return round(float(obj.price_adult) * (100 - obj.sale_percent) / 100)
        return float(obj.price_adult)

    class Meta:
        model  = Tour
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'destination',
            'destination_name',
            'guide',
            'guide_name',
            'price_adult',
            'sale_price',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'target_participants',
            'current_booked_guests',
            'confirmed_booked_guests',
            'remaining_needed',
            'fill_rate',
            'has_shortage',
            'active_bookings_count',
            'next_travel_date',
            'tags',
            'highlights',
            'itinerary',
            'gallery',
            'promo',
            'is_hot',
            'is_featured',
            'is_active',
            'is_priority_sale',
            'sale_percent',
            'last_sale_alert_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'created_at', 'updated_at']

    def get_guide_name(self, obj):
        if not obj.guide:
            return None
        full = f"{obj.guide.first_name} {obj.guide.last_name}".strip()
        return full if full else obj.guide.username

    def _get_active_bookings(self, obj):
        if hasattr(obj, '_prefetched_objects_cache') and 'bookings' in obj._prefetched_objects_cache:
            return [b for b in obj.bookings.all() if b.status != 'cancelled']
        return list(obj.bookings.exclude(status='cancelled'))

    def get_current_booked_guests(self, obj):
        bookings = self._get_active_bookings(obj)
        return sum(b.num_adults + b.num_children for b in bookings)

    def get_confirmed_booked_guests(self, obj):
        bookings = self._get_active_bookings(obj)
        return sum(b.num_adults + b.num_children for b in bookings if b.status in ['confirmed', 'completed'])

    def get_remaining_needed(self, obj):
        target = obj.target_participants or 20
        booked = self.get_current_booked_guests(obj)
        return max(0, target - booked)

    def get_fill_rate(self, obj):
        target = obj.target_participants or 20
        if target <= 0:
            return 100
        booked = self.get_current_booked_guests(obj)
        return min(100, round((booked / target) * 100))

    def get_has_shortage(self, obj):
        target = obj.target_participants or 20
        booked = self.get_current_booked_guests(obj)
        return booked < target

    def get_active_bookings_count(self, obj):
        return len(self._get_active_bookings(obj))

    def get_next_travel_date(self, obj):
        from django.utils import timezone
        today = timezone.now().date()
        bookings = self._get_active_bookings(obj)
        future_dates = [b.travel_date for b in bookings if b.travel_date >= today]
        if future_dates:
            return str(min(future_dates))
        if bookings:
            return str(max(b.travel_date for b in bookings))
        return None


class SaleAlertSerializer(serializers.ModelSerializer):
    """
    Serializer cho danh sách thông báo cảnh báo từ HDV gửi đến phòng Sale & Admin
    """
    tour_name      = serializers.CharField(source='tour.name', read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail', read_only=True)
    sender_name    = serializers.SerializerMethodField(read_only=True)
    sender_avatar  = serializers.CharField(source='sender.avatar', read_only=True)

    class Meta:
        model = SaleAlert
        fields = [
            'id',
            'tour',
            'tour_name',
            'tour_thumbnail',
            'sender',
            'sender_name',
            'sender_avatar',
            'title',
            'message',
            'target_participants',
            'current_booked',
            'shortage_count',
            'is_read',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_sender_name(self, obj):
        if not obj.sender:
            return 'Hệ thống'
        full = f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return full if full else obj.sender.username


class FavoriteSerializer(serializers.ModelSerializer):
    """Serialize Tour yêu thích của người dùng"""
    tour = TourListSerializer(read_only=True)
    tour_id = serializers.PrimaryKeyRelatedField(
        queryset=Tour.objects.filter(is_active=True),
        source='tour',
        write_only=True
    )

    class Meta:
        model = Favorite
        fields = ['id', 'tour', 'tour_id', 'created_at']
        read_only_fields = ['id', 'created_at']

