"""
RBAC – Phân quyền theo nhóm (Role-Based Access Control)
=======================================================

Mô hình:
  • ADMIN     = tài khoản is_superuser  → toàn quyền, không cần gán nhóm.
  • NHÂN VIÊN = tài khoản is_staff (không superuser) → quyền lấy từ các
                NHÓM QUYỀN (django.contrib.auth.models.Group) được gán.
  • KHÁCH     = tài khoản thường → không vào được khu quản trị.

Mỗi QUYỀN CHI TIẾT là một Permission của model User (app 'accounts'),
kiểm tra bằng: user.has_perm('accounts.<code>').

File này KHÔNG import model để models.py có thể import danh mục quyền.
"""

# ─────────────────────────────────────────────────────────────────────────────
# Danh mục quyền, gom theo module chức năng
# ─────────────────────────────────────────────────────────────────────────────
PERMISSION_CATALOG = [
    {
        'module': 'tour',
        'label': 'Quản lý Tour',
        'permissions': [
            ('tour_view',         'Xem danh sách tour trong khu quản trị'),
            ('tour_add',          'Thêm tour mới'),
            ('tour_edit_info',    'Sửa thông tin & nội dung tour (tên, ảnh, tags, khuyến mãi, danh mục, điểm đến)'),
            ('tour_edit_ops',     'Sửa dữ liệu vận hành tour (giá, ẩn/hiện, nổi bật, hot, số lượt đặt)'),
            ('tour_delete',       'Xoá tour'),
            ('departure_manage',  'Quản lý lịch khởi hành & số chỗ (dành cho module sau)'),
        ],
    },
    {
        'module': 'booking',
        'label': 'Quản lý Đơn đặt tour',
        'permissions': [
            ('booking_view',          'Xem danh sách & chi tiết đơn đặt'),
            ('booking_confirm',       'Xác nhận đơn đặt'),
            ('booking_update_status', 'Cập nhật trạng thái đơn (hoàn thành / huỷ)'),
        ],
    },
    {
        'module': 'payment',
        'label': 'Thanh toán & Kế toán',
        'permissions': [
            ('payment_view',   'Xem & kiểm tra thanh toán (dành cho module sau)'),
            ('payment_manage', 'Đối soát thanh toán (dành cho module sau)'),
            ('refund_manage',  'Xử lý hoàn tiền (dành cho module sau)'),
        ],
    },
    {
        'module': 'report',
        'label': 'Báo cáo & Thống kê',
        'permissions': [
            ('report_overview',        'Xem thống kê vận hành (số đơn, số tour, khách hàng, top tour)'),
            ('report_revenue_summary', 'Xem doanh thu ở mức tổng quan'),
            ('report_financial',       'Xem báo cáo tài chính chi tiết (doanh thu theo tháng)'),
        ],
    },
    {
        'module': 'user',
        'label': 'Người dùng & Phân quyền',
        'permissions': [
            ('user_view',   'Xem danh sách người dùng'),
            ('user_manage', 'Tạo / sửa / khoá / xoá / đặt lại mật khẩu tài khoản'),
            ('role_assign', 'Phân quyền nhân viên & quản lý nhóm quyền'),
        ],
    },
    {
        'module': 'system',
        'label': 'Hệ thống',
        'permissions': [
            ('system_config', 'Cấu hình hệ thống (dành cho module sau)'),
        ],
    },
]

# Danh sách phẳng để tra cứu nhanh
ALL_PERMISSIONS = [
    (code, label)
    for group in PERMISSION_CATALOG
    for code, label in group['permissions']
]
ALL_PERMISSION_CODES = [code for code, _ in ALL_PERMISSIONS]
PERMISSION_LABELS = dict(ALL_PERMISSIONS)


# ─────────────────────────────────────────────────────────────────────────────
# Mẫu nhóm quyền nhân viên (tạo sẵn khi migrate / chạy `seed_roles`)
# Admin KHÔNG nằm ở đây vì là superuser (toàn quyền).
# ─────────────────────────────────────────────────────────────────────────────
ROLE_TEMPLATES = {
    'Điều hành tour': {
        'description': (
            'Tạo, sửa, cập nhật tour, lịch khởi hành, số chỗ và trạng thái vận hành. '
            'Không được xoá tour, không quản lý tài khoản/phân quyền, không xem tài chính.'
        ),
        'permissions': [
            'tour_view', 'tour_add', 'tour_edit_info', 'tour_edit_ops',
            'departure_manage', 'report_overview',
        ],
    },
    'Kinh doanh - CSKH': {
        'description': (
            'Quản lý đơn đặt: xem, xác nhận, cập nhật trạng thái và hỗ trợ khách hàng. '
            'Xem tour và doanh thu tổng quan, không sửa thông tin tour, không xem báo cáo tài chính chi tiết.'
        ),
        'permissions': [
            'tour_view', 'booking_view', 'booking_confirm', 'booking_update_status',
            'report_overview', 'report_revenue_summary',
        ],
    },
    'Kế toán': {
        'description': (
            'Kiểm tra thanh toán, hoàn tiền, đối soát và xem toàn bộ báo cáo doanh thu. '
            'Không sửa tour, không quản lý tài khoản.'
        ),
        'permissions': [
            'booking_view', 'payment_view', 'payment_manage', 'refund_manage',
            'report_overview', 'report_revenue_summary', 'report_financial',
        ],
    },
    'Nội dung': {
        'description': (
            'Thêm/sửa hình ảnh, mô tả, tags, khuyến mãi và nội dung hiển thị của tour. '
            'Không can thiệp booking, thanh toán hay phân quyền.'
        ),
        'permissions': [
            'tour_view', 'tour_edit_info',
        ],
    },
}
