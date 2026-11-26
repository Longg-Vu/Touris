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

from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from accounts.permissions import IsStaffOrSuperUser
from .models import Tour, Destination, Category, SaleAlert, Favorite
from .serializers import (
    TourListSerializer, TourDetailSerializer,
    DestinationSerializer, CategorySerializer,
    AdminTourSerializer, SaleAlertSerializer,
    FavoriteSerializer,
)


class TourFilter(django_filters.FilterSet):
    """
    Bộ lọc tùy chỉnh cho Tour:
    - Hỗ trợ lọc nhiều danh mục cùng lúc qua ?categories=slug1,slug2
    - Hỗ trợ lọc theo ngày / khoảng ngày (?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD)
    - Hỗ trợ lọc theo danh sách ID (?ids=1,2,3)
    - Giữ nguyên các bộ lọc đơn khác
    """
    categories = django_filters.CharFilter(method='filter_by_categories')
    start_date = django_filters.DateFilter(method='filter_by_date')
    end_date   = django_filters.DateFilter(method='filter_by_date')
    date       = django_filters.DateFilter(method='filter_by_date')
    ids        = django_filters.CharFilter(method='filter_by_ids')
    on_sale    = django_filters.BooleanFilter(method='filter_on_sale')

    class Meta:
        model  = Tour
        fields = [
            'is_featured', 'is_hot', 'destination', 'destination__slug',
            'category', 'category__slug', 'is_active', 'categories',
            'start_date', 'end_date', 'date', 'ids', 'is_priority_sale',
            'on_sale',
        ]

    def filter_on_sale(self, queryset, name, value):
        if value:
            return queryset.filter(Q(is_priority_sale=True) | Q(sale_percent__gt=0))
        return queryset

    def filter_by_categories(self, queryset, name, value):
        slugs = [s.strip() for s in value.split(',') if s.strip()]
        if slugs:
            return queryset.filter(category__slug__in=slugs)
        return queryset

    def filter_by_date(self, queryset, name, value):
        # Tất cả các tour đang mở bán (is_active=True) đều hoạt động cho các ngày hợp lệ
        return queryset.filter(is_active=True)

    def filter_by_ids(self, queryset, name, value):
        try:
            id_list = [int(i.strip()) for i in value.split(',') if i.strip()]
            if id_list:
                return queryset.filter(id__in=id_list)
        except ValueError:
            pass
        return queryset


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
        ).select_related('category', 'destination', 'guide')

    @action(detail=False, methods=['get', 'post'], url_path='by-ids')
    def get_by_ids(self, request):
        """Lấy danh sách tour theo mảng IDs (phục vụ tour yêu thích cho khách vãng lai)."""
        ids = request.data.get('ids') if request.method == 'POST' else request.query_params.get('ids')
        if not ids:
            return Response([])
        if isinstance(ids, str):
            try:
                id_list = [int(i.strip()) for i in ids.split(',') if i.strip()]
            except ValueError:
                id_list = []
        elif isinstance(ids, list):
            try:
                id_list = [int(i) for i in ids]
            except ValueError:
                id_list = []
        else:
            id_list = []

        tours = self.get_queryset().filter(id__in=id_list)
        return Response(TourListSerializer(tours, many=True).data)


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
    - Admin: xem và quản lý toàn bộ tour của hệ thống, chỉ định người dẫn tour.
    - Nhân viên (Staff): chỉ xem và cập nhật tour do mình phụ trách dẫn (guide=user).
    """
    permission_classes = [IsStaffOrSuperUser]
    serializer_class   = AdminTourSerializer
    pagination_class   = AdminTourPagination
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter, DjangoFilterBackend]
    search_fields      = ['name', 'destination__name', 'category__name']
    ordering_fields    = ['created_at', 'price_adult', 'rating', 'name']
    ordering           = ['-created_at']

    def get_queryset(self):
        """
        Admin: thấy tất cả tour.
        Staff: chỉ thấy tour do mình phụ trách (guide=request.user).
        """
        qs = Tour.objects.select_related('category', 'destination', 'guide').prefetch_related('bookings').order_by('-created_at')

        user = self.request.user
        if not user.is_superuser:
            qs = qs.filter(guide=user)
        else:
            # Cho phép Admin lọc theo guide cụ thể
            guide_id = self.request.query_params.get('guide', '')
            if guide_id:
                qs = qs.filter(guide_id=guide_id)

        # Lọc theo is_active
        is_active = self.request.query_params.get('is_active', '')
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        # Lọc theo is_priority_sale (Cần đẩy Sale gấp)
        is_priority = self.request.query_params.get('is_priority_sale', '')
        if is_priority == 'true':
            qs = qs.filter(is_priority_sale=True)
        elif is_priority == 'false':
            qs = qs.filter(is_priority_sale=False)

        # Lọc theo tour_id cụ thể
        tour_id_param = self.request.query_params.get('tour_id', '')
        if tour_id_param:
            qs = qs.filter(id=tour_id_param)

        # Lọc theo time_filter (Phân chia tour theo mốc thời gian dành cho HDV/Admin)
        time_filter = self.request.query_params.get('time_filter', '')
        if time_filter and time_filter != 'all':
            from bookings.models import Booking
            today = timezone.now().date()
            this_year = today.year
            this_month = today.month

            if this_month == 12:
                next_year = this_year + 1
                next_month = 1
            else:
                next_year = this_year
                next_month = this_month + 1

            if time_filter == 'priority_sale':
                # Tab Lọc: Các tour đang cần Sale gấp
                qs = qs.filter(is_priority_sale=True)

            elif time_filter == 'this_month':
                # Tour trong tháng này (hoặc đang bắt đầu / sắp khởi hành tháng này)
                month_tour_ids = Booking.objects.filter(
                    travel_date__year=this_year,
                    travel_date__month=this_month,
                ).exclude(status=Booking.STATUS_CANCELLED).values_list('tour_id', flat=True).distinct()
                qs = qs.filter(id__in=month_tour_ids)

            elif time_filter == 'next_month':
                # Tour tháng sau
                next_month_tour_ids = Booking.objects.filter(
                    travel_date__year=next_year,
                    travel_date__month=next_month,
                ).exclude(status=Booking.STATUS_CANCELLED).values_list('tour_id', flat=True).distinct()
                qs = qs.filter(id__in=next_month_tour_ids)

            elif time_filter == 'completed':
                # Tour đã hoàn thành trong quá khứ (chỉ tính đơn đã hoàn thành hoặc đã xác nhận và qua ngày đi)
                completed_tour_ids = Booking.objects.filter(
                    Q(status=Booking.STATUS_COMPLETED)
                    | Q(status=Booking.STATUS_CONFIRMED, travel_date__lt=today)
                ).values_list('tour_id', flat=True).distinct()
                qs = qs.filter(id__in=completed_tour_ids)

        return qs

    def perform_create(self, serializer):
        """
        Nếu là Nhân viên tạo tour: tự động gán guide là chính họ.
        Nếu là Admin tạo tour: giữ nguyên guide được chọn (hoặc null nếu chưa gán).
        """
        if not self.request.user.is_superuser:
            serializer.save(guide=self.request.user)
        else:
            serializer.save()

    def perform_update(self, serializer):
        """
        Nếu là Nhân viên cập nhật: giữ nguyên guide là chính họ (không cho đổi sang người khác).
        """
        if not self.request.user.is_superuser:
            serializer.save(guide=self.request.user)
        else:
            serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Chỉ Quản trị viên mới có quyền xoá vĩnh viễn tour khỏi hệ thống."""
        if not request.user.is_superuser:
            return Response(
                {'error': 'Chỉ Quản trị viên mới có quyền xoá tour! Nhân viên chỉ có thể bật/tắt hiển thị.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle')
    def toggle_active(self, request, pk=None):
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
        tour = self.get_object()
        tour.is_featured = not tour.is_featured
        tour.save(update_fields=['is_featured', 'updated_at'])
        return Response({'id': tour.pk, 'is_featured': tour.is_featured})

    @action(detail=True, methods=['post'], url_path='toggle-hot')
    def toggle_hot(self, request, pk=None):
        tour = self.get_object()
        tour.is_hot = not tour.is_hot
        tour.save(update_fields=['is_hot', 'updated_at'])
        return Response({'id': tour.pk, 'is_hot': tour.is_hot})

    @action(detail=False, methods=['get'], url_path='guide-stats')
    def guide_stats(self, request):
        """
        GET /api/tours/admin/tours/guide-stats/
        Widget thống kê nhanh dành cho Hướng dẫn viên (hoặc Admin xem theo guide):
        - Số lượng khách tháng này
        - Số chuyến cần chuẩn bị (tháng này)
        - Số chuyến tháng sau
        - Số tour đã hoàn thành
        - Đếm số tour theo từng tab (this_month, next_month, completed, all)
        """
        from bookings.models import Booking

        user = request.user
        today = timezone.now().date()
        this_year = today.year
        this_month = today.month

        if this_month == 12:
            next_year = this_year + 1
            next_month = 1
        else:
            next_year = this_year
            next_month = this_month + 1

        # Base queryset tours theo vai trò
        tours_qs = Tour.objects.all()
        bookings_qs = Booking.objects.exclude(status=Booking.STATUS_CANCELLED)

        if not user.is_superuser:
            tours_qs = tours_qs.filter(guide=user)
            bookings_qs = bookings_qs.filter(
                Q(assigned_guide=user) | Q(assigned_guide__isnull=True, tour__guide=user)
            )
        else:
            guide_filter = request.query_params.get('guide', '')
            if guide_filter:
                tours_qs = tours_qs.filter(guide_id=guide_filter)
                bookings_qs = bookings_qs.filter(
                    Q(assigned_guide_id=guide_filter) | Q(assigned_guide__isnull=True, tour__guide_id=guide_filter)
                )

        my_tour_ids = list(tours_qs.values_list('id', flat=True))

        # Booking trong tháng này
        this_month_bookings = bookings_qs.filter(
            tour_id__in=my_tour_ids,
            travel_date__year=this_year,
            travel_date__month=this_month,
        )

        this_month_adults = this_month_bookings.aggregate(s=Sum('num_adults'))['s'] or 0
        this_month_children = this_month_bookings.aggregate(s=Sum('num_children'))['s'] or 0
        this_month_guests = this_month_adults + this_month_children
        this_month_tour_count = this_month_bookings.values('tour_id').distinct().count()

        # Booking tháng sau
        next_month_bookings = bookings_qs.filter(
            tour_id__in=my_tour_ids,
            travel_date__year=next_year,
            travel_date__month=next_month,
        )
        next_month_tour_count = next_month_bookings.values('tour_id').distinct().count()

        # Tour đã hoàn thành (chỉ tính đơn completed hoặc confirmed đã qua ngày khởi hành)
        completed_bookings = bookings_qs.filter(
            tour_id__in=my_tour_ids
        ).filter(
            Q(status=Booking.STATUS_COMPLETED)
            | Q(status=Booking.STATUS_CONFIRMED, travel_date__lt=today)
        )
        completed_tour_count = completed_bookings.values('tour_id').distinct().count()

        total_tours = len(my_tour_ids)
        priority_sale_count = tours_qs.filter(is_priority_sale=True).count()

        return Response({
            'this_month_guests': this_month_guests,
            'this_month_trips': this_month_tour_count,
            'next_month_trips': next_month_tour_count,
            'completed_trips': completed_tour_count,
            'priority_sale_tours': priority_sale_count,
            'total_tours': total_tours,
            'tabs_count': {
                'this_month': this_month_tour_count,
                'next_month': next_month_tour_count,
                'completed': completed_tour_count,
                'priority_sale': priority_sale_count,
                'all': total_tours,
            }
        })

    @action(detail=True, methods=['get'], url_path='manifest')
    def manifest(self, request, pk=None):
        """
        GET /api/tours/admin/tours/{id}/manifest/
        Lấy chi tiết danh sách khách đặt & tiến độ đoàn của một tour cụ thể,
        giúp HDV kiểm tra số lượng cần, số lượng đã đặt, thiếu bao nhiêu để báo Sale.
        """
        tour = self.get_object()
        bookings = tour.bookings.select_related('user').exclude(status='cancelled').order_by('travel_date', '-created_at')

        target = tour.target_participants or 20
        total_booked_guests = sum(b.num_adults + b.num_children for b in bookings)
        confirmed_guests = sum(b.num_adults + b.num_children for b in bookings if b.status in ['confirmed', 'completed'])
        pending_guests = sum(b.num_adults + b.num_children for b in bookings if b.status == 'pending')
        remaining_needed = max(0, target - total_booked_guests)
        fill_rate = min(100, round((total_booked_guests / target) * 100)) if target > 0 else 100

        status_type = 'full' if total_booked_guests >= target else 'shortage'

        booking_items = []
        for b in bookings:
            booking_items.append({
                'id': b.id,
                'booking_code': b.booking_code or f"BK{b.id:04d}",
                'contact_name': b.contact_name,
                'contact_phone': b.contact_phone,
                'contact_email': b.contact_email,
                'travel_date': str(b.travel_date),
                'num_adults': b.num_adults,
                'num_children': b.num_children,
                'total_guests': b.num_adults + b.num_children,
                'total_price': b.total_price,
                'status': b.status,
                'special_request': b.special_request,
                'created_at': b.created_at.strftime('%d/%m/%Y %H:%M'),
            })

        guide_name = None
        if tour.guide:
            full = f"{tour.guide.first_name} {tour.guide.last_name}".strip()
            guide_name = full if full else tour.guide.username

        last_alert_display = None
        if tour.last_sale_alert_at:
            local_dt = timezone.localtime(tour.last_sale_alert_at)
            last_alert_display = local_dt.strftime('%H:%M %d/%m/%Y')

        return Response({
            'tour': {
                'id': tour.id,
                'name': tour.name,
                'thumbnail': tour.thumbnail,
                'price_adult': tour.price_adult,
                'target_participants': target,
                'total_booked_guests': total_booked_guests,
                'confirmed_guests': confirmed_guests,
                'pending_guests': pending_guests,
                'remaining_needed': remaining_needed,
                'fill_rate': fill_rate,
                'has_shortage': remaining_needed > 0,
                'status': status_type,
                'guide_name': guide_name,
                'is_priority_sale': tour.is_priority_sale,
                'sale_percent': tour.sale_percent,
                'sale_price': tour.final_price,
                'last_sale_alert_at': tour.last_sale_alert_at.isoformat() if tour.last_sale_alert_at else None,
                'last_sale_alert_display': last_alert_display,
            },
            'bookings': booking_items
        })

    @action(detail=False, methods=['post'], url_path='upload-image')
    def upload_image(self, request):
        """
        POST /api/tours/admin/tours/upload-image/
        Tải ảnh đại diện tour từ máy tính lên server (lưu vào MEDIA_ROOT/tours/)
        và trả về URL đầy đủ để gán vào trường thumbnail.
        """
        import os
        import uuid
        from django.conf import settings
        from django.core.files.storage import default_storage

        file_obj = request.FILES.get('image') or request.FILES.get('file')
        if not file_obj:
            return Response({'error': 'Vui lòng chọn một file ảnh để tải lên.'}, status=400)

        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
            return Response({'error': 'Chỉ hỗ trợ định dạng ảnh (.jpg, .jpeg, .png, .webp, .gif).'}, status=400)

        if file_obj.size > 8 * 1024 * 1024:
            return Response({'error': 'Kích thước ảnh tối đa là 8MB.'}, status=400)

        filename = f"tours/{uuid.uuid4().hex[:12]}{ext}"
        saved_path = default_storage.save(filename, file_obj)
        media_url = f"{settings.MEDIA_URL}{saved_path}".replace('\\', '/')
        full_url = request.build_absolute_uri(media_url)
        return Response({'url': full_url, 'message': 'Tải ảnh lên thành công!'})

    @action(detail=True, methods=['post'], url_path='alert-sale')
    def alert_sale(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/alert-sale/
        HDV gửi cảnh báo phòng Sale gom khách. Cập nhật tour thành cờ ưu tiên Sale
        và tạo record SaleAlert hiển thị trên Chuông Header cho Sale/Admin.
        """
        tour = self.get_object()
        bookings = tour.bookings.exclude(status='cancelled')
        target = tour.target_participants or 20
        current_booked = sum(b.num_adults + b.num_children for b in bookings)
        shortage = max(0, target - current_booked)

        now = timezone.now()
        local_now = timezone.localtime(now)

        sender_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        custom_note = request.data.get('note', '').strip()

        title = f"🚨 Cảnh báo gom khách đoàn: {tour.name}"
        message = (
            f"HDV {sender_name} vừa gửi cảnh báo gom khách cho tour \"{tour.name}\".\n"
            f"Hiện mới có {current_booked}/{target} khách (còn thiếu {shortage} khách).\n"
            f"Nhờ phòng Sale hỗ trợ đẩy mạnh tư vấn gom khách giúp đoàn!"
        )
        if custom_note:
            message += f"\n\n💬 Ghi chú từ HDV: {custom_note}"

        alert = SaleAlert.objects.create(
            tour=tour,
            sender=request.user,
            title=title,
            message=message,
            target_participants=target,
            current_booked=current_booked,
            shortage_count=shortage,
        )

        tour.is_priority_sale = True
        tour.last_sale_alert_at = now
        tour.save(update_fields=['is_priority_sale', 'last_sale_alert_at', 'updated_at'])

        return Response({
            'success': True,
            'message': f"Đã gửi cảnh báo đến phòng Sale lúc {local_now.strftime('%H:%M')}!",
            'last_sale_alert_at': now.isoformat(),
            'last_sale_alert_display': local_now.strftime('%H:%M %d/%m/%Y'),
            'is_priority_sale': True,
            'alert': SaleAlertSerializer(alert).data,
        })

    @action(detail=True, methods=['post'], url_path='clear-priority')
    def clear_priority(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/clear-priority/
        Gỡ cờ ưu tiên Sale khi đoàn đã đủ khách hoặc đã xử lý xong.
        """
        tour = self.get_object()
        tour.is_priority_sale = False
        tour.sale_percent = 0
        tour.save(update_fields=['is_priority_sale', 'sale_percent', 'updated_at'])
        return Response({
            'success': True,
            'message': 'Đã gỡ cờ ưu tiên Sale.',
            'is_priority_sale': False,
            'sale_percent': 0,
        })

    @action(detail=True, methods=['post'], url_path='activate-sale')
    def activate_sale(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/activate-sale/
        Admin kích hoạt chương trình Flash Sale kích cầu chốt đoàn.
        Nhận: { sale_percent: 20 }
        """
        tour = self.get_object()
        raw_percent = request.data.get('sale_percent', 20)
        try:
            percent = int(raw_percent)
            if percent <= 0 or percent > 90:
                percent = 20
        except (TypeError, ValueError):
            percent = 20

        tour.is_priority_sale = True
        tour.sale_percent = percent
        if not tour.promo or 'Ưu đãi' in tour.promo or 'Giảm' in tour.promo:
            tour.promo = f"Ưu đãi chốt đoàn - Giảm {percent}%"
        tour.save(update_fields=['is_priority_sale', 'sale_percent', 'promo', 'updated_at'])

        return Response({
            'success': True,
            'id': tour.pk,
            'is_priority_sale': True,
            'sale_percent': tour.sale_percent,
            'price_adult': tour.price_adult,
            'sale_price': tour.final_price,
            'promo': tour.promo,
            'message': f"Đã kích hoạt chương trình Flash Sale giảm {tour.sale_percent}% thành công!",
        })

    @action(detail=True, methods=['post'], url_path='deactivate-sale')
    def deactivate_sale(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/deactivate-sale/
        Admin tắt Sale, khôi phục giá gốc cho tour.
        """
        tour = self.get_object()
        tour.is_priority_sale = False
        tour.sale_percent = 0
        if tour.promo and ('Ưu đãi chốt đoàn' in tour.promo or 'Giảm' in tour.promo):
            tour.promo = ''
        tour.save(update_fields=['is_priority_sale', 'sale_percent', 'promo', 'updated_at'])

        return Response({
            'success': True,
            'id': tour.pk,
            'is_priority_sale': False,
            'sale_percent': 0,
            'price_adult': tour.price_adult,
            'sale_price': tour.price_adult,
            'promo': tour.promo,
            'message': "Đã tắt khuyến mãi Sale và khôi phục giá gốc.",
        })

    @action(detail=True, methods=['post'], url_path='toggle-priority')
    def toggle_priority(self, request, pk=None):
        """
        POST /api/tours/admin/tours/{id}/toggle-priority/
        Bật/tắt cờ ưu tiên đẩy Sale gấp trực tiếp cho tour.
        """
        tour = self.get_object()
        tour.is_priority_sale = not tour.is_priority_sale
        if tour.is_priority_sale and not tour.last_sale_alert_at:
            tour.last_sale_alert_at = timezone.now()
        tour.save(update_fields=['is_priority_sale', 'last_sale_alert_at', 'updated_at'])
        return Response({
            'id': tour.pk,
            'is_priority_sale': tour.is_priority_sale,
            'sale_percent': tour.sale_percent,
            'message': f"Tour đã {'gắn cờ cần Sale gấp' if tour.is_priority_sale else 'gỡ cờ ưu tiên Sale'}.",
        })

    @action(detail=False, methods=['get'], url_path='notifications')
    def get_notifications(self, request):
        """
        GET /api/tours/admin/tours/notifications/
        Lấy danh sách thông báo cảnh báo phòng Sale (kèm số chưa đọc).
        """
        alerts = SaleAlert.objects.select_related('tour', 'sender').order_by('-created_at')[:30]
        unread_count = SaleAlert.objects.filter(is_read=False).count()
        return Response({
            'unread_count': unread_count,
            'results': SaleAlertSerializer(alerts, many=True).data,
        })

    @action(detail=False, methods=['post'], url_path=r'notifications/(?P<alert_id>\d+)/mark-read')
    def mark_notification_read(self, request, alert_id=None):
        """
        POST /api/tours/admin/tours/notifications/{alert_id}/mark-read/
        Đánh dấu 1 thông báo là đã đọc.
        """
        try:
            alert = SaleAlert.objects.get(id=alert_id)
            alert.is_read = True
            alert.save(update_fields=['is_read'])
            unread_count = SaleAlert.objects.filter(is_read=False).count()
            return Response({'success': True, 'unread_count': unread_count})
        except SaleAlert.DoesNotExist:
            return Response({'error': 'Không tìm thấy thông báo'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='notifications/mark-all-read')
    def mark_all_notifications_read(self, request):
        """
        POST /api/tours/admin/tours/notifications/mark-all-read/
        Đánh dấu tất cả thông báo là đã đọc.
        """
        SaleAlert.objects.filter(is_read=False).update(is_read=True)
        return Response({'success': True, 'unread_count': 0})


# ─────────────────────────────────────────────────────────────────────────────
# Favorites ViewSet (Khách hàng đã đăng nhập)
# ─────────────────────────────────────────────────────────────────────────────

class FavoriteViewSet(viewsets.ModelViewSet):
    """
    API Quản lý Tour yêu thích của người dùng:
    - GET  /api/tours/favorites/        → Danh sách tour yêu thích của user
    - POST /api/tours/favorites/toggle/ → Bật/tắt yêu thích (body: { tour_id })
    - POST /api/tours/favorites/sync/   → Đồng bộ danh sách từ localStorage (body: { tour_ids: [...] })
    - GET  /api/tours/favorites/ids/    → Lấy danh sách ID các tour đã thích
    """
    serializer_class = FavoriteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(
            user=self.request.user,
            tour__is_active=True
        ).select_related('tour__category', 'tour__destination', 'tour__guide')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path='ids')
    def get_favorite_ids(self, request):
        """Lấy mảng IDs các tour người dùng đã lưu tim."""
        ids = list(Favorite.objects.filter(
            user=request.user,
            tour__is_active=True
        ).values_list('tour_id', flat=True))
        return Response({'favorite_ids': ids, 'count': len(ids)})

    @action(detail=False, methods=['post'], url_path='toggle')
    def toggle_favorite(self, request):
        """Thêm hoặc gỡ tour khỏi danh sách yêu thích."""
        tour_id = request.data.get('tour_id')
        if not tour_id or not str(tour_id).isdigit():
            return Response({'detail': 'tour_id hợp lệ là bắt buộc.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            tour = Tour.objects.get(pk=int(tour_id), is_active=True)
        except Tour.DoesNotExist:
            return Response({'detail': 'Tour không tồn tại hoặc đã ngừng hoạt động.'}, status=status.HTTP_404_NOT_FOUND)

        favorite = Favorite.objects.filter(user=request.user, tour=tour).first()
        if favorite:
            favorite.delete()
            is_favorite = False
        else:
            Favorite.objects.create(user=request.user, tour=tour)
            is_favorite = True

        total_count = Favorite.objects.filter(user=request.user, tour__is_active=True).count()
        return Response({
            'is_favorite': is_favorite,
            'tour_id': tour.id,
            'total_count': total_count,
            'message': 'Đã thêm vào danh sách yêu thích ❤️' if is_favorite else 'Đã xóa khỏi danh sách yêu thích 🤍'
        })

    @action(detail=False, methods=['post'], url_path='sync')
    def sync_favorites(self, request):
        """Hợp nhất các tour từ localStorage khi khách đăng nhập."""
        tour_ids = request.data.get('tour_ids', [])
        if isinstance(tour_ids, list) and tour_ids:
            clean_ids = [int(x) for x in tour_ids if str(x).isdigit()]
            if clean_ids:
                valid_tours = Tour.objects.filter(id__in=clean_ids, is_active=True)
                for tour in valid_tours:
                    Favorite.objects.get_or_create(user=request.user, tour=tour)

        current_favorites = list(Favorite.objects.filter(
            user=request.user,
            tour__is_active=True
        ).values_list('tour_id', flat=True))

        return Response({
            'total_count': len(current_favorites),
            'favorite_ids': current_favorites,
            'message': 'Đồng bộ danh sách yêu thích thành công!'
        })

    @action(detail=False, methods=['post', 'delete'], url_path='clear')
    def clear_favorites(self, request):
        """Xóa toàn bộ danh sách tour yêu thích của tài khoản hiện tại."""
        deleted_count, _ = Favorite.objects.filter(user=request.user).delete()
        return Response({
            'deleted_count': deleted_count,
            'favorite_ids': [],
            'total_count': 0,
            'message': 'Đã xóa toàn bộ danh sách yêu thích.'
        })


