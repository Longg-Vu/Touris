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

from datetime import datetime
from datetime import timedelta
from django.utils import timezone
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from accounts.permissions import IsStaffOrSuperUser
from .models import Booking, ConsultationRequest
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    AdminBookingSerializer,
    ConsultationCreateSerializer,
    ConsultationCustomerSerializer,
    AdminConsultationSerializer,
    AdminConsultationUpdateSerializer,
)



def send_booking_status_email(booking, action_type, refund_note=''):
    """Gửi email thông báo cho khách hàng khi đơn đặt tour đổi trạng thái (Xác nhận / Hoàn thành / Đã huỷ)."""
    if not booking.contact_email:
        return
    try:
        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives

        price_fmt = f"{int(booking.total_price):,} ₫".replace(',', '.')
        code_str = booking.booking_code or f"#{booking.id}"
        travel_str = booking.travel_date.strftime('%d/%m/%Y') if hasattr(booking.travel_date, 'strftime') else str(booking.travel_date)

        if action_type == 'confirmed':
            subject = f"[Tourism] Đơn đặt tour {code_str} đã được XÁC NHẬN"
            badge_color = "#10b981"
            status_title = "✅ ĐƠN ĐẶT TOUR ĐÃ ĐƯỢC XÁC NHẬN"
            intro = f"Đơn đặt tour <strong>{booking.tour.name}</strong> (khởi hành ngày <strong>{travel_str}</strong>) của bạn đã được xác nhận thanh toán thành công."
        elif action_type == 'completed':
            subject = f"[Tourism] Cảm ơn bạn đã hoàn thành chuyến đi {booking.tour.name}"
            badge_color = "#4f46e5"
            status_title = "🎉 CHUYẾN ĐI ĐÃ HOÀN THÀNH"
            intro = f"Cảm ơn bạn đã đồng hành cùng Tourism trong chuyến đi <strong>{booking.tour.name}</strong>. Bạn đã có thể truy cập trang tour để viết đánh giá 5 sao chia sẻ trải nghiệm nhé!"
        else:
            subject = f"[Tourism] Thông báo HUỶ đơn đặt tour {code_str}"
            badge_color = "#ef4444"
            status_title = "❌ ĐƠN ĐẶT TOUR ĐÃ ĐƯỢC HUỶ"
            intro = f"Đơn đặt tour <strong>{booking.tour.name}</strong> (mã <strong>{code_str}</strong>, ngày đi <strong>{travel_str}</strong>) đã được huỷ trên hệ thống."
            if refund_note:
                intro += f"<br/><br/>💰 <strong>Thông tin hoàn tiền:</strong> {refund_note}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 14px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #4f46e5; margin: 0;">🌍 Tourism Vietnam</h2>
          </div>
          <div style="padding: 20px 0;">
            <div style="display: inline-block; background: {badge_color}; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 14px;">
              {status_title}
            </div>
            <p style="color: #1e293b; font-size: 15px;">Xin chào <strong>{booking.contact_name}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.6;">{intro}</p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-top: 16px; font-size: 13px; color: #334155; line-height: 1.8;">
              <div>• Mã đơn: <strong>#{booking.id} ({code_str})</strong></div>
              <div>• Tuyến tour: <strong>{booking.tour.name}</strong></div>
              <div>• Ngày khởi hành: <strong>{travel_str}</strong></div>
              <div>• Tổng tiền: <strong style="color: #dc2626;">{price_fmt}</strong></div>
            </div>
          </div>
          <div style="text-align: center; padding-top: 14px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
            © 2026 Tourism Project. Hotline hỗ trợ 24/7: 1900 6868
          </div>
        </div>
        """
        plain_body = f"Xin chào {booking.contact_name},\n{status_title}\nMã đơn: {code_str}\nTour: {booking.tour.name}\nNgày khởi hành: {travel_str}\nTổng tiền: {price_fmt}\n{refund_note}"
        from_addr = f"Tourism System <{settings.EMAIL_HOST_USER}>" if getattr(settings, 'EMAIL_HOST_USER', None) else getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tourism.vn')
        msg = EmailMultiAlternatives(subject, plain_body, from_addr, [booking.contact_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)
    except Exception:
        pass


# ─────────────────────────────────────────────────────────────────────────────
# Customer ViewSet – mỗi user chỉ thấy booking của chính mình
# ─────────────────────────────────────────────────────────────────────────────
class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý toàn bộ CRUD booking.
    - Khách vãng lai (chưa đăng nhập) có thể tạo đơn mới (create) và thanh toán ngay lúc đặt (pay).
      Hệ thống tự động tạo tài khoản và gửi thông tin đăng nhập qua Email cho khách vãng lai.
    - Xem danh sách đơn (list), xem chi tiết (retrieve) và huỷ đơn (cancel) bắt buộc phải đăng nhập (IsAuthenticated),
      mỗi tài khoản chỉ truy cập được đơn của chính mình.
    """

    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        """Chỉ mở create và pay tại bước đặt tour cho khách vãng lai; xem/huỷ đơn bắt buộc đăng nhập."""
        if self.action in ['create', 'pay']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """Mỗi user chỉ thấy và thao tác trên booking của chính họ."""
        if self.request.user and self.request.user.is_authenticated:
            return Booking.objects.filter(user=self.request.user).select_related('tour')
        if self.action == 'pay':
            return Booking.objects.filter(status=Booking.STATUS_PENDING).select_related('tour')
        return Booking.objects.none()

    def get_serializer_class(self):
        """Dùng serializer khác nhau cho create vs list/retrieve."""
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingListSerializer

    def create(self, request, *args, **kwargs):
        """POST /api/bookings/bookings/ – Tạo booking mới (cho cả Khách hàng và Khách vãng lai)."""
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

    @action(detail=False, methods=['get'], url_path='lookup', permission_classes=[permissions.AllowAny])
    def lookup(self, request):
        """
        GET /api/bookings/bookings/lookup/?phone=...&code=...
        Tra cứu đơn đặt tour dành cho khách vãng lai qua Số điện thoại hoặc Mã đơn/Mã tra cứu.
        """
        phone = str(request.query_params.get('phone', '')).strip()
        code = str(request.query_params.get('code', '')).strip()

        if not phone and not code:
            return Response(
                {'error': 'Vui lòng cung cấp Số điện thoại hoặc Mã tra cứu đơn.'},
                status=400
            )

        # Chỉ khớp theo Số điện thoại liên hệ hoặc Mã đơn chuẩn (BK...), không cho dò theo ID 1, 2, 3
        q = Q()
        if phone:
            q |= Q(contact_phone=phone)
        if code:
            q |= Q(booking_code__iexact=code)

        qs = Booking.objects.filter(q).select_related('tour').order_by('-created_at')
        serializer = BookingListSerializer(qs, many=True, context={'request': request})
        return Response({
            'count': qs.count(),
            'results': serializer.data,
        })

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """
        POST /api/bookings/bookings/{id}/cancel/ – Huỷ booking (Yêu cầu đã đăng nhập đúng tài khoản chủ đơn).
        Áp dụng chính sách:
        - Chỉ được huỷ trực tuyến trước giờ khởi hành ít nhất 24 giờ.
        - Nếu đơn đã thanh toán (confirmed), tự động ghi nhận yêu cầu hoàn tiền 100%.
        """
        import re
        from datetime import time as dt_time

        booking = self.get_object()

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({'detail': 'Đơn đặt tour này đã được huỷ trước đó.'}, status=400)

        if booking.status == Booking.STATUS_COMPLETED:
            return Response({'detail': 'Không thể huỷ chuyến đi đã hoàn thành.'}, status=400)

        # Kiểm tra hạn huỷ trước 24 giờ so với giờ khởi hành của tour
        if booking.travel_date:
            now_local = timezone.localtime()
            dep_hour, dep_min = 8, 0
            tour = booking.tour
            if tour and isinstance(getattr(tour, 'itinerary', None), list) and len(tour.itinerary) > 0:
                first_time_str = str(tour.itinerary[0].get('time', '') if isinstance(tour.itinerary[0], dict) else '')
                match_time = re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', first_time_str)
                if match_time:
                    dep_hour = int(match_time.group(1))
                    dep_min = int(match_time.group(2))

            dep_naive = datetime.combine(booking.travel_date, dt_time(dep_hour, dep_min))
            dep_aware = timezone.make_aware(dep_naive, timezone.get_current_timezone())

            if dep_aware < now_local:
                return Response(
                    {'detail': 'Không thể huỷ đơn đặt tour có thời gian khởi hành đã qua.'},
                    status=400
                )

            if (dep_aware - now_local) < timedelta(hours=24):
                return Response(
                    {
                        'detail': (
                            f'Theo chính sách hoàn huỷ, quý khách chỉ có thể huỷ trực tuyến trước giờ khởi hành ({dep_hour:02d}:{dep_min:02d} ngày {booking.travel_date.strftime("%d/%m/%Y")}) '
                            f'ít nhất 24 giờ. Vui lòng liên hệ Hotline 1900 6868 để được hỗ trợ trực tiếp.'
                        )
                    },
                    status=400
                )

        was_confirmed = (booking.status == Booking.STATUS_CONFIRMED)
        refund_note = ''
        update_fields = ['status', 'updated_at']

        if was_confirmed:
            price_fmt = f"{int(booking.total_price):,} ₫".replace(',', '.')
            refund_note = f"Hoàn tiền 100% ({price_fmt}) do huỷ đơn trước hạn 24h."
            tag_refund = f"[Đã huỷ trước hạn 24h - Hoàn tiền 100%: {price_fmt}]"
            booking.special_request = f"{booking.special_request} {tag_refund}".strip() if booking.special_request else tag_refund
            update_fields.append('special_request')

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=update_fields)

        send_booking_status_email(booking, 'cancelled', refund_note=refund_note)

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

        method = str(request.data.get('method', 'bank_transfer')).strip()[:40]
        if not booking.special_request:
            booking.special_request = f'[Thanh toán: {method}]'
        else:
            booking.special_request = f'{booking.special_request} [Thanh toán: {method}]'

        booking.status = Booking.STATUS_CONFIRMED
        booking.save(update_fields=['status', 'special_request', 'updated_at'])

        send_booking_status_email(booking, 'confirmed')

        out = BookingListSerializer(booking, context={'request': request})
        return Response({
            'booking': out.data,
            'message': 'Thanh toán thành công! Đơn của bạn đã được xác nhận.',
        })


# ─────────────────────────────────────────────────────────────────────────────
# Phân trang đơn đặt tour cho Admin/HDV
# ─────────────────────────────────────────────────────────────────────────────
class AdminBookingPagination(PageNumberPagination):
    """Pagination cho Admin / HDV quản lý đơn đặt tour."""
    page_size             = 15
    page_size_query_param = 'page_size'
    max_page_size         = 100


# ─────────────────────────────────────────────────────────────────────────────
# Admin ViewSet – xem và quản lý TẤT CẢ đơn
# ─────────────────────────────────────────────────────────────────────────────
class AdminBookingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet dành cho Admin/Staff quản lý toàn bộ đơn đặt tour.
    - Admin (is_superuser): xem và xử lý toàn bộ đơn + chuyển HDV phụ trách.
    - HDV (is_staff): chỉ xem và xử lý đơn được gán cho mình (assigned_guide=me)
                      hoặc tour mình phụ trách mà chưa được gán cụ thể (fallback).
    """
    permission_classes = [IsStaffOrSuperUser]
    serializer_class   = AdminBookingSerializer
    pagination_class   = AdminBookingPagination

    def get_queryset(self):
        """
        Lấy danh sách booking:
        - Admin: xem tất cả, có thể lọc thêm theo HDV.
        - HDV: chỉ thấy đơn được gán mình (assigned_guide=me)
               HOẶC đơn chưa có assigned_guide nhưng tour do mình dẫn.
        """
        qs = Booking.objects.select_related(
            'user', 'tour', 'tour__guide', 'assigned_guide'
        ).order_by('-created_at')

        user = self.request.user
        if not user.is_superuser:
            # HDV: lấy đơn được gán trực tiếp hoặc fallback theo tour.guide
            qs = qs.filter(
                Q(assigned_guide=user)
                | Q(assigned_guide__isnull=True, tour__guide=user)
            )
        else:
            # Admin: có thể lọc thêm theo HDV cụ thể
            guide_filter = self.request.query_params.get('guide', '')
            if guide_filter:
                qs = qs.filter(assigned_guide_id=guide_filter)

        # Lọc theo trạng thái
        status_filter = self.request.query_params.get('status', '')
        if status_filter:
            qs = qs.filter(status=status_filter)

        # Tìm kiếm theo tên khách, SĐT, tên tour, mã đơn
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(contact_name__icontains=search)
                | Q(contact_phone__icontains=search)
                | Q(contact_email__icontains=search)
                | Q(booking_code__icontains=search)
                | Q(tour__name__icontains=search)
                | Q(user__username__icontains=search)
            )

        return qs

    @action(detail=False, methods=['get'], url_path='status-counts')
    def status_counts(self, request):
        """
        GET /api/bookings/admin/bookings/status-counts/
        Trả về tổng số đơn theo từng trạng thái (toàn bộ, không phân trang),
        tôn trọng quyền Admin / HDV và bộ lọc tìm kiếm / HDV.
        """
        user = request.user
        qs = Booking.objects.all()

        if not user.is_superuser:
            qs = qs.filter(
                Q(assigned_guide=user)
                | Q(assigned_guide__isnull=True, tour__guide=user)
            )
        else:
            guide_filter = request.query_params.get('guide', '')
            if guide_filter:
                qs = qs.filter(assigned_guide_id=guide_filter)

        search = request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(contact_name__icontains=search)
                | Q(contact_phone__icontains=search)
                | Q(contact_email__icontains=search)
                | Q(booking_code__icontains=search)
                | Q(tour__name__icontains=search)
                | Q(user__username__icontains=search)
            )

        counts = qs.values('status').annotate(count=Count('id'))
        res = {item['status']: item['count'] for item in counts}
        res['all'] = qs.count()
        return Response(res)

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/confirm/ – Xác nhận đơn (Chỉ từ trạng thái pending -> confirmed)."""
        booking = self.get_object()

        if booking.status != Booking.STATUS_PENDING:
            return Response(
                {'detail': 'Chỉ có thể xác nhận đơn đang ở trạng thái Chờ xác nhận.'},
                status=400
            )

        booking.status = Booking.STATUS_CONFIRMED
        booking.save(update_fields=['status', 'updated_at'])
        send_booking_status_email(booking, 'confirmed')
        return Response(AdminBookingSerializer(booking).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/complete/ – Hoàn thành đơn."""
        booking = self.get_object()

        if booking.status != Booking.STATUS_CONFIRMED:
            return Response({'detail': 'Chỉ có thể hoàn thành đơn đã xác nhận.'}, status=400)

        if booking.travel_date and booking.travel_date > timezone.localdate():
            return Response({'detail': 'Chưa đến ngày khởi hành của chuyến đi, chưa thể đánh dấu hoàn thành.'}, status=400)

        booking.status = Booking.STATUS_COMPLETED
        booking.save(update_fields=['status', 'updated_at'])
        send_booking_status_email(booking, 'completed')
        return Response(AdminBookingSerializer(booking).data)

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel(self, request, pk=None):
        """POST /api/bookings/admin/bookings/{id}/cancel/ – Huỷ đơn bởi Admin/HDV."""
        booking = self.get_object()

        if booking.status in [Booking.STATUS_CANCELLED, Booking.STATUS_COMPLETED]:
            return Response({'detail': 'Không thể huỷ đơn đã hoàn thành hoặc đã huỷ.'}, status=400)

        was_confirmed = (booking.status == Booking.STATUS_CONFIRMED)
        refund_note = ''
        update_fields = ['status', 'updated_at']
        if was_confirmed:
            price_fmt = f"{int(booking.total_price):,} ₫".replace(',', '.')
            refund_note = f"Hoàn tiền 100% ({price_fmt}) theo xác nhận từ Quản trị viên."
            tag_refund = f"[Admin huỷ đơn - Hoàn tiền 100%: {price_fmt}]"
            booking.special_request = f"{booking.special_request} {tag_refund}".strip() if booking.special_request else tag_refund
            update_fields.append('special_request')

        booking.status = Booking.STATUS_CANCELLED
        booking.save(update_fields=update_fields)
        send_booking_status_email(booking, 'cancelled', refund_note=refund_note)
        return Response(AdminBookingSerializer(booking).data)

    @action(detail=True, methods=['post'], url_path='reassign')
    def reassign(self, request, pk=None):
        """
        POST /api/bookings/admin/bookings/{id}/reassign/
        Body: { "guide_id": <int> }
        Chỉ Admin (is_superuser) mới có quyền chuyển HDV phụ trách đơn.
        """
        if not request.user.is_superuser:
            return Response(
                {'detail': 'Chỉ Quản trị viên mới có quyền chuyển HDV phụ trách.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        booking = self.get_object()
        guide_id = request.data.get('guide_id')

        if guide_id is None:
            return Response({'detail': 'Vui lòng cung cấp guide_id.'}, status=400)

        if str(guide_id) == '':
            # Truyền guide_id rỗng = xoá HDV, không gán ai
            booking.assigned_guide = None
            booking.save(update_fields=['assigned_guide', 'updated_at'])
            return Response(AdminBookingSerializer(booking).data)

        from accounts.models import User
        try:
            guide = User.objects.get(pk=guide_id, is_staff=True)
        except User.DoesNotExist:
            return Response({'detail': 'Không tìm thấy HDV hợp lệ với ID này.'}, status=400)

        booking.assigned_guide = guide
        booking.save(update_fields=['assigned_guide', 'updated_at'])

        guide_name = f"{guide.first_name} {guide.last_name}".strip() or guide.username
        return Response({
            **AdminBookingSerializer(booking).data,
            '_message': f'Đã chuyển đơn #{booking.id} cho HDV {guide_name}.',
        })


# ─────────────────────────────────────────────────────────────────────────────
# Stats API – thống kê dashboard
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsStaffOrSuperUser])
def dashboard_stats(request):
    """
    GET /api/bookings/stats/
    Trả về toàn bộ số liệu thống kê cho Dashboard:
    - Admin: xem toàn bộ hệ thống
    - Nhân viên (Staff/HDV): chỉ xem số liệu các tour do mình dẫn (tour__guide=request.user)
    """
    from tours.models import Tour
    from accounts.models import User

    now = timezone.now()
    user = request.user
    is_admin = user.is_superuser

    # Lọc dữ liệu cơ sở theo vai trò
    if is_admin:
        base_bookings   = Booking.objects.all()
        total_tours     = Tour.objects.filter(is_active=True).count()
        total_customers = User.objects.filter(is_staff=False, is_superuser=False).count()
    else:
        # HDV: đơn được gán trực tiếp hoặc fallback theo tour.guide nếu chưa có assigned_guide
        base_bookings = Booking.objects.filter(
            Q(assigned_guide=user)
            | Q(assigned_guide__isnull=True, tour__guide=user)
        )
        total_tours     = Tour.objects.filter(guide=user, is_active=True).count()
        total_customers = base_bookings.exclude(user__isnull=True).values('user').distinct().count()

    # ── Tổng quan ────────────────────────────────────────────
    total_bookings = base_bookings.count()
    total_revenue  = base_bookings.filter(
        status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED]
    ).aggregate(total=Sum('total_price'))['total'] or 0

    # Đơn tháng này
    bookings_this_month = base_bookings.filter(
        created_at__year=now.year,
        created_at__month=now.month,
    ).count()

    # Doanh thu tháng này
    revenue_this_month = base_bookings.filter(
        created_at__year=now.year,
        created_at__month=now.month,
        status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED],
    ).aggregate(total=Sum('total_price'))['total'] or 0

    # ── Phân bổ trạng thái ───────────────────────────────────
    status_counts = base_bookings.values('status').annotate(count=Count('id'))
    status_map    = {item['status']: item['count'] for item in status_counts}

    # ── Doanh thu theo tháng (12 tháng gần nhất) ────────────
    twelve_months_ago = now - timedelta(days=365)
    monthly_revenue_qs = (
        base_bookings
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

    # ── Top 5 tour được đặt nhiều nhất (Chỉ tính đơn hợp lệ: confirmed / completed) ──
    top_tours_qs = (
        base_bookings
        .filter(status__in=[Booking.STATUS_CONFIRMED, Booking.STATUS_COMPLETED])
        .values('tour__id', 'tour__name', 'tour__thumbnail')
        .annotate(
            total_bookings=Count('id'),
            total_revenue=Sum('total_price'),
        )
        .order_by('-total_bookings', '-total_revenue')[:5]
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
        base_bookings.select_related('user', 'tour').order_by('-created_at')[:5],
        many=True,
    ).data

    # ── Danh sách các tour cần đẩy Sale gấp (Cảnh báo từ HDV) ──
    priority_qs = Tour.objects.filter(is_priority_sale=True, is_active=True).select_related('guide')
    if not is_admin:
        priority_qs = priority_qs.filter(guide=user)

    priority_sale_tours = []
    for t in priority_qs[:10]:
        t_bookings = t.bookings.exclude(status=Booking.STATUS_CANCELLED)
        target = t.target_participants or 20
        booked = sum(b.num_adults + b.num_children for b in t_bookings)
        remaining = max(0, target - booked)
        fill = min(100, round((booked / target) * 100)) if target > 0 else 100
        
        last_alert_str = None
        if t.last_sale_alert_at:
            local_dt = timezone.localtime(t.last_sale_alert_at)
            last_alert_str = local_dt.strftime('%H:%M %d/%m/%Y')

        g_name = None
        if t.guide:
            full = f"{t.guide.first_name} {t.guide.last_name}".strip()
            g_name = full if full else t.guide.username

        priority_sale_tours.append({
            'id': t.id,
            'name': t.name,
            'thumbnail': t.thumbnail,
            'price_adult': float(t.price_adult),
            'guide_name': g_name,
            'target_participants': target,
            'current_booked_guests': booked,
            'remaining_needed': remaining,
            'fill_rate': fill,
            'last_sale_alert_at': t.last_sale_alert_at.isoformat() if t.last_sale_alert_at else None,
            'last_sale_alert_display': last_alert_str,
        })

    return Response({
        'is_scoped': not is_admin,
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
        'priority_sale_tours': priority_sale_tours,
    })


# ─────────────────────────────────────────────────────────────────────────────
# CONSULTATION VIEWSETS
# ─────────────────────────────────────────────────────────────────────────────
class ConsultationViewSet(viewsets.ModelViewSet):
    """
    Customer ViewSet tiếp nhận yêu cầu tư vấn.
    - create: Cho phép bất kỳ ai (AllowAny) gửi yêu cầu tư vấn.
    - list / retrieve: Khách hàng đã đăng nhập có thể xem lịch sử các yêu cầu của mình.
    """
    http_method_names = ['get', 'post', 'head', 'options']

    def get_permissions(self):
        if self.action == 'create':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'create':
            return ConsultationCreateSerializer
        return ConsultationCustomerSerializer

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated:
            return ConsultationRequest.objects.filter(user=self.request.user).select_related('tour')
        return ConsultationRequest.objects.none()


class AdminConsultationViewSet(viewsets.ModelViewSet):
    """
    Admin & Staff ViewSet quản lý các yêu cầu tư vấn của khách hàng.
    - Admin (is_superuser): xem toàn bộ yêu cầu, đổi trạng thái, ghi chú, gán HDV.
    - HDV / Nhân viên (is_staff): chỉ xem các yêu cầu thuộc tour của mình hoặc được gán cho mình.
    """
    permission_classes = [IsStaffOrSuperUser]
    pagination_class = AdminBookingPagination

    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AdminConsultationUpdateSerializer
        return AdminConsultationSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ConsultationRequest.objects.select_related(
            'tour', 'tour__guide', 'tour__destination', 'assigned_to', 'user'
        )

        if not user.is_superuser:
            # HDV / Nhân viên thường chỉ thấy tour do mình phụ trách hoặc được phân công trực tiếp
            qs = qs.filter(Q(assigned_to=user) | Q(tour__guide=user))

        # Filter theo trạng thái
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        # Search theo tên khách, sđt, email, tên tour, ghi chú
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(customer_name__icontains=search)
                | Q(phone__icontains=search)
                | Q(email__icontains=search)
                | Q(tour__name__icontains=search)
                | Q(admin_note__icontains=search)
            )

        return qs.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Thống kê số lượng yêu cầu tư vấn theo từng trạng thái."""
        user = request.user
        qs = ConsultationRequest.objects.all()
        if not user.is_superuser:
            qs = qs.filter(Q(assigned_to=user) | Q(tour__guide=user))

        counts = qs.values('status').annotate(count=Count('id'))
        res = {item['status']: item['count'] for item in counts}
        res['all'] = qs.count()
        res['pending'] = res.get(ConsultationRequest.STATUS_PENDING, 0)
        res['contacted'] = res.get(ConsultationRequest.STATUS_CONTACTED, 0)
        res['resolved'] = res.get(ConsultationRequest.STATUS_RESOLVED, 0)
        res['cancelled'] = res.get(ConsultationRequest.STATUS_CANCELLED, 0)
        return Response(res)

    @action(detail=True, methods=['post'], url_path='claim')
    def claim(self, request, pk=None):
        """HDV hoặc Admin tự nhận phụ trách ca tư vấn này."""
        item = self.get_object()
        item.assigned_to = request.user
        if item.status == ConsultationRequest.STATUS_PENDING:
            item.status = ConsultationRequest.STATUS_CONTACTED
        item.save(update_fields=['assigned_to', 'status', 'updated_at'])
        return Response(AdminConsultationSerializer(item).data)


