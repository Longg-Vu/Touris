"""
Script tạo và phân bổ Hướng dẫn viên (HDV) cho các điểm đến trên hệ thống Du lịch.
Mật khẩu mặc định cho tất cả HDV là: 123456
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'tourism_backend.settings')
django.setup()

from accounts.models import User
from tours.models import Destination, Tour

GUIDE_DEFS = [
    {
        'username': 'guide_danang',
        'first_name': 'Phùng Thanh',
        'last_name': 'Độ (HDV)',
        'email': 'do.danang@tourism.vn',
        'phone': '0988112233',
        'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
        'dest_slugs': ['da-nang'],
        'region': 'Đà Nẵng & Miền Trung',
    },
    {
        'username': 'guide_hanoi',
        'first_name': 'Trần Quốc',
        'last_name': 'Tuấn (HDV)',
        'email': 'tuan.hanoi@tourism.vn',
        'phone': '0988223344',
        'avatar': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        'dest_slugs': ['ha-noi'],
        'region': 'Hà Nội & Thủ Đô',
    },
    {
        'username': 'guide_hcm',
        'first_name': 'Lê Hoàng',
        'last_name': 'Long (HDV)',
        'email': 'long.hcm@tourism.vn',
        'phone': '0988334455',
        'avatar': 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150',
        'dest_slugs': ['ho-chi-minh'],
        'region': 'TP. Hồ Chí Minh & Đô Thị',
    },
    {
        'username': 'guide_dalat',
        'first_name': 'Phan Thị Bích',
        'last_name': 'Ngọc (HDV)',
        'email': 'ngoc.dalat@tourism.vn',
        'phone': '0988445566',
        'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        'dest_slugs': ['da-lat'],
        'region': 'Đà Lạt & Cao Nguyên',
    },
    {
        'username': 'guide_phuquoc',
        'first_name': 'Vũ Minh',
        'last_name': 'Hải (HDV)',
        'email': 'hai.phuquoc@tourism.vn',
        'phone': '0988556677',
        'avatar': 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        'dest_slugs': ['phu-quoc'],
        'region': 'Phú Quốc & Biển Đảo',
    },
    {
        'username': 'guide_nhatrang',
        'first_name': 'Đặng Hoàng',
        'last_name': 'Nam (HDV)',
        'email': 'nam.nhatrang@tourism.vn',
        'phone': '0988667788',
        'avatar': 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        'dest_slugs': ['nha-trang'],
        'region': 'Nha Trang & Vịnh Biển',
    },
    {
        'username': 'guide_hoian',
        'first_name': 'Nguyễn Thị Mai',
        'last_name': 'Lan (HDV)',
        'email': 'lan.hoian@tourism.vn',
        'phone': '0988778899',
        'avatar': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
        'dest_slugs': ['hoi-an'],
        'region': 'Hội An & Phố Cổ Di Sản',
    },
    {
        'username': 'guide_halong',
        'first_name': 'Bùi Tiến',
        'last_name': 'Dũng (HDV)',
        'email': 'dung.halong@tourism.vn',
        'phone': '0988889900',
        'avatar': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        'dest_slugs': ['ha-long'],
        'region': 'Hạ Long & Du Thuyền Kỳ Quan',
    },
    {
        'username': 'guide_sapa',
        'first_name': 'Vàng A',
        'last_name': 'Sáng (HDV)',
        'email': 'sang.sapa@tourism.vn',
        'phone': '0988990011',
        'avatar': 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        'dest_slugs': ['sa-pa'],
        'region': 'Sa Pa & Tây Bắc Hùng Vĩ',
    },
    {
        'username': 'guide_ninhbinh',
        'first_name': 'Trịnh Đình',
        'last_name': 'Khang (HDV)',
        'email': 'khang.ninhbinh@tourism.vn',
        'phone': '0988113355',
        'avatar': 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150',
        'dest_slugs': ['ninh-binh'],
        'region': 'Ninh Bình & Cố Đô Tràng An',
    },
    {
        'username': 'guide_hue',
        'first_name': 'Hoàng Trọng',
        'last_name': 'Phúc (HDV)',
        'email': 'phuc.hue@tourism.vn',
        'phone': '0988001122',
        'avatar': 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
        'dest_slugs': ['hue'],
        'region': 'Cố Đô Huế & Sông Hương',
    },
    {
        'username': 'guide_haiphong',
        'first_name': 'Phạm Văn',
        'last_name': 'Hùng (HDV Cát Bà)',
        'email': 'hung.haiphong@tourism.vn',
        'phone': '0988224466',
        'avatar': 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        'dest_slugs': ['hai-phong'],
        'region': 'Hải Phòng & Vịnh Lan Hạ Cát Bà',
    },
    {
        'username': 'guide_mientay',
        'first_name': 'Trương Tấn',
        'last_name': 'Phát (HDV)',
        'email': 'phat.mientay@tourism.vn',
        'phone': '0988335577',
        'avatar': 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150',
        'dest_slugs': ['my-tho', 'can-tho', 'thanh-pho-ben-tre'],
        'region': 'Đồng Bằng Sông Cửu Long (Miền Tây)',
    },
    {
        'username': 'guide_vungtau',
        'first_name': 'Nguyễn Hữu',
        'last_name': 'Tài (HDV)',
        'email': 'tai.vungtau@tourism.vn',
        'phone': '0988446688',
        'avatar': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        'dest_slugs': ['vung-tau', 'tay-ninh', 'bien-hoa'],
        'region': 'Vũng Tàu & Đông Nam Bộ',
    },
]

def run():
    print("=" * 60)
    print("BẮT ĐẦU TẠO VÀ GÁN HƯỚNG DẪN VIÊN (HDV)")
    print("=" * 60)

    # Đảm bảo guide1 (Nguyễn Văn Hùng) đã có gán Cửa Lò
    guide1 = User.objects.filter(username='guide1').first()
    if guide1:
        cua_lo_tours = Tour.objects.filter(destination__slug='cua-lo')
        cua_lo_tours.update(guide=guide1)
        print(f"[OK] Đã cập nhật HDV guide1 (Nguyễn Văn Hùng) cho {cua_lo_tours.count()} tour Cửa Lò.")

    total_tours_assigned = 0

    for item in GUIDE_DEFS:
        username = item['username']
        user, created = User.objects.get_or_create(username=username)
        user.first_name = item['first_name']
        user.last_name = item['last_name']
        user.email = item['email']
        user.phone = item['phone']
        user.avatar = item['avatar']
        user.is_staff = True
        user.is_superuser = False
        user.is_active = True
        user.set_password('123456')
        user.save()

        action_str = "Tạo mới" if created else "Cập nhật"
        full_name = f"{user.first_name} {user.last_name}"
        print(f"\n[+] {action_str} HDV: {full_name} (@{username}) - Email: {user.email}")

        # Gán HDV cho các tour thuộc các điểm đến
        assigned_count = 0
        for slug in item['dest_slugs']:
            dests = Destination.objects.filter(slug=slug)
            for d in dests:
                tours = Tour.objects.filter(destination=d)
                count = tours.count()
                tours.update(guide=user)
                assigned_count += count
                print(f"   -> Gán {count} tour tại '{d.name}' ({slug}) cho {full_name}")

        total_tours_assigned += assigned_count
        print(f"   => Tổng tour do {full_name} phụ trách: {assigned_count} tour.")

    # Kiểm tra các tour còn lại nếu chưa có HDV
    unassigned_tours = Tour.objects.filter(guide__isnull=True)
    if unassigned_tours.exists():
        # Gán tạm cho guide1 hoặc guide_danang
        fallback_guide = User.objects.get(username='guide_danang')
        count = unassigned_tours.count()
        unassigned_tours.update(guide=fallback_guide)
        print(f"\n[!] Có {count} tour chưa rõ điểm đến, đã gán cho {fallback_guide.get_full_name()}.")
        total_tours_assigned += count

    print("\n" + "=" * 60)
    print("HOÀN TẤT!")
    print(f"Tổng số tour trên hệ thống: {Tour.objects.count()}")
    print(f"Số tour đã có HDV phụ trách: {Tour.objects.filter(guide__isnull=False).count()} / {Tour.objects.count()}")
    print("Danh sách tài khoản HDV để đăng nhập (mật khẩu chung: 123456):")
    for g in User.objects.filter(is_staff=True, is_superuser=False).order_by('id'):
        print(f" - {g.first_name} {g.last_name} | Username: {g.username} | Email: {g.email} | Phụ trách: {g.guided_tours.count()} tour")
    print("=" * 60)

if __name__ == '__main__':
    run()
