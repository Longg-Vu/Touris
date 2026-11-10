import os
import math
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"d:\DoAnTotNghiep\Tourism\bieu_do_bao_cao"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_REG_PATH = "C:/Windows/Fonts/arial.ttf"
FONT_BOLD_PATH = "C:/Windows/Fonts/arialbd.ttf"
FONT_ITALIC_PATH = "C:/Windows/Fonts/ariali.ttf"


def get_font(size, bold=False, italic=False):
    if bold:
        return ImageFont.truetype(FONT_BOLD_PATH, size)
    if italic:
        return ImageFont.truetype(FONT_ITALIC_PATH, size)
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


def draw_centered_text(draw, cx, cy, text, font, fill="#0f172a", max_width=320):
    lines = wrap_text(draw, text, font, max_width)
    heights = []
    widths = []
    for l in lines:
        bbox = draw.textbbox((0, 0), l, font=font)
        widths.append(bbox[2] - bbox[0])
        heights.append(bbox[3] - bbox[1])
    total_h = sum(heights) + (len(lines) - 1) * 5
    cur_y = cy - total_h / 2
    for i, l in enumerate(lines):
        draw.text((cx - widths[i] / 2, cur_y), l, font=font, fill=fill)
        cur_y += heights[i] + 5


def draw_action_box(draw, cx, cy, w, h, text, fill="#f8fafc", outline="#1e3a8a", font_size=16):
    x1, y1 = cx - w // 2, cy - h // 2
    x2, y2 = cx + w // 2, cy + h // 2
    draw.rounded_rectangle([x1, y1, x2, y2], radius=18, fill=fill, outline=outline, width=2)
    font = get_font(font_size, bold=False)
    draw_centered_text(draw, cx, cy, text, font, fill="#0f172a", max_width=w - 26)


def draw_diamond(draw, cx, cy, rx, ry, label="", fill="#fffbeb", outline="#b45309"):
    pts = [(cx, cy - ry), (cx + rx, cy), (cx, cy + ry), (cx - rx, cy)]
    draw.polygon(pts, fill=fill, outline=outline)
    draw.line(pts + [pts[0]], fill=outline, width=2)
    if label:
        font = get_font(14, bold=True)
        draw_centered_text(draw, cx, cy, label, font, fill="#78350f", max_width=int(rx * 1.35))


def draw_start_node(draw, cx, cy, r=15):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#0f172a", outline="#0f172a")


def draw_end_node(draw, cx, cy, r=18):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill="#ffffff", outline="#0f172a", width=3)
    ir = r - 6
    draw.ellipse([cx - ir, cy - ir, cx + ir, cy + ir], fill="#0f172a", outline="#0f172a")


def draw_arrow(draw, x1, y1, x2, y2, label="", dashed=False, color="#1e293b", label_offset=(0, -14)):
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist == 0:
        return
    ux = dx / dist
    uy = dy / dist

    if dashed:
        dash_len, gap_len = 9, 6
        pos = 0
        while pos < dist - 10:
            end_pos = min(pos + dash_len, dist - 10)
            draw.line(
                [x1 + ux * pos, y1 + uy * pos, x1 + ux * end_pos, y1 + uy * end_pos],
                fill=color,
                width=2,
            )
            pos += dash_len + gap_len
    else:
        draw.line([x1, y1, x2 - ux * 8, y2 - uy * 8], fill=color, width=2)

    # Filled triangle arrowhead at (x2, y2)
    arrow_len = 12
    arrow_angle = math.radians(25)
    angle = math.atan2(dy, dx)
    ax1 = x2 - arrow_len * math.cos(angle - arrow_angle)
    ay1 = y2 - arrow_len * math.sin(angle - arrow_angle)
    ax2 = x2 - arrow_len * math.cos(angle + arrow_angle)
    ay2 = y2 - arrow_len * math.sin(angle + arrow_angle)
    if dashed:
        draw.line([x2, y2, ax1, ay1], fill=color, width=2)
        draw.line([x2, y2, ax2, ay2], fill=color, width=2)
    else:
        draw.polygon([(x2, y2), (ax1, ay1), (ax2, ay2)], fill=color)

    if label:
        font = get_font(14, bold=False)
        mx = (x1 + x2) / 2 + label_offset[0]
        my = (y1 + y2) / 2 + label_offset[1]
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.rectangle([mx - tw / 2 - 4, my - 2, mx + tw / 2 + 4, my + th + 3], fill="#ffffff")
        draw.text((mx - tw / 2, my), label, font=font, fill="#0f172a")


def draw_polyline_arrow(draw, pts, label="", color="#1e293b", label_pos=None):
    for i in range(len(pts) - 2):
        draw.line([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]], fill=color, width=2)
    x1, y1 = pts[-2]
    x2, y2 = pts[-1]
    draw_arrow(draw, x1, y1, x2, y2, label="", color=color)
    if label and label_pos:
        font = get_font(14, bold=True)
        lx, ly = label_pos
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.rectangle([lx - tw / 2 - 4, ly - 2, lx + tw / 2 + 4, ly + th + 3], fill="#ffffff")
        draw.text((lx - tw / 2, ly), label, font=font, fill="#1e293b")


def draw_actor_header(draw, cx, top_y, label):
    """Draw stick figure + label at the top of a Sequence Diagram lifeline."""
    r = 14
    hcy = top_y + 20
    draw.ellipse([cx - r, hcy - r, cx + r, hcy + r], fill="#ffffff", outline="#1e293b", width=2)
    draw.line([cx, hcy + r, cx, hcy + 40], fill="#1e293b", width=2)
    draw.line([cx - 20, hcy + 24, cx + 20, hcy + 24], fill="#1e293b", width=2)
    draw.line([cx, hcy + 40, cx - 16, hcy + 62], fill="#1e293b", width=2)
    draw.line([cx, hcy + 40, cx + 16, hcy + 62], fill="#1e293b", width=2)
    font = get_font(15, bold=True)
    draw_centered_text(draw, cx, top_y + 98, label, font, fill="#0f172a", max_width=190)


def draw_lifeline_box(draw, cx, top_y, label, fill="#eff6ff", outline="#1d4ed8"):
    w, h = 210, 56
    x1, y1 = cx - w // 2, top_y + 32
    x2, y2 = cx + w // 2, y1 + h
    draw.rectangle([x1, y1, x2, y2], fill=fill, outline=outline, width=2)
    font = get_font(15, bold=True)
    draw_centered_text(draw, cx, (y1 + y2) / 2, label, font, fill="#0f172a", max_width=w - 16)


def generate_activity_booking_vietqr():
    """2.5.1. Biểu đồ hoạt động luồng Đặt tour và quét mã VietQR"""
    W, H = 1520, 1280
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Outer frame & Swimlanes (2 lanes: Khách hàng | Hệ thống Tourism)
    left_x, top_y, right_x, bot_y = 40, 40, W - 40, H - 40
    mid_x = W // 2
    header_h = 56

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#1e293b", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#f1f5f9", outline="#1e293b", width=2)
    draw.line([mid_x, top_y, mid_x, bot_y], fill="#1e293b", width=2)

    font_header = get_font(20, bold=True)
    draw_centered_text(draw, (left_x + mid_x) // 2, top_y + header_h // 2, "Khách hàng", font_header)
    draw_centered_text(draw, (mid_x + right_x) // 2, top_y + header_h // 2, "Hệ thống Tourism", font_header)

    c_kh = (left_x + mid_x) // 2       # 400
    c_sys = (mid_x + right_x) // 2     # 1120
    bw, bh = 380, 62

    # Coordinates of nodes
    y_start = 135
    y_step1 = 225   # KH: Chọn ngày khởi hành, số lượng người lớn & trẻ em
    y_step2 = 225   # SYS: Tính đơn giá hiệu lực (Flash Sale nếu có) & tổng tiền
    y_step3 = 345   # KH: Nhập thông tin liên hệ (Họ tên, SĐT, Email, Ghi chú) & Gửi đơn
    y_dec1 = 345    # SYS: Kiểm tra hợp lệ?
    y_step4 = 475   # SYS: Lưu đơn (Chờ xác nhận), sinh mã BK..., gán HDV phụ trách
    y_step5 = 590   # SYS: Cấp tài khoản tự động (nếu khách mới) & Gửi Email xác nhận
    y_step6 = 705   # SYS: Tạo mã QR chuyển khoản VietQR động theo số tiền & mã đơn
    y_dec2 = 775    # KH: Chọn hình thức thanh toán
    y_pay_branch = 925  # KH sub-branches (left: Thanh toán sau, right: Quét mã VietQR)
    y_sys_confirm = 925 # SYS: Cập nhật trạng thái Đã xác nhận (confirmed)
    y_sys_hold = 1065   # SYS: Giữ trạng thái Chờ xác nhận & Hiển thị mã tra cứu đơn
    y_end = 1190

    # Draw nodes
    draw_start_node(draw, c_kh, y_start)
    draw_action_box(draw, c_kh, y_step1, bw, bh, "Chọn ngày khởi hành, số lượng người lớn và trẻ em")
    draw_action_box(draw, c_sys, y_step2, bw, bh, "Áp dụng đơn giá (Flash Sale nếu có) và tính tổng tiền")
    draw_action_box(draw, c_kh, y_step3, bw, bh, "Nhập Họ tên, SĐT, Email, Yêu cầu đặc biệt & Gửi đơn")
    draw_diamond(draw, c_sys, y_dec1, 110, 42, "Dữ liệu hợp lệ?")

    draw_action_box(draw, c_sys, y_step4, bw + 30, bh, "Tạo đơn (Chờ xác nhận), sinh mã BK... & gán Hướng dẫn viên")
    draw_action_box(draw, c_sys, y_step5, bw + 30, bh, "Tạo tài khoản tự động (nếu email mới) & Gửi Email SMTP")
    draw_action_box(draw, c_sys, y_step6, bw + 30, bh, "Sinh mã QR VietQR động chứa số tiền & nội dung đơn")

    draw_diamond(draw, c_kh, y_dec2, 120, 44, "Thanh toán ngay?")

    c_kh_left = c_kh - 170
    c_kh_right = c_kh + 170
    draw_action_box(draw, c_kh_left, y_pay_branch, 285, 68, "Bấm Thanh toán sau (Giữ chỗ trong 24 giờ)")
    draw_action_box(draw, c_kh_right, y_pay_branch, 285, 68, "Quét mã VietQR chuyển khoản & Bấm Đã thanh toán")

    draw_action_box(draw, c_sys, y_sys_confirm, bw + 20, bh, "Ghi nhận thanh toán & Chuyển đơn sang Đã xác nhận")
    draw_action_box(draw, c_sys, y_sys_hold, bw + 20, bh, "Giữ đơn Chờ xác nhận & Hiển thị mã tra cứu BK...")

    draw_end_node(draw, c_sys, y_end)

    # Arrows
    draw_arrow(draw, c_kh, y_start + 15, c_kh, y_step1 - bh // 2)
    draw_arrow(draw, c_kh + bw // 2, y_step1, c_sys - bw // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 285), (c_kh, 285), (c_kh, y_step3 - bh // 2)])
    draw_arrow(draw, c_kh + bw // 2, y_step3, c_sys - 110, y_dec1)

    # Invalid branch from dec1 back to step3
    draw_polyline_arrow(
        draw,
        [(c_sys, y_dec1 - 42), (c_sys, 300), (c_kh + 90, 300), (c_kh + 90, y_step3 - bh // 2)],
        label="[Không hợp lệ - Báo lỗi]",
        label_pos=((c_sys + c_kh) // 2 + 60, 282),
    )

    # Valid branch down
    draw_arrow(draw, c_sys, y_dec1 + 42, c_sys, y_step4 - bh // 2, label="[Hợp lệ]", label_offset=(45, -10))
    draw_arrow(draw, c_sys, y_step4 + bh // 2, c_sys, y_step5 - bh // 2)
    draw_arrow(draw, c_sys, y_step5 + bh // 2, c_sys, y_step6 - bh // 2)

    # From step6 to top of dec2
    draw_polyline_arrow(
        draw,
        [(c_sys - (bw + 30) // 2, y_step6), (c_kh, y_step6), (c_kh, y_dec2 - 44)],
    )

    # dec2 branches
    draw_polyline_arrow(
        draw,
        [(c_kh - 120, y_dec2), (c_kh_left, y_dec2), (c_kh_left, y_pay_branch - 34)],
        label="[Thanh toán sau]",
        label_pos=(c_kh_left, y_dec2 - 24),
    )
    draw_polyline_arrow(
        draw,
        [(c_kh + 120, y_dec2), (c_kh_right, y_dec2), (c_kh_right, y_pay_branch - 34)],
        label="[Thanh toán ngay]",
        label_pos=(c_kh_right + 10, y_dec2 - 24),
    )

    # From pay_now (right) straight to sys_confirm
    draw_arrow(draw, c_kh_right + 285 // 2, y_pay_branch, c_sys - (bw + 20) // 2, y_sys_confirm)

    # From pay_later (left) down and right to sys_hold
    draw_polyline_arrow(
        draw,
        [(c_kh_left, y_pay_branch + 34), (c_kh_left, y_sys_hold), (c_sys - (bw + 20) // 2, y_sys_hold)],
    )

    # Both to End node
    draw_polyline_arrow(
        draw,
        [(c_sys + (bw + 20) // 2, y_sys_confirm), (c_sys + 250, y_sys_confirm), (c_sys + 250, y_end), (c_sys + 18, y_end)],
    )
    draw_arrow(draw, c_sys, y_sys_hold + bh // 2, c_sys, y_end - 18)

    path = os.path.join(OUT_DIR, "Hinh_2_5_Activity_DatTour_VietQR.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_sequence_consultation():
    """2.5.2. Biểu đồ tuần tự luồng Gửi yêu cầu tư vấn gọi lại"""
    W, H = 1750, 1080
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([25, 25, W - 25, H - 25], fill="#ffffff", outline="#1e293b", width=3)

    # 5 lifelines
    cols = [
        (170, "actor", "Khách hàng"),
        (510, "box", "Giao diện ReactJS\n(TourDetailPage)"),
        (880, "box", "Backend API\n(ConsultationViewSet)"),
        (1240, "box", "CSDL PostgreSQL\n& Gmail SMTP"),
        (1580, "actor", "Hướng dẫn viên du lịch"),
    ]

    top_y = 45
    line_start_y = 165
    line_end_y = H - 55

    for cx, kind, label in cols:
        if kind == "actor":
            draw_actor_header(draw, cx, top_y, label)
        else:
            draw_lifeline_box(draw, cx, top_y, label)
        # vertical dashed lifeline
        pos = line_start_y
        while pos < line_end_y:
            draw.line([cx, pos, cx, min(pos + 10, line_end_y)], fill="#64748b", width=2)
            pos += 17

    # Activation bars
    act_bars = [
        (510, 195, 590),
        (880, 240, 560),
        (1240, 290, 480),
        (1580, 650, 960),
        (880, 680, 950),
        (1240, 730, 910),
    ]
    for cx, y1, y2 in act_bars:
        draw.rectangle([cx - 8, y1, cx + 8, y2], fill="#dbeafe", outline="#1e40af", width=2)

    # Messages
    msgs = [
        (170, 502, 205, "1: Bấm Yêu cầu tư vấn & nhập Họ tên, SĐT, Email, Nội dung", False),
        (518, 872, 255, "2: POST /api/bookings/consultations/ (tour_id, thông tin khách)", False),
        (888, 1232, 305, "3: Kiểm tra tour & tìm/tạo tài khoản thành viên theo Email", False),
        (1232, 888, 355, "4: Trả về đối tượng User & thông tin Hướng dẫn viên của tour", True),
        (888, 1232, 410, "5: Lưu ConsultationRequest (pending, assigned_to = tour.guide)", False),
        (888, 1232, 465, "6: Gửi Email xác nhận tiếp nhận tư vấn (#TV...) qua SMTP", False),
        (1232, 888, 515, "7: Xác nhận lưu CSDL & gửi Email thành công", True),
        (872, 518, 560, "8: Trả về JSON (201 Created - Thông tin yêu cầu tư vấn)", True),
        (502, 170, 600, "9: Hiển thị thông báo gửi yêu cầu tư vấn thành công", True),
        (1572, 888, 690, "10: GET /api/bookings/admin/consultations/ (Lọc theo HDV phụ trách)", False),
        (888, 1572, 740, "11: Trả về danh sách các yêu cầu tư vấn được phân công", True),
        (1572, 888, 800, "12: POST .../claim/ (Nhận xử lý ca -> chuyển sang Đã liên hệ)", False),
        (888, 1232, 845, "13: Cập nhật trạng thái contacted & người phụ trách", False),
        (1572, 888, 900, "14: PATCH .../ (Ghi chú kết quả gọi tư vấn & chốt trạng thái resolved)", False),
        (888, 1572, 945, "15: Xác nhận hoàn tất xử lý ca tư vấn", True),
    ]

    for x1, x2, y, text, is_dashed in msgs:
        draw_arrow(draw, x1, y, x2, y, label=text, dashed=is_dashed, color="#0f172a", label_offset=(0, -18))

    path = os.path.join(OUT_DIR, "Hinh_2_6_Sequence_TuVanGoiLai.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_sequence_livechat():
    """2.5.3. Biểu đồ tuần tự luồng Trò chuyện trực tuyến (Live Chat & Bot)"""
    W, H = 1800, 1180
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([25, 25, W - 25, H - 25], fill="#ffffff", outline="#1e293b", width=3)

    cols = [
        (160, "actor", "Khách hàng"),
        (490, "box", "MiniChatWidget\n(ReactJS)"),
        (840, "box", "Chat API & Bot Engine\n(Django DRF)"),
        (1210, "box", "CSDL PostgreSQL\n(Session & Message)"),
        (1600, "actor", "Hướng dẫn viên du lịch"),
    ]

    top_y = 45
    line_start_y = 165
    line_end_y = H - 50

    for cx, kind, label in cols:
        if kind == "actor":
            draw_actor_header(draw, cx, top_y, label)
        else:
            draw_lifeline_box(draw, cx, top_y, label)
        pos = line_start_y
        while pos < line_end_y:
            draw.line([cx, pos, cx, min(pos + 10, line_end_y)], fill="#64748b", width=2)
            pos += 17

    # Activation bars
    act_bars = [
        (490, 190, 1060),
        (840, 210, 990),
        (1210, 240, 960),
        (1600, 815, 1065),
    ]
    for cx, y1, y2 in act_bars:
        draw.rectangle([cx - 8, y1, cx + 8, y2], fill="#dbeafe", outline="#1e40af", width=2)

    # Alt combined fragment box
    alt_x1, alt_y1, alt_x2, alt_y2 = 90, 440, 1710, 1085
    draw.rectangle([alt_x1, alt_y1, alt_x2, alt_y2], outline="#1e3a8a", width=2)
    # pentagon tag "alt"
    draw.polygon(
        [(alt_x1, alt_y1), (alt_x1 + 78, alt_y1), (alt_x1 + 92, alt_y1 + 16), (alt_x1 + 78, alt_y1 + 32), (alt_x1, alt_y1 + 32)],
        fill="#dbeafe",
        outline="#1e3a8a",
    )
    font_alt = get_font(15, bold=True)
    draw.text((alt_x1 + 22, alt_y1 + 7), "alt", font=font_alt, fill="#1e3a8a")

    # Guard 1 with white backing box
    g1_text = "[Trường hợp 1: Khách hỏi theo từ khóa kịch bản (Sale, Vé trẻ em, Thanh toán, Hoàn hủy)]"
    g1_bbox = draw.textbbox((0, 0), g1_text, font=font_alt)
    g1_w = g1_bbox[2] - g1_bbox[0]
    g1_x, g1_y = alt_x1 + 110, alt_y1 + 7
    draw.rectangle([g1_x - 6, g1_y - 2, g1_x + g1_w + 6, g1_y + 22], fill="#ffffff")
    draw.text((g1_x, g1_y), g1_text, font=font_alt, fill="#1e3a8a")

    # Divider line inside alt
    div_y = 685
    pos = alt_x1
    while pos < alt_x2:
        draw.line([pos, div_y, min(pos + 12, alt_x2), div_y], fill="#1e3a8a", width=2)
        pos += 20

    # Guard 2 with white backing box
    g2_text = "[Trường hợp 2: Khách yêu cầu gặp tư vấn viên hoặc hỏi chuyên sâu ngoài kịch bản]"
    g2_bbox = draw.textbbox((0, 0), g2_text, font=font_alt)
    g2_w = g2_bbox[2] - g2_bbox[0]
    g2_x, g2_y = alt_x1 + 110, div_y + 8
    draw.rectangle([g2_x - 6, g2_y - 2, g2_x + g2_w + 6, g2_y + 22], fill="#ffffff")
    draw.text((g2_x, g2_y), g2_text, font=font_alt, fill="#1e3a8a")

    msgs = [
        (160, 482, 200, "1: Mở khung chat nổi (tại trang chi tiết tour)", False),
        (498, 832, 240, "2: POST /api/chat/init/ (session_id, tour_id)", False),
        (848, 1202, 280, "3: Khởi tạo/tải ChatSession độc lập & gán assigned_to = tour.guide", False),
        (832, 498, 325, "4: Trả về lời chào mừng của Chatbot kèm nút câu hỏi gợi ý", True),
        (160, 482, 375, "5: Gửi câu hỏi tư vấn vào khung chat", False),
        (498, 832, 415, "6: POST /api/chat/messages/ (session_id, message)", False),

        # Alt branch 1: Bot auto reply
        (848, 1202, 505, "7a: Lưu tin nhắn khách & Truy vấn danh sách tour ưu đãi / chính sách", False),
        (1202, 848, 555, "8a: Trả về dữ liệu tour đang Sale & lưu tin nhắn phản hồi của Bot", True),
        (832, 498, 605, "9a: Trả về JSON tin nhắn Bot (kèm thẻ tours_carousel nếu hỏi Sale)", True),
        (482, 160, 650, "10a: Hiển thị câu trả lời tự động tức thì trên khung chat", True),

        # Alt branch 2: Handover to Tour Guide
        (848, 1202, 745, "7b: Chuyển phiên sang Chờ nhân viên (waiting_staff) & tăng unread_staff_count", False),
        (832, 498, 795, "8b: Bot thông báo đã kết nối Hướng dẫn viên du lịch phụ trách tuyến", True),
        (1592, 848, 855, "9b: Hướng dẫn viên xem phiên chat & gửi câu trả lời (POST .../reply/)", False),
        (848, 1202, 905, "10b: Lưu tin nhắn nhân sự (sender_type=staff) & chuyển về Đang trò chuyện", False),
        (498, 832, 955, "11b: GET /api/chat/messages/poll/ (Đồng bộ tin nhắn mới định kỳ)", False),
        (832, 160, 1005, "12b: Hiển thị phản hồi trực tiếp của Hướng dẫn viên du lịch", True),
        (1592, 848, 1055, "13b: POST .../resolve/ (Đóng hoàn tất phiên hỗ trợ trực tuyến)", False),
    ]

    for x1, x2, y, text, is_dashed in msgs:
        draw_arrow(draw, x1, y, x2, y, label=text, dashed=is_dashed, color="#0f172a", label_offset=(0, -18))

    path = os.path.join(OUT_DIR, "Hinh_2_7_Sequence_LiveChat_Bot.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_activity_admin_booking():
    """2.5.4. Biểu đồ hoạt động luồng Quản trị viên duyệt đơn, phân công Hướng dẫn viên du lịch"""
    W, H = 1680, 1220
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # 3 Swimlanes: Quản trị viên | Hệ thống Tourism | Hướng dẫn viên du lịch
    left_x, top_y, right_x, bot_y = 40, 40, W - 40, H - 40
    lane_w = (right_x - left_x) // 3
    x_l1 = left_x + lane_w
    x_l2 = left_x + 2 * lane_w
    header_h = 56

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#1e293b", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#f1f5f9", outline="#1e293b", width=2)
    draw.line([x_l1, top_y, x_l1, bot_y], fill="#1e293b", width=2)
    draw.line([x_l2, top_y, x_l2, bot_y], fill="#1e293b", width=2)

    font_header = get_font(20, bold=True)
    c_adm = (left_x + x_l1) // 2
    c_sys = (x_l1 + x_l2) // 2
    c_hdv = (x_l2 + right_x) // 2

    draw_centered_text(draw, c_adm, top_y + header_h // 2, "Quản trị viên", font_header)
    draw_centered_text(draw, c_sys, top_y + header_h // 2, "Hệ thống Tourism", font_header)
    draw_centered_text(draw, c_hdv, top_y + header_h // 2, "Hướng dẫn viên du lịch", font_header)

    bw, bh = 360, 62

    y_start = 135
    y_step1 = 225  # ADM: Truy cập trang Quản lý đơn đặt tour & lọc đơn
    y_step2 = 225  # SYS: Hiển thị danh sách đơn, trạng thái & HDV phụ trách
    y_dec_reassign = 365  # ADM: Cần đổi Hướng dẫn viên phụ trách?
    y_adm_reassign = 505  # ADM: Chọn Hướng dẫn viên du lịch mới cho đơn
    y_sys_reassign = 505  # SYS: Cập nhật assigned_guide & đồng bộ sang cổng HDV
    y_hdv_receive = 505   # HDV: Nhận đơn đặt tour trong danh sách phụ trách
    y_dec_action = 655    # ADM: Kiểm tra thanh toán & Chọn thao tác xử lý đơn
    y_sys_confirm = 795   # SYS: Chuyển trạng thái đơn sang Đã xác nhận (confirmed)
    y_sys_cancel = 655    # SYS: Chuyển trạng thái đơn sang Đã hủy (cancelled)
    y_hdv_lead = 795      # HDV: Chuẩn bị đón đoàn & thực hiện dẫn tour theo lịch trình
    y_adm_complete = 945  # ADM / HDV: Xác nhận hoàn thành chuyến đi
    y_sys_complete = 945  # SYS: Cập nhật Hoàn thành, cộng doanh thu & mở quyền đánh giá
    y_end = 1115

    draw_start_node(draw, c_adm, y_start)
    draw_action_box(draw, c_adm, y_step1, bw, bh, "Mở trang Quản lý đơn đặt tour & lọc/tìm kiếm đơn")
    draw_action_box(draw, c_sys, y_step2, bw, bh, "Truy vấn danh sách đơn, bộ đếm trạng thái & HDV phụ trách")

    draw_diamond(draw, c_adm, y_dec_reassign, 130, 44, "Đổi HDV phụ trách?")
    draw_action_box(draw, c_adm, y_adm_reassign, bw, bh, "Chọn Hướng dẫn viên du lịch mới từ danh sách")
    draw_action_box(draw, c_sys, y_sys_reassign, bw, bh, "Cập nhật người phụ trách đơn (assigned_guide)")
    draw_action_box(draw, c_hdv, y_hdv_receive, bw, bh, "Nhận đơn đặt tour mới trong danh sách công việc")

    draw_diamond(draw, c_adm, y_dec_action, 130, 44, "Xác nhận hay Hủy?")
    draw_action_box(draw, c_sys, y_sys_cancel, bw, bh, "Cập nhật trạng thái Đã hủy & loại khỏi sĩ số đoàn")
    draw_action_box(draw, c_sys, y_sys_confirm, bw, bh, "Cập nhật trạng thái Đã xác nhận (confirmed)")
    draw_action_box(draw, c_hdv, y_hdv_lead, bw, bh, "Kiểm tra danh sách đoàn (Manifest) & tổ chức dẫn tour")

    draw_action_box(draw, c_adm, y_adm_complete, bw, bh, "Bấm Hoàn thành đơn sau khi kết thúc chuyến đi")
    draw_action_box(draw, c_sys, y_sys_complete, bw + 20, bh, "Chuyển sang Hoàn thành, ghi nhận doanh thu & mở đánh giá")

    draw_end_node(draw, c_sys, y_end)

    # Arrows
    draw_arrow(draw, c_adm, y_start + 15, c_adm, y_step1 - bh // 2)
    draw_arrow(draw, c_adm + bw // 2, y_step1, c_sys - bw // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 295), (c_adm, 295), (c_adm, y_dec_reassign - 44)])

    # Reassign Yes
    draw_arrow(draw, c_adm, y_dec_reassign + 44, c_adm, y_adm_reassign - bh // 2, label="[Có điều chuyển]", label_offset=(65, -8))
    draw_arrow(draw, c_adm + bw // 2, y_adm_reassign, c_sys - bw // 2, y_sys_reassign)
    draw_arrow(draw, c_sys + bw // 2, y_sys_reassign, c_hdv - bw // 2, y_hdv_receive)
    draw_polyline_arrow(draw, [(c_sys, y_sys_reassign + bh // 2), (c_sys, 580), (c_adm, 580), (c_adm, y_dec_action - 44)])

    # Reassign No (keep default guide)
    draw_polyline_arrow(
        draw,
        [(c_adm - 130, y_dec_reassign), (left_x + 40, y_dec_reassign), (left_x + 40, y_dec_action), (c_adm - 130, y_dec_action)],
        label="[Giữ nguyên HDV]",
        label_pos=(left_x + 110, 425),
    )

    # Action Cancel
    draw_arrow(draw, c_adm + 130, y_dec_action, c_sys - bw // 2, y_sys_cancel, label="[Hủy đơn]", label_offset=(0, -18))

    # Action Confirm
    draw_polyline_arrow(
        draw,
        [(c_adm, y_dec_action + 44), (c_adm, y_sys_confirm), (c_sys - bw // 2, y_sys_confirm)],
        label="[Duyệt xác nhận]",
        label_pos=(c_adm + 75, y_dec_action + 85),
    )
    draw_arrow(draw, c_sys + bw // 2, y_sys_confirm, c_hdv - bw // 2, y_hdv_lead)

    # After tour led -> Complete
    draw_polyline_arrow(
        draw,
        [(c_hdv, y_hdv_lead + bh // 2), (c_hdv, 868), (c_adm, 868), (c_adm, y_adm_complete - bh // 2)],
    )
    draw_arrow(draw, c_adm + bw // 2, y_adm_complete, c_sys - (bw + 20) // 2, y_sys_complete)

    # End node connections
    draw_arrow(draw, c_sys, y_sys_complete + bh // 2, c_sys, y_end - 18)
    draw_polyline_arrow(
        draw,
        [(c_sys + bw // 2, y_sys_cancel), (x_l2 - 25, y_sys_cancel), (x_l2 - 25, y_end), (c_sys + 18, y_end)],
    )

    path = os.path.join(OUT_DIR, "Hinh_2_8_Activity_DuyetDon_PhanCongHDV.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_activity_flash_sale():
    """2.5.5. Biểu đồ hoạt động luồng Cảnh báo thiếu khách và kích hoạt Flash Sale chốt đoàn"""
    W, H = 1680, 1280
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # 3 Swimlanes: Hướng dẫn viên du lịch | Hệ thống Tourism | Quản trị viên
    left_x, top_y, right_x, bot_y = 40, 40, W - 40, H - 40
    lane_w = (right_x - left_x) // 3
    x_l1 = left_x + lane_w
    x_l2 = left_x + 2 * lane_w
    header_h = 56

    draw.rectangle([left_x, top_y, right_x, bot_y], fill="#ffffff", outline="#1e293b", width=3)
    draw.rectangle([left_x, top_y, right_x, top_y + header_h], fill="#f1f5f9", outline="#1e293b", width=2)
    draw.line([x_l1, top_y, x_l1, bot_y], fill="#1e293b", width=2)
    draw.line([x_l2, top_y, x_l2, bot_y], fill="#1e293b", width=2)

    font_header = get_font(20, bold=True)
    c_hdv = (left_x + x_l1) // 2
    c_sys = (x_l1 + x_l2) // 2
    c_adm = (x_l2 + right_x) // 2

    draw_centered_text(draw, c_hdv, top_y + header_h // 2, "Hướng dẫn viên du lịch", font_header)
    draw_centered_text(draw, c_sys, top_y + header_h // 2, "Hệ thống Tourism", font_header)
    draw_centered_text(draw, c_adm, top_y + header_h // 2, "Quản trị viên", font_header)

    bw, bh = 360, 64

    y_start = 135
    y_step1 = 225       # HDV: Mở bảng kê danh sách đoàn (Manifest) của tour phụ trách
    y_step2 = 225       # SYS: Tổng hợp sĩ số khách đã đặt, tính tỷ lệ lấp đầy & số chỗ thiếu
    y_dec_short = 365   # HDV: Đoàn đã đủ chỉ tiêu khách?
    y_hdv_alert = 505   # HDV: Bấm Gửi cảnh báo gom khách kèm ghi chú thiếu chỗ
    y_sys_alert = 505   # SYS: Lưu bản ghi SaleAlert & bật cờ ưu tiên (is_priority_sale=True)
    y_adm_notify = 505  # ADM: Nhận thông báo chuông cảnh báo & xem tour ưu tiên trên Dashboard
    y_adm_act = 645     # ADM: Nhập mức % giảm giá (1% - 90%) & Bấm Kích hoạt Flash Sale
    y_sys_sale = 645    # SYS: Cập nhật sale_percent, tính final_price & đóng cảnh báo SaleAlert
    y_sys_push = 780    # SYS: Hiển thị nhãn giảm giá trên trang chủ & gợi ý qua Chatbot
    y_hdv_ready = 780   # HDV: Đảm bảo sĩ số khởi hành & chuẩn bị đón đoàn theo lịch trình
    y_dec_full = 920    # ADM: Đã gom đủ số lượng khách mục tiêu?
    y_adm_deact = 1055  # ADM: Bấm Tắt chương trình Flash Sale của tour
    y_sys_restore = 1055 # SYS: Gỡ cờ ưu tiên, đặt sale_percent = 0 & khôi phục giá gốc
    y_end = 1190

    draw_start_node(draw, c_hdv, y_start)
    draw_action_box(draw, c_hdv, y_step1, bw, bh, "Mở bảng kê danh sách đoàn (Manifest) của tour phụ trách")
    draw_action_box(draw, c_sys, y_step2, bw + 20, bh, "Tổng hợp số khách đã đặt, tính tỷ lệ lấp đầy (%) & số khách thiếu")

    draw_diamond(draw, c_hdv, y_dec_short, 130, 44, "Đủ chỉ tiêu khách?")
    draw_action_box(draw, c_hdv, y_hdv_ready, bw, bh, "Đảm bảo sĩ số khởi hành, giữ nguyên giá gốc & chuẩn bị đón đoàn")

    draw_action_box(draw, c_hdv, y_hdv_alert, bw, bh, "Bấm Gửi cảnh báo thiếu khách kèm ghi chú cho Quản trị viên")
    draw_action_box(draw, c_sys, y_sys_alert, bw + 20, bh, "Lưu bản ghi SaleAlert, gắn cờ Cần đẩy Sale gấp & phát chuông báo")
    draw_action_box(draw, c_adm, y_adm_notify, bw, bh, "Nhận thông báo chuông & kiểm tra số chỗ trống cần gom thêm")

    draw_action_box(draw, c_adm, y_adm_act, bw, bh, "Nhập mức phần trăm giảm giá & Bấm Kích hoạt Flash Sale")
    draw_action_box(draw, c_sys, y_sys_sale, bw + 20, bh, "Áp dụng sale_percent, tính giá ưu đãi (final_price) & xử lý cảnh báo")
    draw_action_box(draw, c_sys, y_sys_push, bw + 20, bh, "Đẩy nhãn Flash Sale lên giao diện Khách hàng & thẻ gợi ý Chatbot")

    draw_diamond(draw, c_adm, y_dec_full, 135, 44, "Đã gom đủ đoàn?")
    draw_action_box(draw, c_adm, y_adm_deact, bw, bh, "Bấm Tắt chương trình Flash Sale chốt đoàn")
    draw_action_box(draw, c_sys, y_sys_restore, bw + 20, bh, "Gỡ cờ ưu tiên (is_priority_sale=False) & khôi phục giá gốc ban đầu")

    draw_end_node(draw, c_sys, y_end)

    # Arrows
    draw_arrow(draw, c_hdv, y_start + 15, c_hdv, y_step1 - bh // 2)
    draw_arrow(draw, c_hdv + bw // 2, y_step1, c_sys - (bw + 20) // 2, y_step2)
    draw_polyline_arrow(draw, [(c_sys, y_step2 + bh // 2), (c_sys, 295), (c_hdv, 295), (c_hdv, y_dec_short - 44)])

    # Enough participants -> go left around y_hdv_alert down to y_hdv_ready and then to End
    draw_polyline_arrow(
        draw,
        [(c_hdv - 130, y_dec_short), (left_x + 36, y_dec_short), (left_x + 36, y_hdv_ready), (c_hdv - bw // 2, y_hdv_ready)],
        label="[Đã đủ khách]",
        label_pos=(left_x + 105, 425),
    )
    draw_polyline_arrow(
        draw,
        [(c_hdv, y_hdv_ready + bh // 2), (c_hdv, y_end), (c_sys - 18, y_end)],
    )

    # Shortage -> down to y_hdv_alert
    draw_arrow(draw, c_hdv, y_dec_short + 44, c_hdv, y_hdv_alert - bh // 2, label="[Thiếu khách]", label_offset=(60, -8))
    draw_arrow(draw, c_hdv + bw // 2, y_hdv_alert, c_sys - (bw + 20) // 2, y_sys_alert)
    draw_arrow(draw, c_sys + (bw + 20) // 2, y_sys_alert, c_adm - bw // 2, y_adm_notify)

    # Admin activates Flash Sale
    draw_arrow(draw, c_adm, y_adm_notify + bh // 2, c_adm, y_adm_act - bh // 2)
    draw_arrow(draw, c_adm - bw // 2, y_adm_act, c_sys + (bw + 20) // 2, y_sys_sale)
    draw_arrow(draw, c_sys, y_sys_sale + bh // 2, c_sys, y_sys_push - bh // 2)

    # From right edge of sys_push to top of dec_full
    draw_polyline_arrow(
        draw,
        [(c_sys + (bw + 20) // 2, y_sys_push), (c_adm, y_sys_push), (c_adm, y_dec_full - 44)],
    )

    # Loop back if not full yet (from left vertex of dec_full to bottom of sys_push)
    draw_polyline_arrow(
        draw,
        [(c_adm - 135, y_dec_full), (c_sys, y_dec_full), (c_sys, y_sys_push + bh // 2)],
        label="[Chưa đủ - Tiếp tục đẩy Sale]",
        label_pos=((c_adm + c_sys) // 2 - 20, y_dec_full - 24),
    )

    # Full -> Deactivate Flash Sale
    draw_arrow(draw, c_adm, y_dec_full + 44, c_adm, y_adm_deact - bh // 2, label="[Đã đủ khách]", label_offset=(60, -8))
    draw_arrow(draw, c_adm - bw // 2, y_adm_deact, c_sys + (bw + 20) // 2, y_sys_restore)
    draw_arrow(draw, c_sys, y_sys_restore + bh // 2, c_sys, y_end - 18)

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
