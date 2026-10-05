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
from .models import Tour, Destination, Category


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

    class Meta:
        model = Tour
        fields = [
            'id',
            'name',
            'category_name',
            'destination_name',
            'price_adult',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'tags',
            'promo',
            'is_hot',
            'is_featured',
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

    class Meta:
        model = Tour
        fields = [
            'id',
            'name',
            'category',
            'destination',
            'price_adult',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'tags',
            'promo',
            'is_hot',
            'is_featured',
            'created_at',
            'updated_at',
        ]


class AdminTourSerializer(serializers.ModelSerializer):
    """
    Serialize đầy đủ cho Admin/Staff quản lý tour.
    Hỗ trợ cả READ (hiển thị tên) lẫn WRITE (nhận ID để tạo/sửa).
    """
    category_name    = serializers.CharField(source='category.name',      read_only=True)
    destination_name = serializers.CharField(source='destination.name',   read_only=True)
    price_adult      = serializers.DecimalField(max_digits=12, decimal_places=0)
    rating           = serializers.DecimalField(max_digits=3,  decimal_places=1, required=False)

    class Meta:
        model  = Tour
        fields = [
            'id',
            'name',
            'category',
            'category_name',
            'destination',
            'destination_name',
            'price_adult',
            'thumbnail',
            'rating',
            'review_count',
            'booked_count',
            'tags',
            'promo',
            'is_hot',
            'is_featured',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'created_at', 'updated_at']
