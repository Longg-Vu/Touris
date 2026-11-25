import os
import math
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"d:\DoAnTotNghiep\Tourism\bieu_do_bao_cao"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_REG_PATH = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/arialbd.ttf"
FONT_ITALIC_PATH = "C:/Windows/Fonts/arialbi.ttf"


def get_font(size, bold=False, italic=False):
    if italic:
        return ImageFont.truetype(FONT_ITALIC_PATH, size)
    if bold:
        return ImageFont.truetype(FONT_BOLD_PATH, size)
    return ImageFont.truetype(FONT_REG_PATH, size)


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = ""
    for w in words:
        test = (current + " " + w).strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] - bbox[0] <= max_width or not current:
            current = test
        else:
            lines.append(current)
            current = w
    if current:
        lines.append(current)
    return lines


def draw_centered_text(draw, cx, cy, text, font, fill="#0f172a", max_width=380):
    lines = wrap_text(draw, text, font, max_width)
    heights = []
    widths = []
    for l in lines:
        bbox = draw.textbbox((0, 0), l, font=font)
        widths.append(bbox[2] - bbox[0])
        heights.append(bbox[3] - bbox[1])
    total_h = sum(heights) + (len(lines) - 1) * 6
    cur_y = cy - total_h / 2
    for i, l in enumerate(lines):
        draw.text((cx - widths[i] / 2, cur_y), l, font=font, fill=fill)
        cur_y += heights[i] + 6


def draw_action_box(draw, cx, cy, w, h, text, fill="#f8fafc", outline="#1e293b", font_size=22):
    x1, y1 = cx - w // 2, cy - h // 2
    x2, y2 = cx + w // 2, cy + h // 2
    draw.rounded_rectangle([x1, y1, x2, y2], radius=20, fill=fill, outline=outline, width=3)
    font = get_font(font_size, bold=True)
    draw_centered_text(draw, cx, cy, text, font, fill="#0f172a", max_width=w - 28)


def draw_diamond(draw, cx, cy, rx, ry, label="", fill="#f8fafc", outline="#1e293b", font_size=19):
    pts = [(cx, cy - ry), (cx + rx, cy), (cx, cy + ry), (cx - rx, cy)]
    draw.polygon(pts, fill=fill, outline=outline)
    draw.line(pts + [pts[0]], fill=outline, width=3)
    if label:
        font = get_font(font_size, bold=True)
        draw_centered_text(draw, cx, cy, label, font, fill="#0f172a", max_width=int(rx * 1.42))


def draw_start_node(draw, cx, cy, r=18):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#0f172a", outline="#0f172a")


def draw_end_node(draw, cx, cy, r=22):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#ffffff", outline="#0f172a", width=4)
    ir = r - 7
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill="#0f172a", outline="#0f172a")


def draw_arrow(draw, x1, y1, x2, y2, label="", dashed=False, color="#0f172a", label_offset=(0, -24), font_size=19):
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist == 0:
        return
    ux = dx / dist
    uy = dy / dist

    if dashed:
        dash_len, gap_len = 11, 7
        pos = 0
        while pos < dist - 12:
            end_pos = min(pos + dash_len, dist - 12)
            draw.line(
                [x1 + ux * pos, y1 + uy * pos, x1 + ux * end_pos, y1 + uy * end_pos],
                fill=color,
                width=3,
            )
            pos += dash_len + gap_len
    else:
        draw.line([x1, y1, x2 - ux * 10, y2 - uy * 10], fill=color, width=3)

    arrow_len = 15
    arrow_angle = math.radians(26)
    angle = math.atan2(dy, dx)
    ax1 = x2 - arrow_len * math.cos(angle - arrow_angle)
    ay1 = y2 - arrow_len * math.sin(angle - arrow_angle)
    ax2 = x2 - arrow_len * math.cos(angle + arrow_angle)
    ay2 = y2 - arrow_len * math.sin(angle + arrow_angle)
    if dashed:
        draw.line([x2, y2, ax1, ay1], fill=color, width=3)
        draw.line([x2, y2, ax2, ay2], fill=color, width=3)
    else:
        draw.polygon([(x2, y2), (ax1, ay1), (ax2, ay2)], fill=color)

    if label:
        font = get_font(font_size, bold=True)
        mx = (x1 + x2) / 2 + label_offset[0]
        my = (y1 + y2) / 2 + label_offset[1]
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.rectangle([mx - tw / 2 - 6, my - 3, mx + tw / 2 + 6, my + th + 4], fill="#ffffff")
        draw.text((mx - tw / 2, my), label, font=font, fill="#0f172a")


def draw_polyline_arrow(draw, pts, label="", color="#0f172a", label_pos=None, font_size=19):
    for i in range(len(pts) - 2):
        draw.line([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]], fill=color, width=3)
    x1, y1 = pts[-2]
    x2, y2 = pts[-1]
    draw_arrow(draw, x1, y1, x2, y2, label="", color=color)
    if label and label_pos:
        font = get_font(font_size, bold=True)
        lx, ly = label_pos
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.rectangle([lx - tw / 2 - 6, ly - 3, lx + tw / 2 + 6, ly + th + 4], fill="#ffffff")
        draw.text((lx - tw / 2, ly), label, font=font, fill="#0f172a")


def draw_actor_header(draw, cx, top_y, label):
    r = 16
    hcy = top_y + 18
    draw.ellipse([cx - r, hcy - r, cx + r, hcy + r], fill="#ffffff", outline="#0f172a", width=3)
    draw.line([cx, hcy + r, cx, hcy + 42], fill="#0f172a", width=3)
    draw.line([cx - 24, hcy + 26, cx + 24, hcy + 26], fill="#0f172a", width=3)
    draw.line([cx, hcy + 42, cx - 18, hcy + 64], fill="#0f172a", width=3)
    draw.line([cx, hcy + 42, cx + 18, hcy + 64], fill="#0f172a", width=3)
    font = get_font(20, bold=True)
    draw_centered_text(draw, cx, top_y + 104, label, font, fill="#0f172a", max_width=230)


def draw_lifeline_box(draw, cx, top_y, label, fill="#eff6ff", outline="#1d4ed8"):
    w, h = 250, 74
    x1, y1 = cx - w // 2, top_y + 24
    x2, y2 = cx + w // 2, y1 + h
    draw.rectangle([x1, y1, x2, y2], fill=fill, outline=outline, width=3)
    font = get_font(20, bold=True)
    draw_centered_text(draw, cx, (y1 + y2) / 2, label, font, fill="#0f172a", max_width=w - 16)


def generate_activity_booking_vietqr():
    """2.5.1. Biểu đồ hoạt động luồng Đặt tour và quét mã VietQR (Chữ to rõ nét)"""
    W, H = 1380, 1420
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    left_x, top_y, right_x, bot_y = 16, 16, W - 16, H - 16
    mid_x = W // 2
    header_h = 66

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#0f172a", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#e2e8f0", outline="#0f172a", width=3)
    draw.line([mid_x, top_y, mid_x, bot_y], fill="#0f172a", width=3)

    font_header = get_font(26, bold=True)
    draw_centered_text(draw, (left_x + mid_x) // 2, top_y + header_h // 2, "Khách hàng", font_header)
    draw_centered_text(draw, (mid_x + right_x) // 2, top_y + header_h // 2, "Hệ thống Tourism", font_header)

    c_kh = (left_x + mid_x) // 2       # 353
    c_sys = (mid_x + right_x) // 2     # 1027
    bw, bh = 510, 80

    y_start = 125
    y_step1 = 225
    y_step2 = 225
    y_step3 = 370
    y_dec1 = 370
    y_step4 = 520
    y_step5 = 650
    y_step6 = 780
    y_dec2 = 855
    y_pay_branch = 1030
    y_sys_confirm = 1030
    y_sys_hold = 1190
    y_end = 1330

    draw_start_node(draw, c_kh, y_start)
    draw_action_box(draw, c_kh, y_step1, bw, bh, "Chọn ngày khởi hành, số lượng người lớn và trẻ em")
    draw_action_box(draw, c_sys, y_step2, bw, bh, "Áp dụng đơn giá (Flash Sale nếu có) và tính tổng tiền")
    draw_action_box(draw, c_kh, y_step3, bw, bh, "Nhập Họ tên, SĐT, Email, Yêu cầu đặc biệt & Gửi đơn")
    draw_diamond(draw, c_sys, y_dec1, 145, 52, "Dữ liệu hợp lệ?")

    draw_action_box(draw, c_sys, y_step4, bw + 20, bh, "Tạo đơn (Chờ xác nhận), sinh mã BK... & gán Hướng dẫn viên")
    draw_action_box(draw, c_sys, y_step5, bw + 20, bh, "Tạo tài khoản tự động (nếu email mới) & Gửi Email SMTP")
    draw_action_box(draw, c_sys, y_step6, bw + 20, bh, "Sinh mã QR VietQR động chứa số tiền & nội dung đơn")

    draw_diamond(draw, c_kh, y_dec2, 155, 52, "Thanh toán ngay?")

    c_kh_left = left_x + 170
    c_kh_right = mid_x - 170
    draw_action_box(draw, c_kh_left, y_pay_branch, 305, 88, "Bấm Thanh toán sau (Giữ chỗ trong 24 giờ)", font_size=21)
    draw_action_box(draw, c_kh_right, y_pay_branch, 305, 88, "Quét mã VietQR & Bấm Đã thanh toán", font_size=21)

    draw_action_box(draw, c_sys, y_sys_confirm, bw + 10, bh, "Ghi nhận thanh toán & Chuyển đơn sang Đã xác nhận")
    draw_action_box(draw, c_sys, y_sys_hold, bw + 10, bh, "Giữ đơn Chờ xác nhận & Hiển thị mã tra cứu BK...")

    draw_end_node(draw, c_sys, y_end)

    # Arrows
    draw_arrow(draw, c_kh, y_start + 18, c_kh, y_step1 - bh // 2)
    draw_arrow(draw, c_kh + bw // 2, y_step1, c_sys - bw // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 295), (c_kh, 295), (c_kh, y_step3 - bh // 2)])
    draw_arrow(draw, c_kh + bw // 2, y_step3, c_sys - 145, y_dec1)

    draw_polyline_arrow(
        draw,
        [(c_sys, y_dec1 - 52), (c_sys, 312), (c_kh + 120, 312), (c_kh + 120, y_step3 - bh // 2)],
        label="[Không hợp lệ - Báo lỗi]",
        label_pos=((c_sys + c_kh) // 2 + 55, 290),
    )

    draw_arrow(draw, c_sys, y_dec1 + 52, c_sys, y_step4 - bh // 2, label="[Hợp lệ]", label_offset=(55, -12))
    draw_arrow(draw, c_sys, y_step4 + bh // 2, c_sys, y_step5 - bh // 2)
    draw_arrow(draw, c_sys, y_step5 + bh // 2, c_sys, y_step6 - bh // 2)

    draw_polyline_arrow(
        draw,
        [(c_sys - (bw + 20) // 2, y_step6), (c_kh, y_step6), (c_kh, y_dec2 - 52)],
    )

    draw_polyline_arrow(
        draw,
        [(c_kh - 155, y_dec2), (c_kh_left, y_dec2), (c_kh_left, y_pay_branch - 44)],
        label="[Thanh toán sau]",
        label_pos=(c_kh_left - 5, y_dec2 - 30),
    )
    draw_polyline_arrow(
        draw,
        [(c_kh + 155, y_dec2), (c_kh_right, y_dec2), (c_kh_right, y_pay_branch - 44)],
        label="[Thanh toán ngay]",
        label_pos=(c_kh_right + 5, y_dec2 - 30),
    )

    draw_arrow(draw, c_kh_right + 305 // 2, y_pay_branch, c_sys - (bw + 10) // 2, y_sys_confirm)
    draw_polyline_arrow(
        draw,
        [(c_kh_left, y_pay_branch + 44), (c_kh_left, y_sys_hold), (c_sys - (bw + 10) // 2, y_sys_hold)],
    )

    draw_polyline_arrow(
        draw,
        [(c_sys + (bw + 10) // 2, y_sys_confirm), (right_x - 32, y_sys_confirm), (right_x - 32, y_end), (c_sys + 22, y_end)],
    )
    draw_arrow(draw, c_sys, y_sys_hold + bh // 2, c_sys, y_end - 22)

    path = os.path.join(OUT_DIR, "Hinh_2_5_Activity_DatTour_VietQR.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_sequence_consultation():
    """2.5.2. Biểu đồ tuần tự luồng Gửi yêu cầu tư vấn gọi lại (Chữ to rõ nét)"""
    W, H = 1540, 1280
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([14, 14, W - 14, H - 14], fill="#ffffff", outline="#0f172a", width=3)

    cols = [
        (135, "actor", "Khách hàng"),
        (445, "box", "Giao diện ReactJS\n(TourDetailPage)"),
        (780, "box", "Backend API\n(ConsultationViewSet)"),
        (1115, "box", "CSDL PostgreSQL\n& Gmail SMTP"),
        (1405, "actor", "Hướng dẫn viên du lịch"),
    ]

    top_y = 28
    line_start_y = 170
    line_end_y = H - 35

    for cx, kind, label in cols:
        if kind == "actor":
            draw_actor_header(draw, cx, top_y, label)
        else:
            draw_lifeline_box(draw, cx, top_y, label)
        pos = line_start_y
        while pos < line_end_y:
            draw.line([cx, pos, cx, min(pos + 12, line_end_y)], fill="#64748b", width=3)
            pos += 20

    act_bars = [
        (445, 200, 710),
        (780, 260, 650),
        (1115, 325, 585),
        (1405, 765, 1190),
        (780, 785, 1185),
        (1115, 920, 1115),
    ]
    for cx, y1, y2 in act_bars:
        draw.rectangle([cx - 9, y1, cx + 9, y2], fill="#dbeafe", outline="#1e40af", width=3)

    msgs = [
        (135, 436, 220, "1: Nhập Họ tên, SĐT, Email & Nội dung tư vấn", False),
        (454, 771, 285, "2: POST /api/bookings/consultations/ (tour_id, thông tin)", False),
        (789, 1106, 350, "3: Kiểm tra tour & tìm/tạo tài khoản theo Email", False),
        (1106, 789, 415, "4: Trả về User & Hướng dẫn viên phụ trách tour", True),
        (789, 1106, 480, "5: Lưu phiếu tư vấn (pending, gán HDV của tour)", False),
        (789, 1106, 545, "6: Gửi Email xác nhận tiếp nhận (#TV...) qua SMTP", False),
        (1106, 789, 610, "7: Xác nhận lưu CSDL & gửi Email thành công", True),
        (771, 454, 665, "8: Trả về JSON (201 Created - Phiếu tư vấn)", True),
        (436, 135, 720, "9: Hiển thị thông báo gửi yêu cầu thành công", True),
        (1396, 789, 800, "10: GET /api/bookings/admin/consultations/ (Lọc theo HDV)", False),
        (789, 1396, 865, "11: Trả về danh sách phiếu tư vấn được phân công", True),
        (1396, 789, 935, "12: POST .../claim/ (Nhận ca -> chuyển sang Đã liên hệ)", False),
        (789, 1106, 1000, "13: Cập nhật trạng thái contacted & người phụ trách", False),
        (1396, 789, 1075, "14: PATCH .../ (Ghi chú cuộc gọi & chốt Đã giải quyết)", False),
        (789, 1396, 1145, "15: Xác nhận hoàn tất xử lý ca tư vấn", True),
    ]

    for x1, x2, y, text, is_dashed in msgs:
        draw_arrow(draw, x1, y, x2, y, label=text, dashed=is_dashed, color="#0f172a", label_offset=(0, -25), font_size=20)

    path = os.path.join(OUT_DIR, "Hinh_2_6_Sequence_TuVanGoiLai.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_sequence_livechat():
    """2.5.3. Biểu đồ tuần tự luồng Trò chuyện trực tuyến (Live Chat & Bot - Chữ to rõ nét)"""
    W, H = 1560, 1400
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([14, 14, W - 14, H - 14], fill="#ffffff", outline="#0f172a", width=3)

    cols = [
        (130, "actor", "Khách hàng"),
        (435, "box", "MiniChatWidget\n(ReactJS)"),
        (765, "box", "Chat API & Bot Engine\n(Django DRF)"),
        (1105, "box", "CSDL PostgreSQL\n(Session & Message)"),
        (1425, "actor", "Hướng dẫn viên du lịch"),
    ]

    top_y = 28
    line_start_y = 170
    line_end_y = H - 35

    for cx, kind, label in cols:
        if kind == "actor":
            draw_actor_header(draw, cx, top_y, label)
        else:
            draw_lifeline_box(draw, cx, top_y, label)
        pos = line_start_y
        while pos < line_end_y:
            draw.line([cx, pos, cx, min(pos + 12, line_end_y)], fill="#64748b", width=3)
            pos += 20

    act_bars = [
        (435, 195, 1280),
        (765, 225, 1345),
        (1105, 270, 1140),
        (1425, 1005, 1345),
    ]
    for cx, y1, y2 in act_bars:
        draw.rectangle([cx - 9, y1, cx + 9, y2], fill="#dbeafe", outline="#1e40af", width=3)

    alt_x1, alt_y1, alt_x2, alt_y2 = 45, 515, W - 45, 1365
    draw.rectangle([alt_x1, alt_y1, alt_x2, alt_y2], outline="#1e3a8a", width=3)
    draw.polygon(
        [(alt_x1, alt_y1), (alt_x1 + 88, alt_y1), (alt_x1 + 106, alt_y1 + 20), (alt_x1 + 88, alt_y1 + 40), (alt_x1, alt_y1 + 40)],
        fill="#dbeafe",
        outline="#1e3a8a",
    )
    font_alt = get_font(20, bold=True)
    draw.text((alt_x1 + 24, alt_y1 + 8), "alt", font=font_alt, fill="#1e3a8a")

    g1_text = "[Trường hợp 1: Khách hỏi theo từ khóa kịch bản (Sale, Vé trẻ em, Thanh toán, Hoàn hủy)]"
    g1_bbox = draw.textbbox((0, 0), g1_text, font=font_alt)
    g1_w = g1_bbox[2] - g1_bbox[0]
    g1_x, g1_y = alt_x1 + 120, alt_y1 + 8
    draw.rectangle([g1_x - 6, g1_y - 2, g1_x + g1_w + 6, g1_y + 26], fill="#ffffff")
    draw.text((g1_x, g1_y), g1_text, font=font_alt, fill="#1e3a8a")

    div_y = 835
    pos = alt_x1
    while pos < alt_x2:
        draw.line([pos, div_y, min(pos + 14, alt_x2), div_y], fill="#1e3a8a", width=3)
        pos += 22

    g2_text = "[Trường hợp 2: Khách yêu cầu gặp tư vấn viên hoặc hỏi chuyên sâu ngoài kịch bản]"
    g2_bbox = draw.textbbox((0, 0), g2_text, font=font_alt)
    g2_w = g2_bbox[2] - g2_bbox[0]
    g2_x, g2_y = alt_x1 + 120, div_y + 10
    draw.rectangle([g2_x - 6, g2_y - 2, g2_x + g2_w + 6, g2_y + 26], fill="#ffffff")
    draw.text((g2_x, g2_y), g2_text, font=font_alt, fill="#1e3a8a")

    msgs = [
        (130, 426, 210, "1: Mở khung chat nổi tại trang chi tiết tour", False),
        (444, 756, 265, "2: POST /api/chat/init/ (session_id, tour_id)", False),
        (774, 1096, 320, "3: Khởi tạo ChatSession & gán HDV của tour", False),
        (756, 444, 375, "4: Trả về lời chào của Chatbot & nút gợi ý nhanh", True),
        (130, 426, 430, "5: Gửi câu hỏi tư vấn vào khung chat", False),
        (444, 756, 485, "6: POST /api/chat/messages/ (session_id, message)", False),

        (774, 1096, 595, "7a: Lưu tin nhắn khách & Truy vấn tour Sale / chính sách", False),
        (1096, 774, 655, "8a: Trả về danh sách tour đang Sale & lưu phản hồi Bot", True),
        (756, 444, 720, "9a: Trả về JSON tin nhắn Bot (kèm thẻ tours_carousel)", True),
        (426, 130, 785, "10a: Hiển thị câu trả lời tự động trên khung chat", True),

        (774, 1096, 915, "7b: Chuyển phiên sang Chờ nhân viên (waiting_staff)", False),
        (756, 444, 975, "8b: Bot thông báo đã kết nối Hướng dẫn viên phụ trách", True),
        (1416, 774, 1045, "9b: Hướng dẫn viên gửi câu trả lời (POST .../reply/)", False),
        (774, 1096, 1110, "10b: Lưu tin nhắn nhân sự & chuyển về Đang trò chuyện", False),
        (444, 756, 1180, "11b: GET /api/chat/messages/poll/ (Đồng bộ tin nhắn mới)", False),
        (756, 130, 1250, "12b: Hiển thị phản hồi trực tiếp của Hướng dẫn viên du lịch", True),
        (1416, 774, 1320, "13b: POST .../resolve/ (Đóng hoàn tất phiên hỗ trợ)", False),
    ]

    for x1, x2, y, text, is_dashed in msgs:
        draw_arrow(draw, x1, y, x2, y, label=text, dashed=is_dashed, color="#0f172a", label_offset=(0, -25), font_size=20)

    path = os.path.join(OUT_DIR, "Hinh_2_7_Sequence_LiveChat_Bot.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_activity_admin_booking():
    """2.5.4. Biểu đồ hoạt động luồng Quản trị viên duyệt đơn, phân công HDV (Chữ to rõ nét)"""
    W, H = 1480, 1350
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    left_x, top_y, right_x, bot_y = 14, 14, W - 14, H - 14
    lane_w = (right_x - left_x) // 3
    x_l1 = left_x + lane_w
    x_l2 = left_x + 2 * lane_w
    header_h = 66

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#0f172a", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#e2e8f0", outline="#0f172a", width=3)
    draw.line([x_l1, top_y, x_l1, bot_y], fill="#0f172a", width=3)
    draw.line([x_l2, top_y, x_l2, bot_y], fill="#0f172a", width=3)

    font_header = get_font(25, bold=True)
    c_adm = (left_x + x_l1) // 2
    c_sys = (x_l1 + x_l2) // 2
    c_hdv = (x_l2 + right_x) // 2

    draw_centered_text(draw, c_adm, top_y + header_h // 2, "Quản trị viên", font_header)
    draw_centered_text(draw, c_sys, top_y + header_h // 2, "Hệ thống Tourism", font_header)
    draw_centered_text(draw, c_hdv, top_y + header_h // 2, "Hướng dẫn viên du lịch", font_header)

    bw, bh = 410, 82

    y_start = 125
    y_step1 = 230
    y_step2 = 230
    y_dec_reassign = 390
    y_adm_reassign = 555
    y_sys_reassign = 555
    y_hdv_receive = 555
    y_dec_action = 725
    y_sys_cancel = 725
    y_sys_confirm = 885
    y_hdv_lead = 885
    y_adm_complete = 1060
    y_sys_complete = 1060
    y_end = 1245

    draw_start_node(draw, c_adm, y_start)
    draw_action_box(draw, c_adm, y_step1, bw, bh, "Mở trang Quản lý đơn đặt tour & lọc/tìm kiếm đơn")
    draw_action_box(draw, c_sys, y_step2, bw, bh, "Truy vấn danh sách đơn, bộ đếm trạng thái & HDV phụ trách")

    draw_diamond(draw, c_adm, y_dec_reassign, 155, 52, "Đổi HDV phụ trách?")
    draw_action_box(draw, c_adm, y_adm_reassign, bw, bh, "Chọn Hướng dẫn viên du lịch mới từ danh sách")
    draw_action_box(draw, c_sys, y_sys_reassign, bw, bh, "Cập nhật người phụ trách đơn (assigned_guide)")
    draw_action_box(draw, c_hdv, y_hdv_receive, bw, bh, "Nhận đơn đặt tour mới trong danh sách công việc")

    draw_diamond(draw, c_adm, y_dec_action, 155, 52, "Xác nhận hay Hủy?")
    draw_action_box(draw, c_sys, y_sys_cancel, bw, bh, "Cập nhật trạng thái Đã hủy & loại khỏi sĩ số đoàn")
    draw_action_box(draw, c_sys, y_sys_confirm, bw, bh, "Cập nhật trạng thái Đã xác nhận (confirmed)")
    draw_action_box(draw, c_hdv, y_hdv_lead, bw, bh, "Kiểm tra danh sách đoàn (Manifest) & tổ chức dẫn tour")

    draw_action_box(draw, c_adm, y_adm_complete, bw, bh, "Bấm Hoàn thành đơn sau khi kết thúc chuyến đi")
    draw_action_box(draw, c_sys, y_sys_complete, bw + 15, bh, "Chuyển sang Hoàn thành, cộng doanh thu & mở đánh giá")

    draw_end_node(draw, c_sys, y_end)

    draw_arrow(draw, c_adm, y_start + 18, c_adm, y_step1 - bh // 2)
    draw_arrow(draw, c_adm + bw // 2, y_step1, c_sys - bw // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 308), (c_adm, 308), (c_adm, y_dec_reassign - 52)])

    draw_arrow(draw, c_adm, y_dec_reassign + 52, c_adm, y_adm_reassign - bh // 2, label="[Có điều chuyển]", label_offset=(85, -10))
    draw_arrow(draw, c_adm + bw // 2, y_adm_reassign, c_sys - bw // 2, y_sys_reassign)
    draw_arrow(draw, c_sys + bw // 2, y_sys_reassign, c_hdv - bw // 2, y_hdv_receive)
    draw_polyline_arrow(draw, [(c_sys, y_sys_reassign + bh // 2), (c_sys, 640), (c_adm, 640), (c_adm, y_dec_action - 52)])

    draw_polyline_arrow(
        draw,
        [(c_adm - 155, y_dec_reassign), (left_x + 24, y_dec_reassign), (left_x + 24, y_dec_action), (c_adm - 155, y_dec_action)],
        label="[Giữ nguyên HDV]",
        label_pos=(left_x + 115, 455),
    )

    draw_arrow(draw, c_adm + 155, y_dec_action, c_sys - bw // 2, y_sys_cancel, label="[Hủy đơn]", label_offset=(0, -24))

    draw_polyline_arrow(
        draw,
        [(c_adm, y_dec_action + 52), (c_adm, y_sys_confirm), (c_sys - bw // 2, y_sys_confirm)],
        label="[Duyệt xác nhận]",
        label_pos=(c_adm + 95, y_dec_action + 85),
    )
    draw_arrow(draw, c_sys + bw // 2, y_sys_confirm, c_hdv - bw // 2, y_hdv_lead)

    draw_polyline_arrow(
        draw,
        [(c_hdv, y_hdv_lead + bh // 2), (c_hdv, 972), (c_adm, 972), (c_adm, y_adm_complete - bh // 2)],
    )
    draw_arrow(draw, c_adm + bw // 2, y_adm_complete, c_sys - (bw + 15) // 2, y_sys_complete)

    draw_arrow(draw, c_sys, y_sys_complete + bh // 2, c_sys, y_end - 22)
    draw_polyline_arrow(
        draw,
        [(c_sys + bw // 2, y_sys_cancel), (x_l2 - 18, y_sys_cancel), (x_l2 - 18, y_end), (c_sys + 22, y_end)],
    )

    path = os.path.join(OUT_DIR, "Hinh_2_8_Activity_DuyetDon_PhanCongHDV.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_activity_flash_sale():
    """2.5.5. Biểu đồ hoạt động luồng Cảnh báo thiếu khách và kích hoạt Flash Sale (Chữ to rõ nét)"""
    W, H = 1480, 1400
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    left_x, top_y, right_x, bot_y = 14, 14, W - 14, H - 14
    lane_w = (right_x - left_x) // 3
    x_l1 = left_x + lane_w
    x_l2 = left_x + 2 * lane_w
    header_h = 66

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#0f172a", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#e2e8f0", outline="#0f172a", width=3)
    draw.line([x_l1, top_y, x_l1, bot_y], fill="#0f172a", width=3)
    draw.line([x_l2, top_y, x_l2, bot_y], fill="#0f172a", width=3)

    font_header = get_font(25, bold=True)
    c_hdv = (left_x + x_l1) // 2
    c_sys = (x_l1 + x_l2) // 2
    c_adm = (x_l2 + right_x) // 2

    draw_centered_text(draw, c_hdv, top_y + header_h // 2, "Hướng dẫn viên du lịch", font_header)
    draw_centered_text(draw, c_sys, top_y + header_h // 2, "Hệ thống Tourism", font_header)
    draw_centered_text(draw, c_adm, top_y + header_h // 2, "Quản trị viên", font_header)

    bw, bh = 410, 82

    y_start = 125
    y_step1 = 230
    y_step2 = 230
    y_dec_short = 390
    y_hdv_alert = 555
    y_sys_alert = 555
    y_adm_notify = 555
    y_adm_act = 710
    y_sys_sale = 710
    y_sys_push = 860
    y_hdv_ready = 860
    y_dec_full = 1015
    y_adm_deact = 1170
    y_sys_restore = 1170
    y_end = 1310

    draw_start_node(draw, c_hdv, y_start)
    draw_action_box(draw, c_hdv, y_step1, bw, bh, "Mở bảng kê danh sách đoàn (Manifest) của tour phụ trách")
    draw_action_box(draw, c_sys, y_step2, bw + 15, bh, "Tổng hợp số khách đã đặt, tính tỷ lệ lấp đầy (%) & số khách thiếu")

    draw_diamond(draw, c_hdv, y_dec_short, 155, 52, "Đủ chỉ tiêu khách?")
    draw_action_box(draw, c_hdv, y_hdv_ready, bw, bh, "Đảm bảo sĩ số khởi hành, giữ nguyên giá gốc & chuẩn bị đón đoàn")

    draw_action_box(draw, c_hdv, y_hdv_alert, bw, bh, "Bấm Gửi cảnh báo thiếu khách kèm ghi chú cho Quản trị viên")
    draw_action_box(draw, c_sys, y_sys_alert, bw + 15, bh, "Lưu bản ghi SaleAlert, gắn cờ Cần đẩy Sale gấp & phát chuông báo")
    draw_action_box(draw, c_adm, y_adm_notify, bw, bh, "Nhận thông báo chuông & kiểm tra số chỗ trống cần gom thêm")

    draw_action_box(draw, c_adm, y_adm_act, bw, bh, "Nhập mức phần trăm giảm giá & Bấm Kích hoạt Flash Sale")
    draw_action_box(draw, c_sys, y_sys_sale, bw + 15, bh, "Áp dụng sale_percent, tính giá ưu đãi (final_price) & xử lý cảnh báo")
    draw_action_box(draw, c_sys, y_sys_push, bw + 15, bh, "Đẩy nhãn Flash Sale lên giao diện Khách hàng & thẻ gợi ý Chatbot")

    draw_diamond(draw, c_adm, y_dec_full, 155, 52, "Đã gom đủ đoàn?")
    draw_action_box(draw, c_adm, y_adm_deact, bw, bh, "Bấm Tắt chương trình Flash Sale chốt đoàn")
    draw_action_box(draw, c_sys, y_sys_restore, bw + 15, bh, "Gỡ cờ ưu tiên (is_priority_sale=False) & khôi phục giá gốc ban đầu")

    draw_end_node(draw, c_sys, y_end)

    draw_arrow(draw, c_hdv, y_start + 18, c_hdv, y_step1 - bh // 2)
    draw_arrow(draw, c_hdv + bw // 2, y_step1, c_sys - (bw + 15) // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 308), (c_hdv, 308), (c_hdv, y_dec_short - 52)])

    draw_polyline_arrow(
        draw,
        [(c_hdv - 155, y_dec_short), (left_x + 24, y_dec_short), (left_x + 24, y_hdv_ready), (c_hdv - bw // 2, y_hdv_ready)],
        label="[Đã đủ khách]",
        label_pos=(left_x + 105, 455),
    )
    draw_polyline_arrow(
        draw,
        [(c_hdv, y_hdv_ready + bh // 2), (c_hdv, y_end), (c_sys - 22, y_end)],
    )

    draw_arrow(draw, c_hdv, y_dec_short + 52, c_hdv, y_hdv_alert - bh // 2, label="[Thiếu khách]", label_offset=(75, -10))
    draw_arrow(draw, c_hdv + bw // 2, y_hdv_alert, c_sys - (bw + 15) // 2, y_sys_alert)
    draw_arrow(draw, c_sys + (bw + 15) // 2, y_sys_alert, c_adm - bw // 2, y_adm_notify)

    draw_arrow(draw, c_adm, y_adm_notify + bh // 2, c_adm, y_adm_act - bh // 2)
    draw_arrow(draw, c_adm - bw // 2, y_adm_act, c_sys + (bw + 15) // 2, y_sys_sale)
    draw_arrow(draw, c_sys, y_sys_sale + bh // 2, c_sys, y_sys_push - bh // 2)

    draw_polyline_arrow(
        draw,
        [(c_sys + (bw + 15) // 2, y_sys_push), (c_adm, y_sys_push), (c_adm, y_dec_full - 52)],
    )

    draw_polyline_arrow(
        draw,
        [(c_adm - 155, y_dec_full), (c_sys, y_dec_full), (c_sys, y_sys_push + bh // 2)],
        label="[Chưa đủ - Tiếp tục đẩy Sale]",
        label_pos=((c_adm + c_sys) // 2 - 25, y_dec_full - 28),
    )

    draw_arrow(draw, c_adm, y_dec_full + 52, c_adm, y_adm_deact - bh // 2, label="[Đã đủ khách]", label_offset=(75, -10))
    draw_arrow(draw, c_adm - bw // 2, y_adm_deact, c_sys + (bw + 15) // 2, y_sys_restore)
    draw_arrow(draw, c_sys, y_sys_restore + bh // 2, c_sys, y_end - 22)

    path = os.path.join(OUT_DIR, "Hinh_2_9_Activity_CanhBaoSale_FlashSale.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


if __name__ == "__main__":
    p5 = generate_activity_booking_vietqr()
    p6 = generate_sequence_consultation()
    p7 = generate_sequence_livechat()
    p8 = generate_activity_admin_booking()
    p9 = generate_activity_flash_sale()
    print("Generated:", p5, p6, p7, p8, p9)
