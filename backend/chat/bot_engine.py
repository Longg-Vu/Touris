"""
BOT ENGINE - Hệ thống trợ lý ảo thông minh 24/7 của Tourism
=============================================================
Tự động phân tích từ khóa, trả lời câu hỏi thường gặp, gợi ý tour Sale,
và chuyển giao cuộc trò chuyện cho Admin/HDV khi cần thiết.
"""

from tours.models import Tour
from .models import ChatMessage, ChatSession


def get_quick_options():
    """Danh sách các nút bấm câu hỏi nhanh cho khách hàng."""
    return [
        {"id": "opt_sale",      "label": "🔥 Tour ưu đãi Sale hôm nay", "query": "Xem tour giảm giá hôm nay"},
        {"id": "opt_children",  "label": "👶 Chính sách giá vé trẻ em",  "query": "Chính sách giá vé trẻ em ra sao?"},
        {"id": "opt_payment",   "label": "💳 Cách đặt tour & thanh toán", "query": "Tôi muốn biết phương thức thanh toán"},
        {"id": "opt_cancel",    "label": "🛡️ Chính sách huỷ & hoàn tiền", "query": "Chính sách huỷ tour thế nào?"},
        {"id": "opt_agent",     "label": "👨‍💼 Gặp nhân viên / HDV",       "query": "Tôi muốn gặp nhân viên tư vấn trực tiếp"},
    ]


def ensure_welcome_message(session):
    """
    Tạo tin nhắn chào mừng kèm các nút gợi ý nếu phiên chat chưa có tin nhắn nào.
    """
    if session.messages.exists():
        return

    tour = session.current_tour
    if tour:
        welcome_text = (
            f"👋 Xin chào bạn! Tôi là trợ lý ảo thông minh của **Tourism Vietnam**.\n\n"
            f"Bạn đang quan tâm đến tour **{tour.name}** "
            f"({tour.destination.name if tour.destination else 'Việt Nam'}) đúng không ạ?\n\n"
            f"Tôi có thể hỗ trợ nhanh về giá vé, lịch trình, hoặc chuyển lời nhắn cho "
            f"**Hướng dẫn viên phụ trách tuyến này** để chat cùng bạn ngay nhé!"
        )
    else:
        welcome_text = (
            "👋 Xin chào bạn! Chào mừng bạn đến với **Tourism Vietnam** — Hệ thống du lịch & tour trải nghiệm hàng đầu.\n\n"
            "Tôi là trợ lý ảo túc trực 24/7. Bạn có thể chọn câu hỏi nhanh bên dưới hoặc tự gõ thắc mắc để được giải đáp ngay nhé!"
        )

    ChatMessage.objects.create(
        session=session,
        sender_type=ChatMessage.SENDER_BOT,
        message=welcome_text,
        message_type='text',
        metadata={
            'quick_options': get_quick_options(),
            'is_welcome': True,
        }
    )


def process_customer_message(session, customer_text):
    """
    Xử lý tin nhắn khách hàng vừa gửi và sinh câu trả lời tự động thông minh.
    """
    text_lower = customer_text.strip().lower()

    # 1. Khách hỏi về Giá vé trẻ em / em bé / độ tuổi (Kiểm tra TRƯỚC nhánh Sale vì chữ 'trẻ' chứa 'rẻ')
    if any(kw in text_lower for kw in ['trẻ em', 'em bé', 'trẻ con', 'nhi đồng', 'độ tuổi', 'vé trẻ']):
        reply_text = (
            "👶 **Chính sách giá vé trẻ em tại Tourism Vietnam:**\n\n"
            "• **Dưới 3 tuổi:** Hoàn toàn **MIỄN PHÍ 100%** (ngồi chung ghế và ăn chung với bố mẹ).\n"
            "• **Từ 3 – 11 tuổi:** Tính **70% giá người lớn** (có chỗ ngồi riêng, suất ăn và vé tham quan đầy đủ).\n"
            "• **Từ 12 tuổi trở lên:** Tính như vé người lớn tiêu chuẩn.\n\n"
            "💡 Nếu đoàn có nhiều trẻ em hoặc cần hỗ trợ đặc biệt (xe đẩy, nôi em bé...), bạn có thể nhắn lại để HDV chuẩn bị trước nhé!"
        )
        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message=reply_text,
            message_type='text',
        )
        return

    # 2. Khách hỏi về Sale / Giảm giá / Khuyến mãi / Tour hot
    if any(kw in text_lower for kw in ['giảm giá', 'sale', 'ưu đãi', 'khuyến mãi', 'giá rẻ', 'tour rẻ', 'tour hot', 'đang hot', 'deal']):
        # Lấy các tour đang có ưu đãi
        sale_tours = list(Tour.objects.filter(is_active=True, is_priority_sale=True).select_related('destination')[:4])
        if len(sale_tours) < 4:
            more_tours = Tour.objects.filter(is_active=True, is_hot=True).exclude(id__in=[t.id for t in sale_tours]).select_related('destination')[:4 - len(sale_tours)]
            sale_tours.extend(more_tours)

        tours_data = []
        for t in sale_tours:
            final_p = float(t.final_price) if hasattr(t, 'final_price') and t.final_price else float(t.price_adult)
            orig_p  = float(t.price_adult)
            tours_data.append({
                'id': t.id,
                'name': t.name,
                'thumbnail': t.thumbnail,
                'destination': t.destination.name if t.destination else 'Việt Nam',
                'original_price': orig_p,
                'final_price': final_p,
                'sale_percent': t.sale_percent if t.is_priority_sale else 0,
            })

        reply_text = (
            "🎉 Dạ đây là danh sách những **Tour đang có chương trình Ưu đãi & Hot nhất hôm nay** "
            "dành riêng cho bạn! Bạn có thể bấm vào từng tour để xem chi tiết lịch trình nhé:"
        )

        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message=reply_text,
            message_type='tours_carousel',
            metadata={'tours': tours_data}
        )
        return

    # 3. Khách hỏi về Phương thức đặt tour & Thanh toán
    if any(kw in text_lower for kw in ['thanh toán', 'chuyển khoản', 'vietqr', 'tiền mặt', 'đặt cọc', 'trả tiền', 'ngân hàng']):
        reply_text = (
            "💳 **Phương thức đặt tour & Thanh toán siêu tiện lợi:**\n\n"
            "1. **Quét mã VietQR tự động:** Xác nhận thanh toán ngay lập tức không cần chụp màn hình chuyển khoản.\n"
            "2. **Thanh toán sau / Nhận tư vấn:** Bạn có thể bấm *'Cần tư vấn thêm'* để chuyên viên gọi điện hỗ trợ, chốt lịch trình rồi thanh toán sau.\n"
            "3. **Bảo mật tuyệt đối:** Hoàn tiền 100% theo chính sách nếu có thay đổi đột xuất."
        )
        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message=reply_text,
            message_type='text',
        )
        return

    # 4. Khách hỏi về Huỷ tour & Hoàn tiền
    if any(kw in text_lower for kw in ['huỷ', 'hủy', 'hoàn tiền', 'đổi ngày', 'đổi tour', 'hoàn vé']):
        reply_text = (
            "🛡️ **Chính sách Huỷ tour & Hoàn tiền an tâm 100%:**\n\n"
            "• **Miễn phí huỷ trước 24 giờ:** Hoàn lại **100% số tiền** nếu bạn huỷ tour trước giờ khởi hành ít nhất 24h.\n"
            "• **Huỷ trong vòng 24 giờ:** Áp dụng phí theo quy định dịch vụ (phương tiện, khách sạn đã đặt trước).\n"
            "• **Hỗ trợ đổi ngày:** Tourism hỗ trợ chuyển đổi ngày khởi hành miễn phí nếu thông báo sớm."
        )
        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message=reply_text,
            message_type='text',
        )
        return

    # 5. Khách muốn gặp nhân viên / HDV thật
    if any(kw in text_lower for kw in ['nhân viên', 'tư vấn viên', 'hdv', 'hướng dẫn viên', 'người thật', 'alo', 'gọi điện', 'gọi lại', 'liên hệ']):
        guide_name = ""
        if session.current_tour and session.current_tour.guide:
            g = session.current_tour.guide
            full = f"{g.first_name} {g.last_name or ''}".strip()
            guide_name = f" (**HDV {full or g.username}** phụ trách tuyến)"

        reply_text = (
            f"👨‍💼 Dạ em đã kích hoạt kết nối đến chuyên viên tư vấn{guide_name} rồi ạ!\n\n"
            "Quý khách có thể gửi câu hỏi cụ thể hoặc để lại **Số điện thoại** tại đây. "
            "Nhân viên đang trực tuyến và sẽ phản hồi lại bạn ngay trong khung chat này nhé! 💬"
        )

        session.status = ChatSession.STATUS_WAITING_STAFF
        session.unread_staff_count += 1
        session.save(update_fields=['status', 'unread_staff_count', 'updated_at'])

        ChatMessage.objects.create(
            session=session,
            sender_type=ChatMessage.SENDER_BOT,
            message=reply_text,
            message_type='text',
        )
        return

    # 6. Các câu hỏi tự do khác (Free-form inquiry)
    # Chỉ khi nhân viên / HDV đã thực sự tham gia trả lời trong phiên này,
    # Bot mới ngừng trả lời tự động để cuộc trò chuyện diễn ra tự nhiên giữa người với người.
    has_staff_replied = session.messages.filter(sender_type=ChatMessage.SENDER_STAFF).exists()
    if session.status == ChatSession.STATUS_ACTIVE and has_staff_replied:
        session.unread_staff_count += 1
        session.save(update_fields=['unread_staff_count', 'updated_at'])
        return

    guide_name = ""
    if session.current_tour and session.current_tour.guide:
        g = session.current_tour.guide
        full = f"{g.first_name} {g.last_name or ''}".strip()
        guide_name = f" (**HDV {full or g.username}** phụ trách tour)"

    reply_text = (
        "Dạ em đã ghi nhận thắc mắc của quý khách: "
        f"\"{customer_text}\"\n\n"
        f"Em đã chuyển tiếp tin nhắn đến bộ phận tư vấn{guide_name}. "
        "Nhân viên đang trực tuyến và sẽ phản hồi trực tiếp cho bạn ngay tại đây trong giây lát nhé! ⏱️"
    )

    session.status = ChatSession.STATUS_WAITING_STAFF
    session.unread_staff_count += 1
    session.save(update_fields=['status', 'unread_staff_count', 'updated_at'])

    ChatMessage.objects.create(
        session=session,
        sender_type=ChatMessage.SENDER_BOT,
        message=reply_text,
        message_type='text',
    )
