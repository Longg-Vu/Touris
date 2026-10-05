"""
BƯỚC 3: VIEWS - Xử lý HTTP request và trả về response

View nhận request từ Frontend, truy vấn DB qua Model,
serialize kết quả rồi trả về JSON.

Luồng đầy đủ:
  Browser/React
    → GET /api/tours/tours/?is_featured=true
    → urls.py định tuyến đến TourViewSet
    → views.py truy vấn DB: Tour.objects.filter(is_featured=True)
    → serializers.py chuyển queryset → JSON
    → Trả về {"count": 8, "results": [...]}
    → React nhận và render

Endpoints công khai (Guest):
  GET /api/tours/tours/              → danh sách tour
  GET /api/tours/tours/{id}/         → chi tiết tour
  GET /api/tours/destinations/       → danh sách điểm đến
  GET /api/tours/categories/         → danh sách danh mục

Endpoints quản trị (Admin/Staff):
  GET    /api/tours/admin/tours/     → tất cả tour (cả inactive)
  POST   /api/tours/admin/tours/     → tạo tour mới
  GET    /api/tours/admin/tours/{id}/→ chi tiết tour
  PATCH  /api/tours/admin/tours/{id}/→ cập nhật tour
  DELETE /api/tours/admin/tours/{id}/→ xoá tour
  POST   /api/tours/admin/tours/{id}/toggle/ → bật/tắt is_active
"""

from django.db.models import Count, Q
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Tour, Destination, Category
from .serializers import (
    TourListSerializer, TourDetailSerializer,
    DestinationSerializer, CategorySerializer,
    AdminTourSerializer,
)


class TourFilter(django_filters.FilterSet):
    """
    Bộ lọc tùy chỉnh cho Tour:
    - Hỗ trợ lọc nhiều danh mục cùng lúc qua ?categories=slug1,slug2
    - Hỗ trợ lọc theo ngày / khoảng ngày (?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD)
    - Giữ nguyên các bộ lọc đơn khác
    """
    categories = django_filters.CharFilter(method='filter_by_categories')
    start_date = django_filters.DateFilter(method='filter_by_date')
    end_date   = django_filters.DateFilter(method='filter_by_date')
    date       = django_filters.DateFilter(method='filter_by_date')

    class Meta:
        model  = Tour
        fields = [
            'is_featured', 'is_hot', 'destination', 'destination__slug',
            'category', 'category__slug', 'is_active', 'categories',
            'start_date', 'end_date', 'date'
        ]

    def filter_by_categories(self, queryset, name, value):
        slugs = [s.strip() for s in value.split(',') if s.strip()]
        if slugs:
            return queryset.filter(category__slug__in=slugs)
        return queryset

    def filter_by_date(self, queryset, name, value):
        # Tất cả các tour đang mở bán (is_active=True) đều hoạt động cho các ngày hợp lệ
        return queryset.filter(is_active=True)


# ─────────────────────────────────────────────────────────────────────────────
# Public ViewSets (Guest có thể xem)
# ─────────────────────────────────────────────────────────────────────────────

class TourViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Tour - chỉ đọc (GET).
    
    Các URL được tự tạo bởi router (trong urls.py):
      GET /api/tours/tours/           → danh sách tất cả tour
      GET /api/tours/tours/?is_featured=true → chỉ tour nổi bật
      GET /api/tours/tours/{id}/      → chi tiết 1 tour
    
    ReadOnlyModelViewSet: chỉ có list() và retrieve(), không có create/update/delete
    vì khách hàng không được tạo tour - chỉ admin mới làm được qua Django Admin.
    """
    serializer_class   = TourListSerializer
    permission_classes = [AllowAny]  # ← Khách chưa đăng nhập vẫn xem được

    def get_serializer_class(self):
        """Dùng TourDetailSerializer khi xem chi tiết, TourListSerializer khi xem danh sách."""
        if self.action == 'retrieve':
            return TourDetailSerializer
        return TourListSerializer

    # Hỗ trợ filter, search, ordering
    filter_backends  = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class  = TourFilter
    search_fields    = ['name', 'destination__name', 'category__name']
    ordering_fields  = ['rating', 'price_adult', 'created_at', 'review_count']

    def get_queryset(self):
        """
        Trả về queryset tour đang active.
        select_related: JOIN bảng category và destination trong 1 câu SQL
        (thay vì N+1 queries riêng lẻ - tối ưu hiệu năng)
        """
        return Tour.objects.filter(
            is_active=True
        ).select_related('category', 'destination')


class DestinationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Điểm đến - chỉ đọc (GET).
    
    URL:
      GET /api/tours/destinations/    → danh sách điểm đến (trang chủ)
      GET /api/tours/destinations/{id}/ → chi tiết 1 điểm đến
    """
    serializer_class   = DestinationSerializer
    permission_classes = [AllowAny]
    pagination_class   = None  # Luôn trả về tất cả điểm đến cho bộ lọc/dropdown

    def get_queryset(self):
        return Destination.objects.filter(is_active=True).annotate(
            calculated_tour_count=Count('tours', filter=Q(tours__is_active=True))
        ).order_by('order', 'name')


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API Danh mục tour - chỉ đọc (GET).
    
    URL:
      GET /api/tours/categories/
      GET /api/tours/categories/{id}/
    """
    serializer_class   = CategorySerializer
    permission_classes = [AllowAny]
    pagination_class   = None  # Luôn trả về tất cả danh mục cho thanh cuộn tags
    queryset           = Category.objects.all().order_by('name')


# ─────────────────────────────────────────────────────────────────────────────
# Admin ViewSet – CRUD đầy đủ cho Staff/Admin
# ─────────────────────────────────────────────────────────────────────────────
from rest_framework.pagination import PageNumberPagination

class AdminTourPagination(PageNumberPagination):
    """Pagination riêng cho Admin quản lý tour."""
    page_size             = 24          # mặc định 24 tour/trang
    page_size_query_param = 'page_size' # cho phép ?page_size=50
    max_page_size         = 200         # tối đa 200


class AdminTourViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý Tour dành cho Admin/Staff.
    Hỗ trợ đầy đủ: Tạo, Sửa, Xoá, Bật/Tắt hiển thị.

    URL:
      GET    /api/tours/admin/tours/         → danh sách (cả inactive)
      POST   /api/tours/admin/tours/         → tạo tour mới
      GET    /api/tours/admin/tours/{id}/    → chi tiết
      PATCH  /api/tours/admin/tours/{id}/    → cập nhật (một phần)
      DELETE /api/tours/admin/tours/{id}/    → xoá tour
      POST   /api/tours/admin/tours/{id}/toggle/ → bật/tắt is_active
    """
    permission_classes = [permissions.IsAdminUser]
    serializer_class   = AdminTourSerializer
    pagination_class   = AdminTourPagination
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields      = ['name', 'destination__name', 'category__name']
    ordering_fields    = ['created_at', 'price_adult', 'rating', 'name']
    ordering           = ['-created_at']

    def get_queryset(self):
        """Lấy tất cả tour (kể cả inactive), hỗ trợ lọc thêm."""
        qs = Tour.objects.select_related('category', 'destination').order_by('-created_at')

        # Lọc theo is_active
        is_active = self.request.query_params.get('is_active', '')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        return qs

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle_active(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/toggle/
        Bật/tắt trạng thái hiển thị (is_active) của tour.
        """
        tour = self.get_object()
        tour.is_active = not tour.is_active
        tour.save(update_fields=['is_active', 'updated_at'])
        return Response({
            'id':        tour.pk,
            'is_active': tour.is_active,
            'message':   f'Tour đã {"bật" if tour.is_active else "tắt"} hiển thị.',
        })

    @action(detail=True, methods=['post'], url_path='toggle-featured')
    def toggle_featured(self, request, pk=None):
        """POST .../toggle-featured/ – Bật/tắt is_featured (nổi bật trang chủ)."""
        tour = self.get_object()
        tour.is_featured = not tour.is_featured
        tour.save(update_fields=['is_featured', 'updated_at'])
        return Response({'id': tour.pk, 'is_featured': tour.is_featured})

    @action(detail=True, methods=['post'], url_path='toggle-hot')
    def toggle_hot(self, request, pk=None):
        """POST .../toggle-hot/ – Bật/tắt is_hot (tour hot)."""
        tour = self.get_object()
        tour.is_hot = not tour.is_hot
        tour.save(update_fields=['is_hot', 'updated_at'])
        return Response({'id': tour.pk, 'is_hot': tour.is_hot})
