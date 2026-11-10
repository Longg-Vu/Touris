"""
Permissions & vai trò cho hệ thống du lịch.
- Quản trị viên (Admin): is_superuser = True
- Nhân viên / Hướng dẫn viên (Staff/Guide): is_staff = True, is_superuser = False
- Khách hàng (Customer): is_staff = False, is_superuser = False
"""
from rest_framework.permissions import BasePermission

ROLE_ADMIN    = 'admin'
ROLE_STAFF    = 'staff'
ROLE_CUSTOMER = 'customer'

ROLE_LABELS = {
    ROLE_ADMIN:    'Quản trị viên',
    ROLE_STAFF:    'Nhân viên',
    ROLE_CUSTOMER: 'Khách hàng',
}


def get_role(user):
    """Xác định vai trò của user."""
    if not user or not user.is_authenticated:
        return ROLE_CUSTOMER
    if user.is_superuser:
        return ROLE_ADMIN
    if user.is_staff:
        return ROLE_STAFF
    return ROLE_CUSTOMER


class IsSuperUser(BasePermission):
    """Chỉ cho phép Quản trị viên tối cao (is_superuser)."""
    message = 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)


class IsStaffOrSuperUser(BasePermission):
    """Cho phép Quản trị viên hoặc Nhân viên (is_staff)."""
    message = 'Bạn cần quyền Nhân viên hoặc Quản trị viên để truy cập.'

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.is_staff or request.user.is_superuser
            )
        )
