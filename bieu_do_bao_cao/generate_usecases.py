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


def draw_actor(draw, cx, cy, label, scale=1.0):
    """Draw standard UML Stick Figure Actor centered around (cx, cy)."""
    r = int(20 * scale)
    head_cy = cy - int(45 * scale)
    # Head
    draw.ellipse(
        [cx - r, head_cy - r, cx + r, head_cy + r],
        fill="#ffffff",
        outline="#1e293b",
        width=3,
    )
    # Body
    body_top = head_cy + r
    body_bot = cy + int(15 * scale)
    draw.line([cx, body_top, cx, body_bot], fill="#1e293b", width=3)
    # Arms
    arm_y = body_top + int(18 * scale)
    arm_span = int(32 * scale)
    draw.line([cx - arm_span, arm_y, cx + arm_span, arm_y], fill="#1e293b", width=3)
    # Legs
    leg_bot = cy + int(55 * scale)
    leg_span = int(26 * scale)
    draw.line([cx, body_bot, cx - leg_span, leg_bot], fill="#1e293b", width=3)
    draw.line([cx, body_bot, cx + leg_span, leg_bot], fill="#1e293b", width=3)

    # Label below legs
    font = get_font(int(19 * scale), bold=True)
    lines = wrap_text(draw, label, font, int(155 * scale))
    ty = leg_bot + int(10 * scale)
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((cx - tw / 2, ty), line, font=font, fill="#0f172a")
        ty += th + 6


def draw_usecase(draw, cx, cy, rx, ry, text, fill="#f8fafc", outline="#1e3a8a", font_size=17):
    """Draw a standard UML Use Case ellipse with centered wrapped text."""
    draw.ellipse(
        [cx - rx, cy - ry, cx + rx, cy + ry],
        fill=fill,
        outline=outline,
        width=2,
    )
    font = get_font(font_size, bold=False)
    lines = wrap_text(draw, text, font, int(rx * 1.65))
    line_heights = []
    line_widths = []
    for line in lines:
        bbox = draw.textbbox((0, 0), line, font=font)
        line_widths.append(bbox[2] - bbox[0])
        line_heights.append(bbox[3] - bbox[1])
    total_h = sum(line_heights) + (len(lines) - 1) * 5
    cur_y = cy - total_h / 2
    for i, line in enumerate(lines):
        draw.text(
            (cx - line_widths[i] / 2, cur_y),
            line,
            font=font,
            fill="#0f172a",
        )
        cur_y += line_heights[i] + 5


def draw_dashed_arrow(draw, x1, y1, x2, y2, label="", color="#334155"):
    """Draw dashed line from (x1, y1) to (x2, y2) with an open arrowhead at (x2, y2) and stereotype label."""
    dx = x2 - x1
    dy = y2 - y1
    dist = math.hypot(dx, dy)
    if dist == 0:
        return
    ux = dx / dist
    uy = dy / dist

    dash_len = 10
    gap_len = 7
    pos = 0
    while pos < dist - 12:
        end_pos = min(pos + dash_len, dist - 12)
        sx = x1 + ux * pos
        sy = y1 + uy * pos
        ex = x1 + ux * end_pos
        ey = y1 + uy * end_pos
        draw.line([sx, sy, ex, ey], fill=color, width=2)
        pos += dash_len + gap_len

    # Open V arrowhead at (x2, y2)
    arrow_len = 13
    arrow_angle = math.radians(26)
    angle = math.atan2(dy, dx)
    ax1 = x2 - arrow_len * math.cos(angle - arrow_angle)
    ay1 = y2 - arrow_len * math.sin(angle - arrow_angle)
    ax2 = x2 - arrow_len * math.cos(angle + arrow_angle)
    ay2 = y2 - arrow_len * math.sin(angle + arrow_angle)
    draw.line([x2, y2, ax1, ay1], fill=color, width=2)
    draw.line([x2, y2, ax2, ay2], fill=color, width=2)

    if label:
        font = get_font(15, italic=True)
        mx = (x1 + x2) / 2
        my = (y1 + y2) / 2 - 14
        bbox = draw.textbbox((0, 0), label, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.rectangle(
            [mx - tw / 2 - 4, my - 2, mx + tw / 2 + 4, my + th + 4],
            fill="#ffffff",
        )
        draw.text((mx - tw / 2, my), label, font=font, fill="#1e293b")


def draw_system_boundary(draw, x1, y1, x2, y2, title):
    draw.rectangle([x1, y1, x2, y2], fill="#ffffff", outline="#1e293b", width=3)
    font = get_font(21, bold=True)
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    cx = (x1 + x2) / 2
    draw.rectangle([cx - tw / 2 - 16, y1 + 10, cx + tw / 2 + 16, y1 + th + 24], fill="#f1f5f9", outline="#cbd5e1", width=1)
    draw.text((cx - tw / 2, y1 + 15), title, font=font, fill="#0f172a")


def generate_overall_usecase():
    """2.4.1. Biểu đồ Use Case tổng quát toàn hệ thống"""
    W, H = 1850, 1220
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # System boundary box
    bx1, by1, bx2, by2 = 330, 40, 1520, 1170
    draw_system_boundary(draw, bx1, by1, bx2, by2, "Hệ thống Quản lý và Đặt Tour Du lịch Tourism")

    # Actors
    kh_x, kh_y = 145, 580
    draw_actor(draw, kh_x, kh_y, "Khách hàng", scale=1.05)

    hdv_x, hdv_y = 1695, 330
    draw_actor(draw, hdv_x, hdv_y, "Hướng dẫn viên du lịch", scale=1.05)

    adm_x, adm_y = 1695, 860
    draw_actor(draw, adm_x, adm_y, "Quản trị viên", scale=1.05)

    # Left column Use Cases (Customer)
    left_ucs = [
        (600, 145, "Tìm kiếm và lọc tour đa tiêu chí"),
        (600, 260, "Xem thông tin chi tiết tour"),
        (600, 375, "Quản lý danh sách tour yêu thích"),
        (600, 490, "Đăng ký / Đăng nhập & Quản lý hồ sơ"),
        (600, 605, "Đặt tour và thanh toán VietQR"),
        (600, 720, "Tra cứu và quản lý đơn đặt tour"),
        (600, 835, "Gửi yêu cầu gọi lại tư vấn"),
        (600, 950, "Đánh giá và nhận xét tour"),
        (600, 1075, "Trò chuyện trực tuyến 24/7 (Live Chat & Chatbot)"),
    ]

    # Right-top Use Cases (Tour Guide)
    right_top_ucs = [
        (1230, 155, "Theo dõi thống kê công việc cá nhân"),
        (1230, 280, "Quản lý tour phụ trách & Kiểm tra tiến độ đoàn"),
        (1230, 405, "Gửi cảnh báo thiếu khách gom đoàn"),
        (1230, 530, "Xử lý đơn đặt tour được phân công"),
        (1230, 655, "Tiếp nhận tư vấn & Trả lời Live Chat"),
    ]

    # Right-bottom Use Cases (Admin)
    right_bot_ucs = [
        (1230, 795, "Theo dõi Dashboard & Thống kê doanh thu"),
        (1230, 905, "Quản lý Tour, Điểm đến và Danh mục"),
        (1230, 1015, "Kích hoạt Flash Sale & Điều phối Hướng dẫn viên"),
        (1230, 1120, "Quản lý tài khoản người dùng & Phân quyền"),
    ]

    rx, ry = 215, 42

    # Draw association lines first so they don't cross over ellipses
    for ux, uy, _ in left_ucs:
        draw.line([kh_x + 48, kh_y - 10, ux - rx, uy], fill="#334155", width=2)

    # Tour Guide associations
    for ux, uy, _ in right_top_ucs:
        draw.line([hdv_x - 52, hdv_y - 10, ux + rx, uy], fill="#334155", width=2)

    # Admin associations
    for ux, uy, _ in right_bot_ucs:
        draw.line([adm_x - 52, adm_y - 10, ux + rx, uy], fill="#334155", width=2)
    draw.line([adm_x - 52, adm_y - 25, 1230 + rx, 655], fill="#334155", width=2)

    # Draw ellipses on top
    for ux, uy, label in left_ucs:
        draw_usecase(draw, ux, uy, rx, ry, label, fill="#f8fafc", outline="#1e3a8a")
    for ux, uy, label in right_top_ucs:
        draw_usecase(draw, ux, uy, rx, ry, label, fill="#f8fafc", outline="#0f766e")
    for ux, uy, label in right_bot_ucs:
        draw_usecase(draw, ux, uy, rx, ry, label, fill="#f8fafc", outline="#3730a3")

    path = os.path.join(OUT_DIR, "Hinh_2_1_UseCase_TongQuat.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_sub_usecase(filename, system_title, actor_name, items):
    """
    Generate detailed actor Use Case diagram with <<include>> and <<extend>> relationships.
    items: list of dicts:
      {
        'main': 'Tên Use Case chính',
        'rel': ('include' | 'extend', 'Tên Use Case phụ')  # optional
      }
    """
    n = len(items)
    row_gap = 125
    top_margin = 135
    H = top_margin + n * row_gap + 60
    W = 1820

    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    bx1, by1, bx2, by2 = 340, 35, 1770, H - 35
    draw_system_boundary(draw, bx1, by1, bx2, by2, system_title)

    actor_x = 155
    actor_y = H // 2 - 20
    draw_actor(draw, actor_x, actor_y, actor_name, scale=1.08)

    main_x = 660
    sub_x = 1410
    rx_main, ry_main = 220, 44
    rx_sub, ry_sub = 240, 44

    # Draw lines Actor -> Main Use Cases
    for idx, item in enumerate(items):
        cy = top_margin + idx * row_gap
        draw.line([actor_x + 48, actor_y - 10, main_x - rx_main, cy], fill="#334155", width=2)

    # Draw ellipses and dashed relationship arrows
    for idx, item in enumerate(items):
        cy = top_margin + idx * row_gap
        draw_usecase(draw, main_x, cy, rx_main, ry_main, item["main"], fill="#f8fafc", outline="#1e3a8a")

        if item.get("rel"):
            rel_type, sub_label = item["rel"]
            draw_usecase(draw, sub_x, cy, rx_sub, ry_sub, sub_label, fill="#ffffff", outline="#475569")
            if rel_type == "include":
                # Base -> Included
                draw_dashed_arrow(
                    draw,
                    main_x + rx_main,
                    cy,
                    sub_x - rx_sub,
                    cy,
                    label="<<include>>",
                )
            else:
                # Extending -> Base
                draw_dashed_arrow(
                    draw,
                    sub_x - rx_sub,
                    cy,
                    main_x + rx_main,
                    cy,
                    label="<<extend>>",
                )

    path = os.path.join(OUT_DIR, filename)
    img.save(path, "PNG", dpi=(300, 300))
    return path


if __name__ == "__main__":
    p1 = generate_overall_usecase()
    p2 = generate_sub_usecase(
        "Hinh_2_2_UseCase_KhachHang.png",
        "Phân hệ Khách hàng – Hệ thống Tourism",
        "Khách hàng",
        [
            {
                "main": "Tìm kiếm và xem chi tiết tour",
                "rel": ("extend", "Lọc tour đa tiêu chí (Điểm đến, Danh mục, Ngày, Sale)"),
            },
            {
                "main": "Quản lý danh sách tour yêu thích",
                "rel": ("extend", "Đồng bộ danh sách yêu thích theo tài khoản"),
            },
            {
                "main": "Đăng ký / Đăng nhập & Quản lý hồ sơ",
                "rel": ("extend", "Đăng nhập nhanh qua Google OAuth 2.0"),
            },
            {
                "main": "Đặt tour trực tuyến",
                "rel": ("include", "Nhập thông tin liên hệ & Tạo mã tra cứu đơn"),
            },
            {
                "main": "Thanh toán đơn đặt tour",
                "rel": ("extend", "Quét mã chuyển khoản VietQR động theo đơn"),
            },
            {
                "main": "Tra cứu và quản lý đơn đặt tour",
                "rel": ("extend", "Hủy đơn đặt tour khi chưa khởi hành"),
            },
            {
                "main": "Gửi yêu cầu gọi lại tư vấn",
                "rel": ("include", "Tự động phân công Hướng dẫn viên phụ trách"),
            },
            {
                "main": "Trò chuyện trực tuyến 24/7 (Live Chat)",
                "rel": ("extend", "Chuyển tiếp gặp Hướng dẫn viên du lịch"),
            },
            {
                "main": "Đánh giá và nhận xét tour",
                "rel": ("include", "Kiểm tra điều kiện đã tham gia chuyến đi"),
            },
        ],
    )
    p3 = generate_sub_usecase(
        "Hinh_2_3_UseCase_HuongDanVien.png",
        "Phân hệ Hướng dẫn viên du lịch – Hệ thống Tourism",
        "Hướng dẫn viên du lịch",
        [
            {
                "main": "Đăng nhập cổng điều hành nội bộ",
                "rel": ("include", "Xác thực quyền truy cập theo tuyến phụ trách"),
            },
            {
                "main": "Theo dõi thống kê công việc cá nhân",
                "rel": ("include", "Tổng hợp số khách & số chuyến trong tháng"),
            },
            {
                "main": "Quản lý thông tin tour phụ trách",
                "rel": ("extend", "Cập nhật lịch trình, điểm nổi bật & chỉ tiêu đoàn"),
            },
            {
                "main": "Kiểm tra danh sách đoàn (Manifest)",
                "rel": ("include", "Tính tỷ lệ lấp đầy & số lượng khách còn thiếu"),
            },
            {
                "main": "Gửi cảnh báo thiếu khách gom đoàn",
                "rel": ("include", "Gắn cờ ưu tiên Sale & gửi thông báo chuông"),
            },
            {
                "main": "Xử lý đơn đặt tour được phân công",
                "rel": ("extend", "Xác nhận đơn / Hoàn thành / Hủy đơn đặt"),
            },
            {
                "main": "Tiếp nhận và xử lý yêu cầu gọi lại tư vấn",
                "rel": ("extend", "Nhận ca tư vấn (Claim) & lưu ghi chú kết quả"),
            },
            {
                "main": "Trả lời khách hàng qua Live Chat",
                "rel": ("extend", "Đóng hoàn tất phiên hỗ trợ trực tuyến"),
            },
            {
                "main": "Kiểm duyệt đánh giá trên tour phụ trách",
                "rel": ("extend", "Xóa đánh giá vi phạm quy chuẩn nội dung"),
            },
        ],
    )
    p4 = generate_sub_usecase(
        "Hinh_2_4_UseCase_QuanTriVien.png",
        "Phân hệ Quản trị viên – Hệ thống Tourism",
        "Quản trị viên",
        [
            {
                "main": "Theo dõi Dashboard & Thống kê doanh thu",
                "rel": ("include", "Tổng hợp biểu đồ doanh thu 12 tháng & Top tour"),
            },
            {
                "main": "Quản lý Tour, Điểm đến và Danh mục",
                "rel": ("extend", "Chỉ định Hướng dẫn viên du lịch phụ trách tour"),
            },
            {
                "main": "Xử lý cảnh báo thiếu khách gom đoàn",
                "rel": ("extend", "Kích hoạt / Tắt chương trình Flash Sale (%)"),
            },
            {
                "main": "Quản lý toàn bộ đơn đặt tour",
                "rel": ("extend", "Duyệt thanh toán / Hoàn thành / Hủy đơn đặt"),
            },
            {
                "main": "Điều phối nhân sự phụ trách đơn đặt",
                "rel": ("include", "Chuyển giao đơn sang Hướng dẫn viên du lịch khác"),
            },
            {
                "main": "Quản lý tài khoản người dùng & Phân quyền",
                "rel": ("extend", "Khóa hoặc mở khóa tài khoản người dùng"),
            },
            {
                "main": "Đặt lại mật khẩu tài khoản người dùng",
                "rel": ("include", "Gửi Email thông báo mật khẩu mới qua SMTP"),
            },
            {
                "main": "Giám sát tư vấn, Live Chat & Đánh giá",
                "rel": ("extend", "Trực tiếp phản hồi hoặc phân công xử lý"),
            },
        ],
    )
    print("Generated:", p1, p2, p3, p4)
