"""
BOOKINGS APP - Serializers
==========================
Chuyển đổi Booking object ↔ JSON để giao tiếp với frontend.
"""

from rest_framework import serializers
from .models import Booking, ConsultationRequest
from tours.models import Tour


class BookingCreateSerializer(serializers.ModelSerializer):
    """
    Dùng khi khách hàng TẠO MỚI một booking (POST).
    Frontend gửi: tour_id, travel_date, num_adults, num_children,
                  contact_name, contact_phone, contact_email, special_request
    """

    class Meta:
        model  = Booking
        fields = [
            'tour',
            'travel_date',
            'num_adults',
            'num_children',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
        ]

    def validate_tour(self, tour):
        if not tour.is_active:
            raise serializers.ValidationError('Tour này hiện không còn hoạt động.')
        return tour

    def validate_travel_date(self, value):
        from django.utils import timezone
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError('Ngày khởi hành không được nằm trong quá khứ.')
        return value

    def validate(self, attrs):
        import re
        from datetime import time as dt_time
        from django.utils import timezone

        tour = attrs.get('tour')
        travel_date = attrs.get('travel_date')
        now_local = timezone.localtime()
        today = now_local.date()

        # Kiểm tra giờ khởi hành trong lịch trình nếu khách chọn ngày đi là hôm nay
        if travel_date and travel_date == today:
            dep_hour, dep_min = 8, 0  # Mặc định 08:00 sáng
            if tour and isinstance(getattr(tour, 'itinerary', None), list) and len(tour.itinerary) > 0:
                first_time_str = str(tour.itinerary[0].get('time', '') if isinstance(tour.itinerary[0], dict) else '')
                match_time = re.search(r'\b([01]?\d|2[0-3]):([0-5]\d)\b', first_time_str)
                if match_time:
                    dep_hour = int(match_time.group(1))
                    dep_min = int(match_time.group(2))

            dep_time = dt_time(dep_hour, dep_min)
            if now_local.time() >= dep_time:
                dep_fmt = f"{dep_hour:02d}:{dep_min:02d}"
                raise serializers.ValidationError({
                    'travel_date': (
                        f"Chuyến đi ngày hôm nay ({today.strftime('%d/%m/%Y')}) khởi hành lúc {dep_fmt} đã bắt đầu. "
                        f"Vui lòng chọn ngày khởi hành từ ngày mai trở đi!"
                    )
                })

        num_adults = attrs.get('num_adults', 1)
        num_children = attrs.get('num_children', 0)
        if num_adults < 1 or num_adults > 50:
            raise serializers.ValidationError({'num_adults': 'Số lượng người lớn phải từ 1 đến 50 khách mỗi đơn.'})
        if num_children < 0 or num_children > 50:
            raise serializers.ValidationError({'num_children': 'Số lượng trẻ em phải từ 0 đến 50 khách mỗi đơn.'})
        if not attrs.get('contact_name', '').strip():
            raise serializers.ValidationError({'contact_name': 'Vui lòng nhập họ và tên liên hệ.'})
        phone_raw = attrs.get('contact_phone', '').strip()
        if not phone_raw:
            raise serializers.ValidationError({'contact_phone': 'Vui lòng nhập số điện thoại liên hệ.'})
        phone_cleaned = re.sub(r'[\s\.\-]', '', phone_raw)
        if not re.match(r'^(0|\+84)[0-9]{8,10}$', phone_cleaned):
            raise serializers.ValidationError({'contact_phone': 'Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 0 hoặc +84).'})
        attrs['contact_phone'] = phone_cleaned
        if not attrs.get('contact_email', '').strip():
            raise serializers.ValidationError({'contact_email': 'Vui lòng nhập địa chỉ email liên hệ.'})
        return attrs

    def create(self, validated_data):
        from django.db import transaction
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        tour = validated_data['tour']
        request = self.context.get('request')

        num_adults       = validated_data.get('num_adults', 1)
        num_children     = validated_data.get('num_children', 0)
        requested_guests = num_adults + num_children

        contact_name  = str(validated_data.get('contact_name', '')).strip()
        contact_phone = str(validated_data.get('contact_phone', '')).strip()
        contact_email = str(validated_data.get('contact_email', '')).strip().lower()

        new_account_created = False
        initial_password = '123456'

        # ── Khóa bản ghi Tour (Row-level Lock: SELECT ... FOR UPDATE) trong Transaction ──
        # Giải quyết triệt để Race Condition khi 2 người cùng đặt những chỗ trống cuối cùng:
        # Request đến sau sẽ phải chờ Request đến trước commit xong rồi mới đọc số chỗ còn lại.
        with transaction.atomic():
            locked_tour = Tour.objects.select_for_update().get(pk=tour.pk)
            if not locked_tour.is_active:
                raise serializers.ValidationError({'detail': 'Tour này hiện không còn hoạt động.'})

            max_capacity = locked_tour.target_participants or 20
            agg = (
                Booking.objects
                .filter(tour=locked_tour)
                .exclude(status=Booking.STATUS_CANCELLED)
                .aggregate(
                    total_adults=Coalesce(Sum('num_adults'), 0),
                    total_children=Coalesce(Sum('num_children'), 0),
                )
            )
            current_booked = (agg['total_adults'] or 0) + (agg['total_children'] or 0)
            remaining_seats = max(0, max_capacity - current_booked)

            if remaining_seats <= 0:
                raise serializers.ValidationError({
                    'detail': f'Rất tiếc, tour này vừa hết chỗ ({current_booked}/{max_capacity} khách). Vui lòng chọn tour khác hoặc liên hệ tư vấn!'
                })

            if requested_guests > remaining_seats:
                raise serializers.ValidationError({
                    'detail': f'Rất tiếc, tour này hiện chỉ còn đúng {remaining_seats} chỗ trống (đã nhận {current_booked}/{max_capacity} khách), không đủ cho {requested_guests} khách bạn chọn.'
                })

            # Tính giá tại thời điểm đặt (snapshot - áp dụng giá Sale nếu tour đang ưu đãi)
            price_adult = (
                locked_tour.final_price
                if (hasattr(locked_tour, 'final_price') and (locked_tour.is_priority_sale or (locked_tour.sale_percent or 0) > 0) and (locked_tour.sale_percent or 0) > 0)
                else locked_tour.price_adult
            )
            price_child = round(float(price_adult) * 0.7)  # trẻ em = 70% giá người lớn
            total_price = price_adult * num_adults + price_child * num_children

            user = None
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                user = request.user
                if contact_phone and not user.phone:
                    user.phone = contact_phone
                    user.save(update_fields=['phone'])
            elif contact_email:
                # Khách vãng lai: Kiểm tra xem tài khoản email đã tồn tại hay chưa
                from django.contrib.auth import get_user_model
                User = get_user_model()
                existing_user = User.objects.filter(email__iexact=contact_email).first()
                if existing_user:
                    user = existing_user
                else:
                    # Tự động tạo tài khoản mới cho khách vãng lai để lần sau đăng nhập được
                    try:
                        base_uname = contact_email.split('@')[0]
                        uname = base_uname
                        counter = 1
                        while User.objects.filter(username__iexact=uname).exists():
                            uname = f"{base_uname}{counter}"
                            counter += 1

                        name_parts = contact_name.split()
                        last_name = name_parts[0] if len(name_parts) > 1 else ''
                        first_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else contact_name

                        new_user = User.objects.create_user(
                            username=uname,
                            email=contact_email,
                            first_name=first_name,
                            last_name=last_name,
                            phone=contact_phone,
                        )
                        new_user.set_password(initial_password)
                        new_user.save()
                        user = new_user
                        new_account_created = True
                    except Exception:
                        user = None

            booking = Booking.objects.create(
                **validated_data,
                user=user,
                price_adult=price_adult,
                price_child=price_child,
                total_price=total_price,
                status=Booking.STATUS_PENDING,
                assigned_guide=locked_tour.guide,  # Mặc định gán HDV chính của tour
            )

        # Gửi email thông báo đặt tour sau khi đã nhả khóa DB Transaction
        try:
            self.send_booking_confirmation_email(booking, new_account_created, initial_password)
        except Exception:
            pass

        return booking

    def send_booking_confirmation_email(self, booking, new_account_created=False, initial_password=None):
        """Gửi email xác nhận đặt tour và thông tin tài khoản cho khách hàng."""
        if not booking.contact_email:
            return

        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives

        price_fmt = f"{int(booking.total_price):,} ₫".replace(',', '.')
        account_section_html = ""
        account_section_text = ""

        if new_account_created and booking.user and initial_password:
            account_section_html = f"""
            <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 16px; margin: 18px 0;">
              <h3 style="color: #4338ca; margin: 0 0 8px; font-size: 15px;">🔐 Thông tin tài khoản đăng nhập của bạn</h3>
              <p style="color: #374151; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
                Hệ thống đã tự động kích hoạt tài khoản để bạn có thể theo dõi đơn hàng và thuận tiện đặt tour cho những lần sau:
              </p>
              <div style="font-size: 13px; color: #1e293b; line-height: 1.8;">
                <div><strong>Tên đăng nhập / Email:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; color: #4338ca;">{booking.user.username}</code> ({booking.contact_email})</div>
                <div><strong>Mật khẩu ban đầu:</strong> <span style="background: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; color: #4f46e5; letter-spacing: 1px;">{initial_password}</span></div>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
                💡 Bạn có thể đăng nhập tại <a href="http://localhost:5173" style="color: #4f46e5; font-weight: 600;">http://localhost:5173</a> và đổi lại mật khẩu bất kỳ lúc nào.
              </p>
            </div>
            """
            account_section_text = f"\nThông tin tài khoản đăng nhập:\nTên đăng nhập: {booking.user.username}\nMật khẩu: {initial_password}\n"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">🌍 Tourism</h2>
            <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Hệ Thống Đặt Tour & Quản Lý Du Lịch</p>
          </div>

          <div style="padding: 20px 0;">
            <p style="color: #1e293b; font-size: 15px; margin: 0 0 12px;">Xin chào <strong>{booking.contact_name}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              Cảm ơn bạn đã lựa chọn dịch vụ của chúng tôi! Đơn đặt tour của bạn đã được ghi nhận thành công trên hệ thống.
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📋 Chi tiết đơn đặt tour</h3>
              <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.8;">
                <tr><td style="color: #64748b; width: 35%;">Mã đơn hàng:</td><td><strong>#{booking.id}</strong> (Mã tra cứu: <span style="color: #4f46e5; font-weight: 700;">{booking.booking_code or ''}</span>)</td></tr>
                <tr><td style="color: #64748b;">Tour:</td><td><strong>{booking.tour.name}</strong></td></tr>
                <tr><td style="color: #64748b;">Ngày khởi hành:</td><td><strong>{booking.travel_date.strftime('%d/%m/%Y') if hasattr(booking.travel_date, 'strftime') else booking.travel_date}</strong></td></tr>
                <tr><td style="color: #64748b;">Số lượng khách:</td><td><strong>{booking.num_adults} người lớn</strong> {f' + {booking.num_children} trẻ em' if booking.num_children else ''}</td></tr>
                <tr><td style="color: #64748b;">Số điện thoại:</td><td><strong>{booking.contact_phone}</strong></td></tr>
                <tr><td style="color: #64748b;">Tổng tiền:</td><td><strong style="color: #dc2626; font-size: 16px;">{price_fmt}</strong></td></tr>
              </table>
            </div>

            {account_section_html}

            <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #b45309; margin: 0 0 8px; font-size: 14px;">💳 Hướng dẫn thanh toán chuyển khoản:</h3>
              <div style="font-size: 13px; color: #78350f; line-height: 1.7;">
                <div>• Ngân hàng: <strong>MB Bank (Quân Đội)</strong></div>
                <div>• Số tài khoản: <strong>0797268696</strong></div>
                <div>• Chủ tài khoản: <strong>CONG TY DU LICH TOUR FOR YOU</strong></div>
                <div>• Số tiền: <strong style="color: #dc2626;">{price_fmt}</strong></div>
                <div>• Cú pháp chuyển khoản: <strong style="color: #4f46e5; background: #ffffff; padding: 2px 6px; border-radius: 4px;">BOOKING {booking.id}</strong></div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="http://localhost:5173" style="background: #4f46e5; color: #ffffff; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">
                Truy cập Website Tourism →
              </a>
            </div>
          </div>

          <div style="text-align: center; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #94a3b8; font-size: 12px;">
            © 2026 Tourism Project. Đồ án tốt nghiệp. Hotline hỗ trợ: 1900 1234
          </div>
        </div>
        """

        plain_body = f"""Xin chào {booking.contact_name},
Cảm ơn bạn đã đặt tour: {booking.tour.name}
Mã đơn: #{booking.id} (Mã tra cứu: {booking.booking_code})
Ngày khởi hành: {booking.travel_date}
Tổng tiền: {price_fmt}
{account_section_text}
Thông tin chuyển khoản: MB Bank - STK: 0797268696 - Cú pháp: BOOKING {booking.id}
Website: http://localhost:5173
"""

        subject = f"[Tourism] Xác nhận đặt tour: {booking.tour.name} - Mã đơn #{booking.id}"
        from_addr = f"Tourism System <{settings.EMAIL_HOST_USER}>" if getattr(settings, 'EMAIL_HOST_USER', None) else getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@tourism.vn')
        msg = EmailMultiAlternatives(subject, plain_body, from_addr, [booking.contact_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)


class BookingListSerializer(serializers.ModelSerializer):
    """
    Dùng khi HIỂN THỊ danh sách / chi tiết booking (GET) cho Khách hàng.
    Trả về thêm thông tin tour để hiển thị trên MyBookingsPage.
    """

    tour_title     = serializers.CharField(source='tour.name',      read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id',
            'booking_code',
            'tour',
            'tour_title',
            'tour_thumbnail',
            'travel_date',
            'num_adults',
            'num_children',
            'price_adult',
            'price_child',
            'total_price',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
            'status',
            'status_display',
            'created_at',
        ]


class AdminBookingSerializer(serializers.ModelSerializer):
    """
    Dùng cho Admin/Staff – hiển thị đầy đủ thông tin đơn bao gồm cả user và HDV phụ trách.
    """

    tour_title     = serializers.CharField(source='tour.name',       read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail',  read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name  = serializers.SerializerMethodField()
    customer_email = serializers.SerializerMethodField()
    is_guest       = serializers.SerializerMethodField()

    # ── HDV phụ trách đơn ──────────────────────────────
    assigned_guide_id   = serializers.SerializerMethodField()
    assigned_guide_name = serializers.SerializerMethodField()
    # HDV mặc định của tour (để Admin biết nếu đã reassign)
    tour_guide_id   = serializers.SerializerMethodField()
    tour_guide_name = serializers.SerializerMethodField()

    class Meta:
        model  = Booking
        fields = [
            'id',
            'booking_code',
            'tour',
            'tour_title',
            'tour_thumbnail',
            'travel_date',
            'num_adults',
            'num_children',
            'price_adult',
            'price_child',
            'total_price',
            'contact_name',
            'contact_phone',
            'contact_email',
            'special_request',
            'status',
            'status_display',
            'created_at',
            'updated_at',
            # Thông tin khách hàng
            'customer_name',
            'customer_email',
            'is_guest',
            # HDV phụ trách
            'assigned_guide_id',
            'assigned_guide_name',
            'tour_guide_id',
            'tour_guide_name',
        ]

    def get_customer_name(self, obj):
        """Ưu tiên first_name + last_name, fallback về username hoặc contact_name."""
        if obj.user:
            if obj.user.first_name:
                return f"{obj.user.first_name} {obj.user.last_name or ''}".strip()
            return obj.user.username
        return obj.contact_name or 'Khách vãng lai'

    def get_customer_email(self, obj):
        if obj.user and obj.user.email:
            return obj.user.email
        return obj.contact_email

    def get_is_guest(self, obj):
        return obj.user is None

    def get_assigned_guide_id(self, obj):
        return obj.assigned_guide_id  # Django tự sinh field _id

    def get_assigned_guide_name(self, obj):
        if obj.assigned_guide:
            g = obj.assigned_guide
            if g.first_name:
                return f"{g.first_name} {g.last_name or ''}".strip()
            return g.username
        return None

    def get_tour_guide_id(self, obj):
        return obj.tour.guide_id if obj.tour else None

    def get_tour_guide_name(self, obj):
        if obj.tour and obj.tour.guide:
            g = obj.tour.guide
            if g.first_name:
                return f"{g.first_name} {g.last_name or ''}".strip()
            return g.username
        return None


# ─────────────────────────────────────────────────────────────────────────────
# CONSULTATION SERIALIZERS
# ─────────────────────────────────────────────────────────────────────────────
class ConsultationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer tạo yêu cầu tư vấn mới từ khách hàng (Public / Customer).
    Bắt buộc: customer_name, phone, email.
    """
    tour_id = serializers.PrimaryKeyRelatedField(
        queryset=Tour.objects.filter(is_active=True),
        source='tour',
        required=False,
        allow_null=True
    )

    class Meta:
        model = ConsultationRequest
        fields = [
            'id',
            'tour_id',
            'customer_name',
            'phone',
            'email',
            'note',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def validate_customer_name(self, value):
        val = str(value).strip()
        if not val:
            raise serializers.ValidationError('Vui lòng nhập họ và tên của bạn.')
        return val

    def validate_phone(self, value):
        import re
        val = str(value).strip()
        if not val:
            raise serializers.ValidationError('Vui lòng nhập số điện thoại để chúng tôi liên hệ tư vấn.')
        cleaned = re.sub(r'[\s\.\-]', '', val)
        if not re.match(r'^(0|\+84)[0-9]{8,10}$', cleaned):
            raise serializers.ValidationError('Số điện thoại không hợp lệ (gồm 10 số, bắt đầu bằng 0 hoặc +84).')
        return cleaned

    def validate_email(self, value):
        val = str(value).strip().lower()
        if not val:
            raise serializers.ValidationError('Vui lòng nhập email để nhận thông tin tư vấn và ưu đãi.')
        return val

    def create(self, validated_data):
        request = self.context.get('request')
        tour = validated_data.get('tour')
        contact_name = validated_data.get('customer_name', '').strip()
        contact_phone = validated_data.get('phone', '').strip()
        contact_email = validated_data.get('email', '').strip().lower()

        user = None
        new_account_created = False
        initial_password = '123456'

        # 1. Xác định hoặc tạo tài khoản khách hàng
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            user = request.user
            if contact_phone and not user.phone:
                user.phone = contact_phone
                user.save(update_fields=['phone'])
        elif contact_email:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            existing_user = User.objects.filter(email__iexact=contact_email).first()
            if existing_user:
                user = existing_user
                if contact_phone and not user.phone:
                    user.phone = contact_phone
                    user.save(update_fields=['phone'])
            else:
                try:
                    base_uname = contact_email.split('@')[0]
                    uname = base_uname
                    counter = 1
                    while User.objects.filter(username__iexact=uname).exists():
                        uname = f"{base_uname}{counter}"
                        counter += 1

                    name_parts = contact_name.split()
                    last_name = name_parts[0] if len(name_parts) > 1 else ''
                    first_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else contact_name

                    new_user = User.objects.create_user(
                        username=uname,
                        email=contact_email,
                        first_name=first_name,
                        last_name=last_name,
                        phone=contact_phone,
                    )
                    new_user.set_password(initial_password)
                    new_user.save()
                    user = new_user
                    new_account_created = True
                except Exception:
                    user = None

        # 2. Smart Assignment: Tour thuộc HDV nào thì tự động gán cho HDV đó
        assigned_to = None
        if tour and tour.guide:
            assigned_to = tour.guide

        consultation = ConsultationRequest.objects.create(
            **validated_data,
            user=user,
            assigned_to=assigned_to,
            status=ConsultationRequest.STATUS_PENDING,
        )

        # 3. Gửi email xác nhận đã tiếp nhận yêu cầu tư vấn
        try:
            self.send_consultation_confirmation_email(consultation, new_account_created, initial_password)
        except Exception:
            pass

        return consultation

    def send_consultation_confirmation_email(self, consultation, new_account_created=False, initial_password=None):
        """Gửi email xác nhận tiếp nhận yêu cầu tư vấn và thông tin tài khoản nếu mới tạo."""
        if not consultation.email:
            return

        from django.conf import settings
        from django.core.mail import EmailMultiAlternatives

        tour_name = consultation.tour.name if consultation.tour else "Dịch vụ tour du lịch"
        tour_destination = consultation.tour.destination.name if (consultation.tour and consultation.tour.destination) else "Việt Nam"

        account_section_html = ""
        account_section_text = ""

        if new_account_created and consultation.user and initial_password:
            account_section_html = f"""
            <div style="background: #eef2ff; border: 1.5px solid #c7d2fe; border-radius: 8px; padding: 16px; margin: 18px 0;">
              <h3 style="color: #4338ca; margin: 0 0 8px; font-size: 15px;">🔐 Thông tin tài khoản dành riêng cho bạn</h3>
              <p style="color: #374151; font-size: 13px; margin: 0 0 8px; line-height: 1.5;">
                Chúng tôi đã kích hoạt tài khoản thành viên để bạn có thể theo dõi yêu cầu tư vấn và lịch trình tour thuận tiện:
              </p>
              <div style="font-size: 13px; color: #1e293b; line-height: 1.8;">
                <div><strong>Tên đăng nhập / Email:</strong> <code style="background: #ffffff; padding: 2px 6px; border-radius: 4px; color: #4338ca;">{consultation.user.username}</code> ({consultation.email})</div>
                <div><strong>Mật khẩu ban đầu:</strong> <span style="background: #ffffff; padding: 2px 8px; border-radius: 4px; font-weight: 700; color: #4f46e5; letter-spacing: 1px;">{initial_password}</span></div>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin: 8px 0 0;">
                💡 Bạn có thể đăng nhập tại website để đổi mật khẩu và xem các ưu đãi đặc quyền.
              </p>
            </div>
            """
            account_section_text = f"\nThông tin tài khoản đăng nhập:\nTên đăng nhập: {consultation.user.username}\nMật khẩu: {initial_password}\n"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #f1f5f9;">
            <h2 style="color: #4f46e5; margin: 0; font-size: 24px;">🌍 Tourism</h2>
            <p style="color: #64748b; margin: 4px 0 0; font-size: 13px;">Hệ Thống Đặt Tour & Chăm Sóc Khách Hàng</p>
          </div>

          <div style="padding: 20px 0;">
            <p style="color: #1e293b; font-size: 15px; margin: 0 0 12px;">Xin chào <strong>{consultation.customer_name}</strong>,</p>
            <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              Cảm ơn bạn đã quan tâm đến dịch vụ du lịch của chúng tôi! Hệ thống đã ghi nhận yêu cầu tư vấn của bạn thành công. Chuyên viên tư vấn hoặc Hướng dẫn viên phụ trách sẽ liên hệ lại với bạn qua số điện thoại <strong>{consultation.phone}</strong> trong thời gian sớm nhất.
            </p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <h3 style="color: #0f172a; margin: 0 0 12px; font-size: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">📋 Chi tiết yêu cầu tư vấn</h3>
              <table style="width: 100%; font-size: 13px; color: #334155; line-height: 1.8;">
                <tr><td style="width: 140px; color: #64748b;">Mã yêu cầu:</td><td><strong>#TV{consultation.id}</strong></td></tr>
                <tr><td style="color: #64748b;">Tour quan tâm:</td><td><strong>{tour_name}</strong> ({tour_destination})</td></tr>
                <tr><td style="color: #64748b;">Họ và tên:</td><td>{consultation.customer_name}</td></tr>
                <tr><td style="color: #64748b;">Số điện thoại:</td><td><strong style="color: #0284c7;">{consultation.phone}</strong></td></tr>
                <tr><td style="color: #64748b;">Email:</td><td>{consultation.email}</td></tr>
                {f'<tr><td style="color: #64748b; vertical-align: top;">Nội dung lưu ý:</td><td><em>{consultation.note}</em></td></tr>' if consultation.note else ''}
              </table>
            </div>

            {account_section_html}

            <div style="margin-top: 20px; padding: 14px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; font-size: 13px; color: #166534;">
              📞 Nếu bạn cần hỗ trợ khẩn cấp, đừng ngần ngại gọi ngay Hotline: <strong>1900 6868</strong> để được hỗ trợ 24/7.
            </div>
          </div>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 14px; text-align: center; color: #94a3b8; font-size: 12px;">
            © Tourism Vietnam - Chúc bạn có những hành trình tuyệt vời!
          </div>
        </div>
        """

        text_content = f"""Xin chào {consultation.customer_name},

Hệ thống đã ghi nhận yêu cầu tư vấn của bạn thành công!
Mã yêu cầu: #TV{consultation.id}
Tour quan tâm: {tour_name}
Số điện thoại: {consultation.phone}
{account_section_text}
Chuyên viên sẽ liên hệ lại với bạn sớm nhất có thể.
Hotline: 1900 6868
"""

        subject = f"[Tourism] Tiếp nhận yêu cầu tư vấn Tour: {tour_name}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@tourism.com')
        to_email = consultation.email

        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=True)


class ConsultationCustomerSerializer(serializers.ModelSerializer):
    """Serializer cho khách hàng xem danh sách yêu cầu tư vấn của chính mình."""
    tour_name = serializers.CharField(source='tour.name', read_only=True)
    tour_thumbnail = serializers.CharField(source='tour.thumbnail', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ConsultationRequest
        fields = [
            'id',
            'tour',
            'tour_name',
            'tour_thumbnail',
            'customer_name',
            'phone',
            'email',
            'note',
            'status',
            'status_display',
            'created_at',
        ]


class AdminConsultationSerializer(serializers.ModelSerializer):
    """Serializer đầy đủ cho Admin và HDV quản lý tư vấn."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    tour_name = serializers.SerializerMethodField()
    tour_thumbnail = serializers.SerializerMethodField()
    tour_price = serializers.SerializerMethodField()
    tour_destination = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    tour_guide_name = serializers.SerializerMethodField()

    class Meta:
        model = ConsultationRequest
        fields = [
            'id',
            'customer_name',
            'phone',
            'email',
            'note',
            'status',
            'status_display',
            'admin_note',
            'tour',
            'tour_name',
            'tour_thumbnail',
            'tour_price',
            'tour_destination',
            'assigned_to',
            'assigned_to_name',
            'tour_guide_name',
            'user',
            'created_at',
            'updated_at',
        ]

    def get_tour_name(self, obj):
        return obj.tour.name if obj.tour else None

    def get_tour_thumbnail(self, obj):
        return obj.tour.thumbnail if obj.tour else None

    def get_tour_price(self, obj):
        if obj.tour:
            return float(obj.tour.final_price if (hasattr(obj.tour, 'final_price') and obj.tour.is_priority_sale and (obj.tour.sale_percent or 0) > 0) else obj.tour.price_adult)
        return None

    def get_tour_destination(self, obj):
        if obj.tour and obj.tour.destination:
            return obj.tour.destination.name
        return None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name or ''}".strip()
            return full if full else obj.assigned_to.username
        return None

    def get_tour_guide_name(self, obj):
        if obj.tour and obj.tour.guide:
            full = f"{obj.tour.guide.first_name} {obj.tour.guide.last_name or ''}".strip()
            return full if full else obj.tour.guide.username
        return None


class AdminConsultationUpdateSerializer(serializers.ModelSerializer):
    """Serializer cập nhật trạng thái, ghi chú và người phụ trách ca tư vấn."""
    class Meta:
        model = ConsultationRequest
        fields = ['status', 'admin_note', 'assigned_to']

    def validate_assigned_to(self, value):
        if value is not None and not (value.is_staff or value.is_superuser):
            raise serializers.ValidationError('Chỉ có thể phân công cho Nhân viên / Hướng dẫn viên hoặc Quản trị viên.')
        return value

