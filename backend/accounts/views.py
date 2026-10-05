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
from .serializers import (
    RegisterSerializer, UserSerializer, GoogleAuthSerializer, ChangePasswordSerializer,
    AdminUserListSerializer, AdminUserCreateSerializer, AdminUserUpdateSerializer, AdminResetUserPasswordSerializer
)
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
            from google.oauth2 import id_token
            from google.auth.transport import requests as g_requests

            CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
            id_info = id_token.verify_oauth2_token(
                credential,
                g_requests.Request(),
                CLIENT_ID,
            )

            email      = id_info.get('email', '').lower()
            first_name = id_info.get('given_name', '')
            last_name  = id_info.get('family_name', '')
            avatar     = id_info.get('picture', '')

            if not email:
                return Response({'error': 'Không lấy được email từ Google.'}, status=400)

            # Lấy hoặc tạo user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username':   email.split('@')[0],
                    'first_name': first_name,
                    'last_name':  last_name,
                    'avatar':     avatar,
                }
            )
            if not created and avatar:
                user.avatar = avatar
                user.save(update_fields=['avatar'])

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
    Chỉ tài khoản staff hoặc superuser mới có quyền truy cập.

    Endpoints:
      GET    /api/auth/admin/users/             → Danh sách người dùng (phân trang, search, filter)
      POST   /api/auth/admin/users/             → Tạo tài khoản mới (nhân viên, khách hàng, admin)
      GET    /api/auth/admin/users/{id}/        → Chi tiết người dùng
      PATCH  /api/auth/admin/users/{id}/        → Cập nhật thông tin / vai trò / trạng thái
      DELETE /api/auth/admin/users/{id}/        → Xoá người dùng (không được xoá chính mình)
      POST   /api/auth/admin/users/{id}/toggle-active/ → Khoá / mở khoá tài khoản
      POST   /api/auth/admin/users/{id}/reset-password/ → Đặt lại mật khẩu
      GET    /api/auth/admin/users/stats/       → Thống kê tổng số user theo vai trò
    """
    permission_classes = [permissions.IsAdminUser]
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

        # Lọc theo vai trò (role)
        role = query_params.get('role', '').lower().strip()
        if role == 'admin':
            qs = qs.filter(Q(is_superuser=True) | Q(is_staff=True))
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
        if (user.is_superuser or user.is_staff) and User.objects.filter(Q(is_superuser=True) | Q(is_staff=True)).count() <= 1:
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
        user.is_active = not user.is_active
        user.save(update_fields=['is_active'])
        return Response({
            'id':        user.pk,
            'is_active': user.is_active,
            'message':   f'Tài khoản {user.username} đã {"mở khoá" if user.is_active else "bị khoá"}.'
        })

    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """Đặt lại mật khẩu cho tài khoản người dùng bởi Admin."""
        user = self.get_object()
        serializer = AdminResetUserPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'message': f'Đổi mật khẩu thành công cho tài khoản {user.username}.'})

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Trả về thống kê nhanh tổng số lượng người dùng: Khách hàng và Quản trị viên."""
        total_users     = User.objects.count()
        total_admins    = User.objects.filter(Q(is_superuser=True) | Q(is_staff=True)).count()
        total_customers = User.objects.filter(is_superuser=False, is_staff=False).count()
        total_inactive  = User.objects.filter(is_active=False).count()

        return Response({
            'total_users':     total_users,
            'total_admins':    total_admins,
            'total_customers': total_customers,
            'total_inactive':  total_inactive,
        })
