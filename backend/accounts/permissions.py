"""
Permission classes & helper cho RBAC.

Cách dùng trong ViewSet:

    class MyViewSet(viewsets.ModelViewSet):
        permission_classes = [ActionPermission]
        action_permissions = {
            'list':    'booking_view',
            'confirm': 'booking_confirm',
            'update':  ['tour_edit_info', 'tour_edit_ops'],   # có MỘT trong các quyền là được
        }
        # default_permission = 'booking_view'   # (tuỳ chọn) quyền cho action không khai báo
"""
from rest_framework.permissions import BasePermission

from .rbac import ALL_PERMISSION_CODES

APP_LABEL = 'accounts'

ROLE_ADMIN    = 'admin'
ROLE_STAFF    = 'staff'
ROLE_CUSTOMER = 'customer'

ROLE_LABELS = {
    ROLE_ADMIN:    'Quản trị viên',
    ROLE_STAFF:    'Nhân viên',
    ROLE_CUSTOMER: 'Khách hàng',
}


def get_role(user):
    """admin = superuser · staff = is_staff · còn lại = customer."""
    if user is None:
        return ROLE_CUSTOMER
    if user.is_superuser:
        return ROLE_ADMIN
    if user.is_staff:
        return ROLE_STAFF
    return ROLE_CUSTOMER


def has_perm(user, code):
    """
    Kiểm tra user có quyền chi tiết `code` không.
      - Chưa đăng nhập / bị khoá  → False
      - Admin (superuser)         → luôn True
      - Nhân viên (is_staff)      → theo các nhóm quyền được gán
      - Khách hàng                → luôn False
    """
    if not user or not user.is_authenticated or not user.is_active:
        return False
    if user.is_superuser:
        return True
    if not user.is_staff:
        return False
    return user.has_perm(f'{APP_LABEL}.{code}')


def has_any_perm(user, codes):
    return any(has_perm(user, c) for c in codes)


def get_user_permission_codes(user):
    """Danh sách mã quyền chi tiết của user (gửi cho frontend)."""
    if not user or not user.is_authenticated or not user.is_active:
        return []
    if user.is_superuser:
        return list(ALL_PERMISSION_CODES)
    if not user.is_staff:
        return []
    prefix = f'{APP_LABEL}.'
    owned = {p[len(prefix):] for p in user.get_all_permissions() if p.startswith(prefix)}
    return [c for c in ALL_PERMISSION_CODES if c in owned]


class ActionPermission(BasePermission):
    """Mỗi action của ViewSet yêu cầu một (hoặc một trong nhiều) quyền chi tiết."""
    message = 'Bạn không có quyền thực hiện chức năng này.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated or not user.is_active:
            return False

        mapping  = getattr(view, 'action_permissions', {})
        required = mapping.get(getattr(view, 'action', None),
                               getattr(view, 'default_permission', None))

        # Action chưa khai báo quyền → chỉ cho Admin/Nhân viên (an toàn hơn mở)
        if required is None:
            return bool(user.is_superuser or user.is_staff)

        codes = [required] if isinstance(required, str) else list(required)
        return has_any_perm(user, codes)


def require_any(*codes):
    """Tạo Permission class (dùng cho @api_view): có MỘT trong các quyền là được."""
    class _AnyOf(BasePermission):
        message = 'Bạn không có quyền xem chức năng này.'

        def has_permission(self, request, view):
            return has_any_perm(request.user, codes)

    return _AnyOf
