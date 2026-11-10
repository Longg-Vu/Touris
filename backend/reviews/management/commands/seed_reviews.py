"""
SEED REVIEWS COMMAND
====================
Tạo dữ liệu đánh giá mẫu chất lượng cho các tour để hệ thống hiển thị sinh động.
"""

from django.db import models
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from tours.models import Tour
from bookings.models import Booking
from reviews.models import Review
import datetime

User = get_user_model()

SAMPLE_USERS = [
    {
        'username': 'minhtuan',
        'email': 'minhtuan@example.com',
        'first_name': 'Nguyễn Minh',
        'last_name': 'Tuấn',
        'avatar': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    },
    {
        'username': 'maitran',
        'email': 'maitran@example.com',
        'first_name': 'Trần Thị',
        'last_name': 'Mai',
        'avatar': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    },
    {
        'username': 'vanhoang',
        'email': 'vanhoang@example.com',
        'first_name': 'Lê Văn',
        'last_name': 'Hoàng',
        'avatar': 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    },
    {
        'username': 'thanhha',
        'email': 'thanhha@example.com',
        'first_name': 'Phạm Thanh',
        'last_name': 'Hà',
        'avatar': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    },
    {
        'username': 'ducviet',
        'email': 'ducviet@example.com',
        'first_name': 'Đỗ Đức',
        'last_name': 'Việt',
        'avatar': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    },
]

REVIEW_COMMENTS = [
    (5, 'Tour rất tuyệt vời! Hướng dẫn viên cực kỳ nhiệt tình, chu đáo và am hiểu lịch sử địa phương. Xe đón đúng giờ, bữa trưa phong phú và ngon miệng. Cả gia đình tôi đều rất hài lòng!'),
    (5, 'Chuyến đi đáng nhớ nhất năm nay của mình. Cảnh sắc đẹp hơn trong ảnh rất nhiều, các điểm dừng check-in đều chụp được ảnh đẹp. Dịch vụ chuyên nghiệp, chắc chắn sẽ tiếp tục ủng hộ công ty!'),
    (4, 'Trải nghiệm tổng quan rất tốt, khách sạn và phương tiện di chuyển sạch sẽ thoải mái. Lịch trình hơi dày một chút nhưng hướng dẫn viên điều phối linh hoạt nên không bị quá mệt. Đánh giá 4.5 sao.'),
    (5, 'Dịch vụ 10/10 không có điểm gì để chê. Đặt tour trên web nhanh chóng, quét QR thanh toán xong có nhân viên gọi xác nhận liền. Đi tour thì hướng dẫn viên chăm sóc từng khách chu đáo!'),
    (4, 'Tour tổ chức rất bài bản, đồ ăn ngon và nhiều. Hướng dẫn viên rất có tâm, chụp ảnh cho cả đoàn siêu đẹp. Sẽ giới thiệu cho đồng nghiệp cùng trải nghiệm.'),
]


class Command(BaseCommand):
    help = 'Khởi tạo dữ liệu review mẫu chân thực cho các tour'

    def handle(self, *args, **kwargs):
        # 1. Tạo các user mẫu
        created_users = []
        for udata in SAMPLE_USERS:
            user, created = User.objects.get_or_create(
                username=udata['username'],
                defaults={
                    'email': udata['email'],
                    'first_name': udata['first_name'],
                    'last_name': udata['last_name'],
                    'avatar': udata['avatar'],
                    'is_active': True,
                }
            )
            if created:
                user.set_password('123456')
                user.save()
            created_users.append(user)

        self.stdout.write(self.style.SUCCESS(f'Prepared {len(created_users)} sample users.'))

        # 2. Lấy top 15 tour đầu tiên
        tours = Tour.objects.filter(is_active=True).order_by('id')[:15]
        if not tours.exists():
            self.stdout.write(self.style.WARNING('No tours in database.'))
            return

        review_count_created = 0
        today = datetime.date.today()

        for tour_idx, tour in enumerate(tours):
            # Tạo 2-4 reviews cho mỗi tour từ các users khác nhau
            num_reviews = 3 + (tour_idx % 3)
            for i in range(num_reviews):
                user = created_users[i % len(created_users)]
                rating, comment = REVIEW_COMMENTS[(tour_idx + i) % len(REVIEW_COMMENTS)]

                # Tạo completed booking tương ứng nếu chưa có
                Booking.objects.get_or_create(
                    user=user,
                    tour=tour,
                    defaults={
                        'travel_date': today - datetime.timedelta(days=7 + i),
                        'num_adults': 2,
                        'num_children': 0,
                        'price_adult': tour.price_adult,
                        'price_child': round(float(tour.price_adult) * 0.7),
                        'total_price': tour.price_adult * 2,
                        'contact_name': f"{user.first_name} {user.last_name}".strip(),
                        'contact_phone': '0901234567',
                        'contact_email': user.email,
                        'status': Booking.STATUS_COMPLETED,
                    }
                )

                # Tạo review nếu user chưa review tour này
                review, created = Review.objects.get_or_create(
                    tour=tour,
                    user=user,
                    defaults={
                        'rating': rating,
                        'comment': comment,
                    }
                )
                if created:
                    review_count_created += 1

            # Cập nhật rating và review_count thực tế cho tour
            stats = tour.reviews.aggregate(
                avg=models.Avg('rating'),
                count=models.Count('id')
            )
            tour.rating = round(stats['avg'] or 5.0, 1)
            tour.review_count = stats['count'] or 0
            tour.save(update_fields=['rating', 'review_count'])

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {review_count_created} sample reviews for tours.')
        )
