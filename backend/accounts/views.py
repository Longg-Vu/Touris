from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q, Value, DecimalField
from django.db.models.functions import Coalesce
from rest_framework import generics, status, viewsets, filters, permissions
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .permissions import IsSuperUser, IsStaffOrSuperUser
from .serializers import (
    RegisterSerializer, UserSerializer, GoogleAuthSerializer, ChangePasswordSerializer,
    AdminUserListSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer,
    AdminResetUserPasswordSerializer, GuideSerializer,
)
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import os

User = get_user_model()



def get_tokens_for_user(user):
    """Tạo JWT access + refresh token cho user."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access':  str(refresh.access_token),
    }


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Đăng ký tài khoản mới. Trả về user info + JWT tokens.
    """
    queryset           = User.objects.all()
    serializer_class   = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user   = serializer.save()
        tokens = get_tokens_for_user(user)
        return Response({
            'user':    UserSerializer(user).data,
            'tokens':  tokens,
            'message': 'Đăng ký thành công!',
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/auth/profile/ → Xem thông tin cá nhân
    PATCH /api/auth/profile/ → Cập nhật thông tin cá nhân
    """
    serializer_class   = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class GoogleLoginView(APIView):
    """
    POST /api/auth/google/
    Xác thực Google credential → trả về JWT.
    Tự động tạo tài khoản nếu email chưa tồn tại.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credential = serializer.validated_data['credential']

        try:
            # pyrefly: ignore [missing-import]
            from google.oauth2 import id_token
            # pyrefly: ignore [missing-import]
            from google.auth.transport import requests as g_requests

            CLIENT_ID = os.getenv(
                'GOOGLE_CLIENT_ID',
                '392835893354-su3glrrmq6vjlncef8bigi24b2fqajm7.apps.googleusercontent.com'
            ).strip()
            id_info = id_token.verify_oauth2_token(
                credential,
                g_requests.Request(),
                CLIENT_ID or None,
                clock_skew_in_seconds=10,
            )

            email      = id_info.get('email', '').strip().lower()
            first_name = id_info.get('given_name', '').strip()
            last_name  = id_info.get('family_name', '').strip()
            avatar     = id_info.get('picture', '').strip()

            if not email:
                return Response({'error': 'Không lấy được email từ Google.'}, status=400)

            # Kiểm tra tài khoản đã tồn tại theo email (không phân biệt hoa thường)
            existing_user = User.objects.filter(email__iexact=email).first()
            if existing_user:
                user = existing_user
                created = False
                if not user.is_active:
                    return Response(
                        {'error': 'Tài khoản này hiện đang bị khóa. Vui lòng liên hệ quản trị viên.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                update_fields = []
                if avatar and user.avatar != avatar:
                    user.avatar = avatar
                    update_fields.append('avatar')
                if first_name and not user.first_name:
                    user.first_name = first_name
                    update_fields.append('first_name')
                if last_name and not user.last_name:
                    user.last_name = last_name
                    update_fields.append('last_name')
                if update_fields:
                    user.save(update_fields=update_fields)
            else:
                # Tự động sinh username duy nhất nếu phần trước @ bị trùng
                base_uname = email.split('@')[0]
                uname = base_uname
                counter = 1
                while User.objects.filter(username__iexact=uname).exists():
                    uname = f"{base_uname}{counter}"
                    counter += 1

                user = User(
                    username=uname,
                    email=email,
                    first_name=first_name,
                    last_name=last_name,
                    avatar=avatar,
                )
                user.set_unusable_password()
                user.save()
                created = True

            tokens = get_tokens_for_user(user)
            return Response({
                'user':    UserSerializer(user).data,
                'tokens':  tokens,
                'created': created,
                'message': 'Đăng nhập Google thành công!',
            })

        except ValueError as e:
            return Response({'error': f'Token Google không hợp lệ: {str(e)}'}, status=400)
        except ImportError:
            return Response({'error': 'Thư viện google-auth chưa được cài đặt trên server.'}, status=500)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Đổi mật khẩu. Cần đăng nhập.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Mật khẩu hiện tại không đúng.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'message': 'Đổi mật khẩu thành công!'}, status=status.HTTP_200_OK)


# ─────────────────────────────────────────────────────────────────────────────
# Admin User Management – CRUD & Quản trị người dùng cho Staff / Superuser
# ─────────────────────────────────────────────────────────────────────────────

class AdminUserPagination(PageNumberPagination):
    """Pagination cho danh sách người dùng trong trang quản trị."""
    page_size             = 20
    page_size_query_param = 'page_size'
    max_page_size         = 100


class AdminUserViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản trị người dùng (User Management).
    Chỉ Quản trị viên (is_superuser) mới có quyền quản lý tài khoản.
    """
    permission_classes = [IsSuperUser]
    pagination_class   = AdminUserPagination
    filter_backends    = [filters.SearchFilter, filters.OrderingFilter]
    search_fields      = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering_fields    = ['date_joined', 'last_login', 'username', 'bookings_count', 'total_spent']
    ordering           = ['-date_joined']

    def get_serializer_class(self):
        if self.action == 'create':
            return AdminUserCreateSerializer
        if self.action in ['update', 'partial_update']:
            return AdminUserUpdateSerializer
        if self.action == 'reset_password':
            return AdminResetUserPasswordSerializer
        if self.action == 'guides':
            return GuideSerializer
        return AdminUserListSerializer

    def get_queryset(self):
        qs = User.objects.annotate(
            bookings_count=Count('bookings', distinct=True),
            total_spent=Coalesce(
                Sum('bookings__total_price', filter=Q(bookings__status__in=['confirmed', 'completed'])),
                Value(0),
                output_field=DecimalField()
            )
        ).order_by('-date_joined')

        query_params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))

        # Lọc theo vai trò (role: admin, staff, customer)
        role = query_params.get('role', '').lower().strip()
        if role == 'admin':
            qs = qs.filter(is_superuser=True)
        elif role == 'staff':
            qs = qs.filter(is_staff=True, is_superuser=False)
        elif role == 'customer':
            qs = qs.filter(is_superuser=False, is_staff=False)

        # Lọc theo trạng thái hoạt động (is_active)
        is_active = query_params.get('is_active', '').lower().strip()
        if is_active == 'true':
            qs = qs.filter(is_active=True)
        elif is_active == 'false':
            qs = qs.filter(is_active=False)

        return qs

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if request.user.pk == user.pk:
            return Response(
                {'error': 'Bạn không thể tự xoá tài khoản của chính mình!'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user.is_superuser and User.objects.filter(is_superuser=True).count() <= 1:
            return Response(
                {'error': 'Không thể xoá Quản trị viên duy nhất của hệ thống!'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'], url_path='toggle-active')
    def toggle_active(self, request, pk=None):
        """Bật/tắt trạng thái hoạt động (Khoá / Mở khoá) của người dùng."""
        user = self.get_object()
        if request.user.pk == user.pk:
            return Response(
                {'error': 'Bạn không thể tự khoá tài khoản của chính mình!'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if user.is_superuser and user.is_active and User.objects.filter(is_superuser=True, is_active=True).count() <= 1:
            return Response(
                {'error': 'Không thể khoá Quản trị viên đang hoạt động duy nhất của hệ thống!'},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            'id':        user.pk,
            'is_active': user.is_active,
            'message':   f'Tài khoản {user.username} đã {"mở khoá" if user.is_active else "bị khoá"}.'
        })

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Đặt lại mật khẩu cho tài khoản người dùng về mặc định 123456 (hoặc mật khẩu chỉ định).
        Gửi email thông báo mật khẩu mới đến hòm thư của người dùng qua Gmail SMTP.
        """
        user = self.get_object()
        serializer = AdminResetUserPasswordSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        new_pwd = serializer.validated_data.get('new_password') or '123456'

        # Nếu request gửi kèm email (đặc biệt khi tài khoản chưa có Email), cập nhật vào tài khoản
        email_input = str(request.data.get('email', '')).strip()
        if email_input and (not user.email or user.email != email_input):
            user.email = email_input
            user.save(update_fields=['email'])

        user.set_password(new_pwd)
        user.save(update_fields=['password'])

        # Gửi email thông báo thật qua Gmail SMTP nếu user có email
        email_sent = False
        email_message = ''
        if user.email:
            try:
                subject = f'[Tourism] Mật khẩu mới cho tài khoản @{user.username}'
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
                  <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
                    <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">🌍 Tourism</h2>
                    <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Hệ Thống Đặt Tour & Quản Lý Du Lịch</p>
                  </div>
                  <div style="padding: 20px 0;">
                    <p style="color: #1e293b; font-size: 15px; margin: 0 0 12px;">Xin chào <strong>{user.first_name or user.username}</strong>,</p>
                    <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
                      Quản trị viên đã thực hiện đặt lại mật khẩu cho tài khoản <strong>@{user.username}</strong> của bạn.
                    </p>
                    <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;">
                      <div style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Mật khẩu mới của bạn</div>
                      <div style="color: #4f46e5; font-size: 26px; font-weight: 800; letter-spacing: 3px; margin-top: 6px;">{new_pwd}</div>
                    </div>
                    <p style="color: #dc2626; font-size: 13px; line-height: 1.4; margin: 16px 0 0;">
                      ⚠️ <strong>Lưu ý:</strong> Để đảm bảo an toàn, vui lòng đăng nhập và đổi lại mật khẩu của bạn sau khi nhận được thông báo này.
                    </p>
                    <div style="text-align: center; margin-top: 24px;">
                      <a href="http://localhost:5173" style="background: #4f46e5; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
                        Đăng nhập hệ thống →
                      </a>
                    </div>
                  </div>
                  <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
                    © 2026 Tourism Project. Đồ án tốt nghiệp.
                  </div>
                </div>
                """
                plain_body = f"Xin chào {user.username},\nMật khẩu tài khoản của bạn đã được đặt lại thành: {new_pwd}\nVui lòng đăng nhập tại http://localhost:5173 và đổi lại mật khẩu."
                from_addr = f"Tourism System <{settings.EMAIL_HOST_USER}>" if getattr(settings, 'EMAIL_HOST_USER', None) else getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tourism.vn')
                msg = EmailMultiAlternatives(subject, plain_body, from_addr, [user.email])
                msg.attach_alternative(html_content, "text/html")
                msg.send(fail_silently=False)
                email_sent = True
                email_message = f'Đã gửi email thông báo tới {user.email}'
            except Exception as e:
                email_sent = False
                email_message = f'Không thể gửi email: {str(e)}'
        else:
            email_message = 'Tài khoản chưa có Email để gửi thông báo.'

        return Response({
            'message': f'Mật khẩu của tài khoản {user.username} đã được đặt lại về "{new_pwd}".',
            'default_password': new_pwd,
            'user_id': user.pk,
            'username': user.username,
            'email': user.email,
            'email_sent': email_sent,
            'email_message': email_message,
        })

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Trả về thống kê nhanh tổng số lượng người dùng: Khách hàng, Nhân viên và Quản trị viên."""
        total_users     = User.objects.count()
        total_admins    = User.objects.filter(is_superuser=True).count()
        total_staff     = User.objects.filter(is_staff=True, is_superuser=False).count()
        total_customers = User.objects.filter(is_superuser=False, is_staff=False).count()
        total_inactive  = User.objects.filter(is_active=False).count()

        return Response({
            'total_users':     total_users,
            'total_admins':    total_admins,
            'total_staff':     total_staff,
            'total_customers': total_customers,
            'total_inactive':  total_inactive,
        })

    @action(detail=False, methods=['get'], url_path='guides', permission_classes=[IsStaffOrSuperUser])
    def guides(self, request):
        """Danh sách nhân viên / HDV để gán vào tour (cả Admin và Staff đều có thể gọi)."""
        guides_qs = User.objects.filter(is_staff=True, is_active=True).order_by('first_name', 'username')
        serializer = GuideSerializer(guides_qs, many=True)
        return Response(serializer.data)

