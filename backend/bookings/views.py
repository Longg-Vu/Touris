"""
BOOKINGS APP - Views
=====================
Xử lý các HTTP request liên quan đến đặt tour.

Endpoints (Customer):
  POST   /api/bookings/bookings/                → tạo booking mới
  GET    /api/bookings/bookings/                → lấy danh sách booking của user
  GET    /api/bookings/bookings/{id}/           → xem chi tiết booking
  POST   /api/bookings/bookings/{id}/cancel/    → huỷ booking
  POST   /api/bookings/bookings/{id}/pay/       → giả lập thanh toán

Endpoints (Admin/Staff):
  GET    /api/bookings/admin/bookings/                    → xem tất cả đơn
  GET    /api/bookings/admin/bookings/{id}/               → xem chi tiết đơn
  POST   /api/bookings/admin/bookings/{id}/confirm/       → xác nhận đơn
  POST   /api/bookings/admin/bookings/{id}/complete/      → hoàn thành đơn
  POST   /api/bookings/admin/bookings/{id}/cancel/        → huỷ đơn
  GET    /api/bookings/stats/                             → thống kê dashboard
"""

from datetime import datetime, timedelta
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from .models import Booking
from .serializers import BookingCreateSerializer, BookingListSerializer, AdminBookingSerializer


# ─────────────────────────────────────────────────────────────────────────────
# Customer ViewSet – mỗi user chỉ thấy booking của chính mình
# ─────────────────────────────────────────────────────────────────────────────
class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý toàn bộ CRUD booking.
    Chỉ cho phép user đã đăng nhập (IsAuthenticated).
    Mỗi user chỉ thấy booking của chính mình.
    """

    permission_classes = [permissions.IsAuthenticated]
    http_method_names  = ['get', 'post', 'head', 'options']   # Không cho PUT/DELETE trực tiếp

    def get_queryset(self):
        """Mỗi user chỉ thấy booking của chính họ."""
        return Booking.objects.filter(user=self.request.user).select_related('tour')

    def get_serializer_class(self):
        """Dùng serializer khác nhau cho create vs list/retrieve."""
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingListSerializer

    def create(self, request, *args, **kwargs):
        """POST /api/bookings/bookings/ – Tạo booking mới."""
        serializer = BookingCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        if serializer.is_valid():
            booking = serializer.save()
            # Trả về dữ liệu đầy đủ (dùng ListSerializer để có tour info)
            out = BookingListSerializer(booking, context={'request': request})
            return Response(out.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """POST /api/bookings/bookings/{id}/cancel/ – Huỷ booking."""
        booking = self.get_object()

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({'detail': 'Booking đã được huỷ trước đó.'}, status=400)

        if booking.status == Booking.STATUS_COMPLETED:
            return Response({'detail': 'Không thể huỷ tour đã hoàn thành.'}, status=400)

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=['status', 'updated_at'])

        out = BookingListSerializer(booking, context={'request': request})
        return Response(out.data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay(self, request, pk=None):
        """
        POST /api/bookings/bookings/{id}/pay/
        Giả lập thanh toán: khách bấm 'Đã thanh toán' → chuyển PENDING → CONFIRMED.
        """
        booking = self.get_object()

        if booking.status != Booking.STATUS_PENDING:
            return Response(
                {'detail': 'Chỉ có thể thanh toán đơn ở trạng thái Chờ xác nhận.'},
                status=400,
            )

        method = request.data.get('method', 'bank_transfer')
        if not booking.special_request:
            booking.special_request = f'[Thanh toán: {method}]'
        else:
            booking.special_request = f'{booking.special_request} [Thanh toán: {method}]'

        booking.status = Booking.STATUS_CONFIRMED
        booking.save(update_fields=['status', 'special_request', 'updated_at'])

        out = BookingListSerializer(booking, context={'request': request})
        return Response({
            'booking': out.data,
            'message': 'Thanh toán thành công! Đơn của bạn đã được xác nhận.',
        })


# ─────────────────────────────────────────────────────────────────────────────
# Admin ViewSet – xem và quản lý TẤT CẢ đơn
# ─────────────────────────────────────────────────────────────────────────────
class AdminBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet dành cho Admin/Staff quản lý toàn bộ đơn đặt tour.
    Chỉ cho phép Admin hoặc Staff truy cập.
    """

    permission_classes = [permissions.IsAdminUser]
    serializer_class   = AdminBookingSerializer

    def get_queryset(self):
        """Lấy tất cả booking, hỗ trợ lọc theo status và search."""
        qs = Booking.objects.select_related('user', 'tour').order_by('-created_at')

        # Lọc theo trạng thái
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Tìm kiếm theo tên khách, SĐT, tên tour
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(contact_name__icontains=search)
                | Q(contact_phone__icontains=search)
                | Q(contact_email__icontains=search)
                | Q(tour__name__icontains=search)
                | Q(user__username__icontains=search)
            )

        return qs

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/confirm/ – Xác nhận đơn."""
        booking = self.get_object()

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({'detail': 'Không thể xác nhận đơn đã huỷ.'}, status=400)

        booking.status = Booking.STATUS_CONFIRMED
        booking.save(update_fields=['status', 'updated_at'])
        return Response(AdminBookingSerializer(booking).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/complete/ – Hoàn thành đơn."""
        booking = self.get_object()

        if booking.status != Booking.STATUS_CONFIRMED:
            return Response({'detail': 'Chỉ có thể hoàn thành đơn đã xác nhận.'}, status=400)

        booking.status = Booking.STATUS_COMPLETED
        booking.save(update_fields=['status', 'updated_at'])
        return Response(AdminBookingSerializer(booking).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/cancel/ – Admin huỷ đơn."""
        booking = self.get_object()

        if booking.status in [Booking.STATUS_CANCELLED, Booking.STATUS_COMPLETED]:
            return Response({'detail': 'Không thể huỷ đơn này.'}, status=400)

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=['status', 'updated_at'])
        return Response(AdminBookingSerializer(booking).data)


# ─────────────────────────────────────────────────────────────────────────────
# Stats API – thống kê dashboard
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def dashboard_stats(request):
    """
    GET /api/bookings/stats/
    Trả về toàn bộ số liệu thống kê cho Admin Dashboard:
    - Tổng quan: tổng đơn, doanh thu, tour, khách hàng
    - Phân bổ trạng thái đơn
    - Doanh thu theo tháng (12 tháng gần nhất)
    - Top 5 tour được đặt nhiều nhất
    """
    from tours.models import Tour
    from accounts.models import User

    now = datetime.now()

    # ── Tổng quan ────────────────────────────────────────────
    total_bookings   = Booking.objects.count()
    total_revenue    = Booking.objects.filter(
        status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]
    ).aggregate(total=Sum('total_price'))['total'] or 0

    total_tours      = Tour.objects.filter(is_active=True).count()
    total_customers  = User.objects.filter(is_staff=False, is_superuser=False).count()

    # Đơn tháng này
    bookings_this_month = Booking.objects.filter(
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()

    # Doanh thu tháng này
    revenue_this_month = Booking.objects.filter(
        created_at__year=now.year,
        created_at__month=now.month,
        status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED],
    ).aggregate(total=Sum('total_price'))['total'] or 0

    # ── Phân bổ trạng thái ───────────────────────────────────
    status_counts = Booking.objects.values('status').annotate(count=Count('id'))
    status_map    = {item['status']: item['count'] for item in status_counts}

    # ── Doanh thu theo tháng (12 tháng gần nhất) ────────────
    twelve_months_ago = now - timedelta(days=365)
    monthly_revenue_qs = (
        Booking.objects
        .filter(
            created_at__gte=twelve_months_ago,
            status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED],
        )
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(revenue=Sum('total_price'), bookings=Count('id'))
        .order_by('month')
    )

    monthly_revenue = [
        {
            'month': item['month'].strftime('%m/%Y'),
            'revenue': float(item['revenue'] or 0),
            'bookings': item['bookings'],
        }
        for item in monthly_revenue_qs
    ]

    # ── Top 5 tour được đặt nhiều nhất ───────────────────────
    top_tours_qs = (
        Booking.objects
        .values('tour__id', 'tour__name', 'tour__thumbnail')
        .annotate(
            total_bookings=Count('id'),
            total_revenue=Sum('total_price'),
        )
        .order_by('-total_bookings')[:5]
    )

    top_tours = [
        {
            'id':             item['tour__id'],
            'name':           item['tour__name'],
            'thumbnail':      item['tour__thumbnail'],
            'total_bookings': item['total_bookings'],
            'total_revenue':  float(item['total_revenue'] or 0),
        }
        for item in top_tours_qs
    ]

    # ── Đơn mới nhất (5 đơn) ─────────────────────────────────
    recent_bookings = AdminBookingSerializer(
        Booking.objects.select_related('user', 'tour').order_by('-created_at')[:5],
        many=True,
    ).data

    return Response({
        'overview': {
            'total_bookings':      total_bookings,
            'total_revenue':       float(total_revenue),
            'total_tours':         total_tours,
            'total_customers':     total_customers,
            'bookings_this_month': bookings_this_month,
            'revenue_this_month':  float(revenue_this_month),
        },
        'status_distribution': {
            'pending':   status_map.get(Booking.STATUS_PENDING,   0),
            'confirmed': status_map.get(Booking.STATUS_CONFIRMED, 0),
            'completed': status_map.get(Booking.STATUS_COMPLETED, 0),
            'cancelled': status_map.get(Booking.STATUS_CANCELLED, 0),
        },
        'monthly_revenue': monthly_revenue,
        'top_tours':        top_tours,
        'recent_bookings':  recent_bookings,
    })
