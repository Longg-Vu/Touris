import uuid
from django.db.models import Q, Count
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response

from accounts.permissions import IsStaffOrSuperUser
from tours.models import Tour
from .models import ChatSession, ChatMessage
from .serializers import (
    ChatMessageSerializer,
    ChatSessionSerializer,
    AdminChatSessionSerializer,
)
from .bot_engine import ensure_welcome_message, process_customer_message


# ─────────────────────────────────────────────────────────────────────────────
# CUSTOMER / PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def init_chat_session(request):
    """
    POST /api/chat/init/
    Khởi tạo hoặc tải lại phiên chat của khách hàng:
    - Nếu đã đăng nhập: Tìm phiên chat của chính user này. Nếu chưa có thì tạo mới độc lập.
      Không gộp hay dùng chung session của khách vãng lai hoặc tài khoản khác.
    - Nếu là khách vãng lai: Sử dụng session_id độc lập cho trình duyệt,
      tuyệt đối không cho phép truy cập phiên chat của user đã đăng nhập.
    """
    client_session_id = request.data.get('session_id')
    tour_id = request.data.get('tour_id')
    session = None

    if request.user and request.user.is_authenticated:
        # 1. User đã đăng nhập:
        # Ưu tiên lấy phiên chat đã có của user này trong DB
        session = ChatSession.objects.filter(user=request.user).first()

        if not session:
            # Nếu user chưa từng có phiên chat nào:
            if client_session_id:
                existing = ChatSession.objects.filter(session_id=client_session_id).first()
                if existing is None:
                    # Mã này chưa có trong DB -> tạo phiên mới cho user này
                    session = ChatSession.objects.create(session_id=client_session_id, user=request.user)
                elif existing.user == request.user:
                    session = existing
                # Nếu existing là của khách vãng lai (user is None) hoặc user khác:
                # Không gộp session vãng lai vào tài khoản để tránh lẫn tin nhắn
            
            if not session:
                new_session_id = f"cs_u{request.user.id}_{uuid.uuid4().hex[:12]}"
                session = ChatSession.objects.create(session_id=new_session_id, user=request.user)

        # Cập nhật thông tin profile mới nhất của user
        full = f"{request.user.first_name} {request.user.last_name or ''}".strip()
        session.customer_name = full if full else request.user.username
        if request.user.email:
            session.customer_email = request.user.email
        if hasattr(request.user, 'phone') and request.user.phone:
            session.customer_phone = request.user.phone

    else:
        # 2. Khách vãng lai (Guest):
        if not client_session_id:
            client_session_id = f"cs_guest_{uuid.uuid4().hex[:14]}"

        existing = ChatSession.objects.filter(session_id=client_session_id).first()
        if existing:
            # Nếu session_id này thuộc về user đã đăng nhập:
            # Chặn tuyệt đối, sinh session_id mới cho khách vãng lai
            if existing.user is not None:
                new_guest_id = f"cs_guest_{uuid.uuid4().hex[:14]}"
                session = ChatSession.objects.create(session_id=new_guest_id, user=None)
            else:
                session = existing
        else:
            session = ChatSession.objects.create(session_id=client_session_id, user=None)

    # Cập nhật thông tin tour đang xem nếu có
    if tour_id:
        try:
            tour = Tour.objects.filter(pk=tour_id, is_active=True).first()
            if tour:
                session.current_tour = tour
                # Nếu tour có HDV chính và session chưa gán ai, tự động phân công thông minh
                if tour.guide and not session.assigned_to:
                    session.assigned_to = tour.guide
        except Exception:
            pass

    session.save()

    # Sinh tin nhắn chào mừng kèm gợi ý câu hỏi nếu phiên mới
    ensure_welcome_message(session)

    # Đánh dấu khách đã xem tin nhắn
    if session.unread_customer_count > 0:
        session.unread_customer_count = 0
        session.save(update_fields=['unread_customer_count'])

    return Response(ChatSessionSerializer(session).data)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def send_customer_message(request):
    """
    POST /api/chat/messages/
    Khách hàng gửi tin nhắn vào phiên chat.
    Hệ thống lưu tin nhắn và kích hoạt Bot Engine phân tích phản hồi ngay lập tức.
    """
    session_id = request.data.get('session_id')
    message_text = str(request.data.get('message', '')).strip()

    if not session_id or not message_text:
        return Response({'detail': 'session_id and message are required.'}, status=400)

    try:
        session = ChatSession.objects.get(session_id=session_id)
    except ChatSession.DoesNotExist:
        return Response({'detail': 'Phiên chat không tồn tại.'}, status=404)

    # Phân quyền bảo vệ phiên chat:
    if request.user and request.user.is_authenticated:
        if session.user and session.user != request.user:
            return Response({'detail': 'Bạn không có quyền gửi tin nhắn vào phiên chat của tài khoản khác.'}, status=403)
        if session.user is None:
            session.user = request.user
    else:
        if session.user is not None:
            return Response({'detail': 'Phiên chat này thuộc về tài khoản đã đăng nhập.'}, status=403)

    # Cập nhật thông tin khách nếu có truyền thêm
    cust_phone = request.data.get('customer_phone')
    if cust_phone:
        session.customer_phone = cust_phone.strip()
    cust_name = request.data.get('customer_name')
    if cust_name:
        session.customer_name = cust_name.strip()

    # Cập nhật tour đang xem nếu khách gửi từ trang tour cụ thể
    tour_id = request.data.get('tour_id')
    if tour_id:
        try:
            tour = Tour.objects.filter(pk=tour_id, is_active=True).first()
            if tour:
                session.current_tour = tour
                if tour.guide and not session.assigned_to:
                    session.assigned_to = tour.guide
        except Exception:
            pass
    session.save()

    # 1. Lưu tin nhắn của khách
    user_msg = ChatMessage.objects.create(
        session=session,
        sender_type=ChatMessage.SENDER_CUSTOMER,
        message=message_text,
        message_type='text',
    )

    # 2. Xử lý Bot thông minh (trả lời hoặc chuyển tiếp)
    process_customer_message(session, message_text)

    # 3. Trả về toàn bộ messages mới nhất
    all_msgs = session.messages.all()
    return Response({
        'session_id': session.session_id,
        'status': session.status,
        'messages': ChatMessageSerializer(all_msgs, many=True).data,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_customer_messages(request):
    """
    GET /api/chat/messages/?session_id=xxx&after_id=yyy
    Polling lấy tin nhắn mới phía khách hàng.
    """
    session_id = request.query_params.get('session_id')
    if not session_id:
        return Response({'detail': 'session_id is required.'}, status=400)

    try:
        session = ChatSession.objects.get(session_id=session_id)
    except ChatSession.DoesNotExist:
        return Response({'detail': 'Phiên chat không tồn tại.'}, status=404)

    # Kiểm tra phân quyền:
    if request.user and request.user.is_authenticated:
        if session.user and session.user != request.user:
            return Response({'detail': 'Bạn không có quyền xem phiên chat của tài khoản khác.'}, status=403)
    else:
        if session.user is not None:
            return Response({'detail': 'Phiên chat này thuộc về tài khoản đã đăng nhập.'}, status=403)

    qs = session.messages.all()
    after_id = request.query_params.get('after_id')
    if after_id:
        try:
            qs = qs.filter(id__gt=int(after_id))
        except ValueError:
            pass

    # Reset unread phía khách
    if session.unread_customer_count > 0:
        session.unread_customer_count = 0
        session.save(update_fields=['unread_customer_count'])

    return Response({
        'session_id': session.session_id,
        'status': session.status,
        'messages': ChatMessageSerializer(qs, many=True).data,
    })


# ─────────────────────────────────────────────────────────────────────────────
# ADMIN & STAFF VIEWSET
# ─────────────────────────────────────────────────────────────────────────────
class AdminChatSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý Live Chat dành cho Admin và Hướng dẫn viên.
    - Admin: Xem toàn bộ các phiên chat.
    - HDV: Xem các phiên chat thuộc tour của mình hoặc được gán cho mình.
    """
    permission_classes = [IsStaffOrSuperUser]
    serializer_class = AdminChatSessionSerializer

    def get_queryset(self):
        user = self.request.user
        qs = ChatSession.objects.select_related('current_tour', 'assigned_to', 'user')

        if not user.is_superuser:
            # HDV / Staff chỉ thấy chat thuộc tour mình quản lý hoặc được gán
            qs = qs.filter(Q(assigned_to=user) | Q(current_tour__guide=user))

        # Filter theo trạng thái
        status_param = self.request.query_params.get('status')
        if status_param and status_param != 'all':
            qs = qs.filter(status=status_param)

        # Search theo tên, SĐT, tour
        search = self.request.query_params.get('search')
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(customer_name__icontains=search)
                | Q(customer_phone__icontains=search)
                | Q(customer_email__icontains=search)
                | Q(current_tour__name__icontains=search)
            )

        return qs.order_by('-updated_at')

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Thống kê các phiên chat."""
        user = request.user
        qs = ChatSession.objects.all()
        if not user.is_superuser:
            qs = qs.filter(Q(assigned_to=user) | Q(current_tour__guide=user))

        all_count = qs.count()
        waiting_count = qs.filter(status=ChatSession.STATUS_WAITING_STAFF).count()
        active_count = qs.filter(status=ChatSession.STATUS_ACTIVE).count()
        resolved_count = qs.filter(status=ChatSession.STATUS_RESOLVED).count()
        unread_messages = sum(qs.values_list('unread_staff_count', flat=True))

        return Response({
            'all': all_count,
            'waiting_staff': waiting_count,
            'active': active_count,
            'resolved': resolved_count,
            'unread_messages': unread_messages,
        })

    @action(detail=True, methods=['get'], url_path='messages')
    def get_session_messages(self, request, pk=None):
        """Lấy toàn bộ tin nhắn của một phiên chat."""
        session = self.get_object()
        # Đánh dấu đã đọc phía staff
        if session.unread_staff_count > 0:
            session.unread_staff_count = 0
            session.save(update_fields=['unread_staff_count'])

        messages = session.messages.all()
        return Response({
            'session': AdminChatSessionSerializer(session).data,
            'messages': ChatMessageSerializer(messages, many=True).data,
        })

    @action(detail=True, methods=['post'], url_path='reply')
    def reply(self, request, pk=None):
        """
        Nhân viên / HDV gõ trả lời trực tiếp cho khách hàng.
        """
        session = self.get_object()
        message_text = str(request.data.get('message', '')).strip()
        if not message_text:
            return Response({'detail': 'Nội dung tin nhắn không được để trống.'}, status=400)

        # Gán nhân viên phụ trách nếu chưa có
        if not session.assigned_to:
            session.assigned_to = request.user

        session.status = ChatSession.STATUS_ACTIVE
        session.unread_customer_count += 1
        session.unread_staff_count = 0
        session.save(update_fields=['assigned_to', 'status', 'unread_customer_count', 'unread_staff_count', 'updated_at'])

        msg = ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_STAFF,
            sender_user=request.user,
            message=message_text,
            message_type='text',
        )

        return Response(ChatMessageSerializer(msg).data)

    @action(detail=True, methods=['post'], url_path='resolve')
    def resolve(self, request, pk=None):
        """Đóng / Hoàn tất phiên hỗ trợ."""
        session = self.get_object()
        session.status = ChatSession.STATUS_RESOLVED
        session.unread_staff_count = 0
        session.save(update_fields=['status', 'unread_staff_count', 'updated_at'])

        # Bot gửi tin nhắn kết thúc thân thiện
        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message="✅ Cuộc trò chuyện đã được hoàn tất hỗ trợ. Cảm ơn bạn đã lựa chọn Tourism Vietnam! Chúc bạn có một ngày thật tuyệt vời ❤️",
            message_type='text',
        )

        return Response(AdminChatSessionSerializer(session).data)
