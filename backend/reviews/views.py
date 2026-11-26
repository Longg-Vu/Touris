"""
REVIEWS APP - Views
===================
API ViewSet xử lý đánh giá & nhận xét tour.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Avg, Count
from .models import Review
from .serializers import ReviewSerializer
from bookings.models import Booking
from tours.models import Tour


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet quản lý Đánh giá:
    - GET  /api/reviews/reviews/?tour={id}  → Xem danh sách đánh giá của tour (Công khai)
    - POST /api/reviews/reviews/            → Gửi đánh giá mới (Cần đăng nhập & đã đặt tour)
    - DELETE /api/reviews/reviews/{id}/     → Xoá đánh giá (Tác giả hoặc Admin/Staff)
    - GET  /api/reviews/reviews/can-review/?tour={id} → Kiểm tra quyền đánh giá của user
    """
    serializer_class = ReviewSerializer
    http_method_names = ['get', 'post', 'delete', 'head', 'options']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'summary']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = Review.objects.select_related('user', 'tour').order_by('-created_at')
        tour_id = self.request.query_params.get('tour')
        if tour_id:
            if str(tour_id).isdigit():
                qs = qs.filter(tour_id=int(tour_id))
            else:
                return qs.none()
        return qs

    def perform_destroy(self, instance):
        user = self.request.user
        # Tác giả đánh giá hoặc Quản trị viên/Nhân viên mới được xoá
        if instance.user.pk == user.pk or user.is_staff or user.is_superuser:
            instance.delete()
        else:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Bạn không có quyền xoá đánh giá này.')

    @action(detail=False, methods=['get'], url_path='can-review', permission_classes=[permissions.AllowAny])
    def can_review(self, request):
        """
        Kiểm tra người dùng hiện tại có đủ điều kiện đánh giá tour hay không:
        - Đã đăng nhập chưa?
        - Đã từng đánh giá tour này chưa?
        - Đã từng đặt và hoàn thành tour này chưa?
        """
        tour_id = request.query_params.get('tour')
        if not tour_id or not str(tour_id).isdigit():
            return Response({'error': 'Tham số tour không hợp lệ'}, status=400)

        user = request.user
        if not user or not user.is_authenticated:
            return Response({
                'can_review': False,
                'is_authenticated': False,
                'has_reviewed': False,
                'message': 'Đăng nhập để chia sẻ đánh giá của bạn.',
            })

        # Đã đánh giá chưa?
        existing_review = Review.objects.filter(tour_id=tour_id, user=user).first()
        if existing_review:
            return Response({
                'can_review': False,
                'is_authenticated': True,
                'has_reviewed': True,
                'review_id': existing_review.id,
                'message': 'Bạn đã gửi đánh giá cho tour này rồi.',
            })

        # Có booking hợp lệ chưa?
        if user.is_staff or user.is_superuser:
            return Response({
                'can_review': True,
                'is_authenticated': True,
                'has_reviewed': False,
                'message': 'Bạn có thể gửi đánh giá thử nghiệm.',
            })

        from django.utils import timezone
        from django.db.models import Q
        today = timezone.localdate()
        has_booked = Booking.objects.filter(
            user=user,
            tour_id=tour_id,
        ).filter(
            Q(status=Booking.STATUS_COMPLETED)
            | Q(status=Booking.STATUS_CONFIRMED, travel_date__lte=today)
        ).exists()

        if has_booked:
            return Response({
                'can_review': True,
                'is_authenticated': True,
                'has_reviewed': False,
                'message': 'Bạn đủ điều kiện đánh giá tour này.',
            })
        else:
            return Response({
                'can_review': False,
                'is_authenticated': True,
                'has_reviewed': False,
                'message': 'Bạn cần đặt và tham gia chuyến đi để có thể đánh giá.',
            })
