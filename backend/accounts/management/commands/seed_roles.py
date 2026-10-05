"""
Tạo / đồng bộ các NHÓM QUYỀN nhân viên mẫu (xem accounts/rbac.py → ROLE_TEMPLATES).

    python manage.py seed_roles            # chỉ tạo nhóm còn thiếu (không ghi đè chỉnh sửa của Admin)
    python manage.py seed_roles --reset    # đưa TẤT CẢ nhóm mẫu về đúng quyền mặc định
"""
from django.contrib.auth.models import Group, Permission
from django.core.management.base import BaseCommand

from accounts.rbac import ROLE_TEMPLATES


def seed_roles(reset=False, stdout=None):
    """Trả về (số nhóm tạo mới, số nhóm được đặt lại quyền)."""
    created_count = reset_count = 0
    for name, tpl in ROLE_TEMPLATES.items():
        group, created = Group.objects.get_or_create(name=name)
        if created or reset:
            perms = Permission.objects.filter(
                content_type__app_label='accounts',
                codename__in=tpl['permissions'],
            )
            group.permissions.set(perms)
            if created:
                created_count += 1
            else:
                reset_count += 1
            if stdout:
                stdout.write(f"  {'+ Tạo' if created else '↺ Reset'}: {name} ({perms.count()} quyền)")
    return created_count, reset_count


class Command(BaseCommand):
    help = 'Tạo các nhóm quyền nhân viên mẫu (Điều hành tour, Kinh doanh - CSKH, Kế toán, Nội dung).'

    def add_arguments(self, parser):
        parser.add_argument('--reset', action='store_true',
                            help='Đặt lại quyền của các nhóm mẫu về mặc định.')

    def handle(self, *args, **options):
        created, reset = seed_roles(reset=options['reset'], stdout=self.stdout)
        self.stdout.write(self.style.SUCCESS(
            f'Hoàn tất: {created} nhóm tạo mới, {reset} nhóm được đặt lại.'
        ))
