import os
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


def draw_table_box(draw, x, y, w, table_name, subtitle, fields, row_h=36, header_h=64):
    """
    Draw an ERD table box with large bold fonts readable in Word A4.
    """
    total_h = header_h + len(fields) * row_h + 8
    draw.rectangle([x, y, x + w, y + total_h], fill="#ffffff", outline="#1e3a8a", width=3)
    draw.rectangle([x, y, x + w, y + header_h], fill="#1e3a8a", outline="#1e3a8a", width=3)

    font_title = get_font(22, bold=True)
    font_sub = get_font(15, italic=True)
    font_badge = get_font(15, bold=True)
    font_field = get_font(18, bold=True)
    font_type = get_font(16, bold=True)

    tb = draw.textbbox((0, 0), table_name, font=font_title)
    tw = tb[2] - tb[0]
    draw.text((x + (w - tw) / 2, y + 6), table_name, font=font_title, fill="#ffffff")

    sb = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = sb[2] - sb[0]
    draw.text((x + (w - sw) / 2, y + 36), subtitle, font=font_sub, fill="#dbeafe")

    anchors = {}
    cur_y = y + header_h + 4
    for i, (badge, fname, ftype) in enumerate(fields):
        ry = cur_y + row_h // 2
        if i % 2 == 1:
            draw.rectangle([x + 3, cur_y, x + w - 3, cur_y + row_h], fill="#f1f5f9")

        if badge == "PK":
            draw.rounded_rectangle([x + 8, cur_y + 4, x + 50, cur_y + row_h - 4], radius=5, fill="#fef3c7", outline="#d97706", width=2)
            draw.text((x + 16, cur_y + 7), "PK", font=font_badge, fill="#b45309")
        elif badge == "FK":
            draw.rounded_rectangle([x + 8, cur_y + 4, x + 50, cur_y + row_h - 4], radius=5, fill="#e0e7ff", outline="#4338ca", width=2)
            draw.text((x + 16, cur_y + 7), "FK", font=font_badge, fill="#3730a3")

        f_color = "#0f172a" if badge != "PK" else "#92400e"
        draw.text((x + 58, cur_y + 6), fname, font=font_field, fill=f_color)

        tb_type = draw.textbbox((0, 0), ftype, font=font_type)
        type_w = tb_type[2] - tb_type[0]
        draw.text((x + w - type_w - 10, cur_y + 8), ftype, font=font_type, fill="#334155")

        anchors[fname] = (x, x + w, ry)
        cur_y += row_h

    return anchors, y + total_h


def draw_orth_relation(draw, p_start, p_end, channel_x, card_start="n", card_end="1", color="#1e40af"):
    x1, y1 = p_start
    x2, y2 = p_end
    pts = [(x1, y1), (channel_x, y1), (channel_x, y2), (x2, y2)]
    for i in range(len(pts) - 1):
        draw.line([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]], fill=color, width=3)

    draw.ellipse([x1 - 5, y1 - 5, x1 + 5, y1 + 5], fill=color, outline=color)
    draw.ellipse([x2 - 5, y2 - 5, x2 + 5, y2 + 5], fill="#ffffff", outline=color, width=3)

    font_card = get_font(16, bold=True)
    dx1 = 10 if channel_x > x1 else -22
    dx2 = 10 if channel_x > x2 else -22
    draw.text((x1 + dx1, y1 - 22), card_start, font=font_card, fill=color)
    draw.text((x2 + dx2, y2 - 22), card_end, font=font_card, fill=color)


def generate_compact_erd():
    """Hinh_2_10_ERD_RutGon.png - Chữ to rõ nét cho trang Word A4"""
    W, H = 1560, 1340
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([12, 12, W - 12, H - 12], fill="#ffffff", outline="#0f172a", width=3)
    draw.rectangle([12, 12, W - 12, 74], fill="#e2e8f0", outline="#0f172a", width=3)
    font_banner = get_font(24, bold=True)
    banner_text = "SƠ ĐỒ QUAN HỆ THỰC THỂ RÚT GỌN (ERD) - HỆ THỐNG ĐẶT TOUR DU LỊCH TOURISM (11 BẢNG)"
    bb = draw.textbbox((0, 0), banner_text, font=font_banner)
    draw.text(((W - (bb[2] - bb[0])) / 2, 29), banner_text, font=font_banner, fill="#0f172a")

    w_box = 435
    x_left = 32
    x_center = 562
    x_right = 1085

    cat_a, _ = draw_table_box(
        draw, x_left, 95, w_box, "categories", "Bảng Danh mục loại hình tour",
        [("PK", "id", "BIGSERIAL")]
    )
    dest_a, _ = draw_table_box(
        draw, x_left, 235, w_box, "destinations", "Bảng Điểm đến du lịch",
        [("PK", "id", "BIGSERIAL")]
    )
    alert_a, _ = draw_table_box(
        draw, x_left, 385, w_box, "tour_sale_alerts", "Bảng Cảnh báo thiếu khách (Flash Sale)",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "-> tours.id"), ("FK", "sender_id", "-> users.id")]
    )
    fav_a, _ = draw_table_box(
        draw, x_left, 615, w_box, "favorites", "Bảng Danh sách tour yêu thích",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "-> tours.id"), ("FK", "user_id", "-> users.id")]
    )
    rev_a, _ = draw_table_box(
        draw, x_left, 845, w_box, "reviews", "Bảng Đánh giá & Nhận xét tour",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "-> tours.id"), ("FK", "user_id", "-> users.id")]
    )

    tour_a, y_t_bot = draw_table_box(
        draw, x_center, 150, w_box, "tours", "Bảng Chương trình tour (Bảng trung tâm)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "category_id", "-> categories.id"),
            ("FK", "destination_id", "-> destinations.id"),
            ("FK", "guide_id", "-> users.id"),
        ],
    )
    user_a, _ = draw_table_box(
        draw, x_center, 690, w_box, "users", "Bảng Tài khoản (KH / HDV / QTV)",
        [("PK", "id", "BIGSERIAL")],
    )

    book_a, _ = draw_table_box(
        draw, x_right, 95, w_box, "bookings", "Bảng Đơn đặt tour trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "assigned_guide_id", "-> users.id"),
        ],
    )
    cons_a, _ = draw_table_box(
        draw, x_right, 375, w_box, "consultation_requests", "Bảng Yêu cầu tư vấn gọi lại",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "assigned_to_id", "-> users.id"),
        ],
    )
    sess_a, _ = draw_table_box(
        draw, x_right, 660, w_box, "chat_sessions", "Bảng Phiên trò chuyện trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "current_tour_id", "-> tours.id"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "assigned_to_id", "-> users.id"),
        ],
    )
    msg_a, _ = draw_table_box(
        draw, x_right, 955, w_box, "chat_messages", "Bảng Tin nhắn trò chuyện (Bot/HDV/KH)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "session_id", "-> chat_sessions.id"),
            ("FK", "sender_user_id", "-> users.id"),
        ],
    )

    # Left Channel (x between 467 and 562)
    draw_orth_relation(draw, (tour_a["category_id"][0], tour_a["category_id"][2]), (cat_a["id"][1], cat_a["id"][2]), 515, "n", "1", "#1d4ed8")
    draw_orth_relation(draw, (tour_a["destination_id"][0], tour_a["destination_id"][2]), (dest_a["id"][1], dest_a["id"][2]), 503, "n", "1", "#1d4ed8")

    draw_orth_relation(draw, (alert_a["tour_id"][1], alert_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 491, "n", "1", "#0f766e")
    draw_orth_relation(draw, (fav_a["tour_id"][1], fav_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 481, "n", "1", "#0f766e")
    draw_orth_relation(draw, (rev_a["tour_id"][1], rev_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 472, "n", "1", "#0f766e")

    draw_orth_relation(draw, (alert_a["sender_id"][1], alert_a["sender_id"][2]), (user_a["id"][0], user_a["id"][2]), 526, "n", "1", "#b45309")
    draw_orth_relation(draw, (fav_a["user_id"][1], fav_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 536, "n", "1", "#b45309")
    draw_orth_relation(draw, (rev_a["user_id"][1], rev_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 546, "n", "1", "#b45309")

    # Center vertical relation
    gx = x_center + w_box // 2
    draw.line([gx, y_t_bot, gx, 690], fill="#7c3aed", width=3)
    draw.text((gx + 10, 505), "n (guide_id) -> 1 (users.id)", font=get_font(18, bold=True), fill="#7c3aed")

    # Right Channel (x between 997 and 1085)
    draw_orth_relation(draw, (book_a["tour_id"][0], book_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1010, "n", "1", "#0f766e")
    draw_orth_relation(draw, (cons_a["tour_id"][0], cons_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1020, "n", "1", "#0f766e")
    draw_orth_relation(draw, (sess_a["current_tour_id"][0], sess_a["current_tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1030, "n", "1", "#0f766e")

    draw_orth_relation(draw, (book_a["user_id"][0], book_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1040, "n", "1", "#b45309")
    draw_orth_relation(draw, (book_a["assigned_guide_id"][0], book_a["assigned_guide_id"][2]), (user_a["id"][1], user_a["id"][2]), 1048, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["user_id"][0], cons_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1055, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["assigned_to_id"][0], cons_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1062, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["user_id"][0], sess_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1068, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["assigned_to_id"][0], sess_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1074, "n", "1", "#b45309")
    draw_orth_relation(draw, (msg_a["sender_user_id"][0], msg_a["sender_user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1080, "n", "1", "#b45309")

    draw_orth_relation(draw, (msg_a["session_id"][1], msg_a["session_id"][2]), (sess_a["id"][1], sess_a["id"][2]), 1534, "n", "1", "#1d4ed8")

    # Legend at bottom center
    leg_x, leg_y = x_center - 15, 920
    draw.rounded_rectangle([leg_x, leg_y, leg_x + 465, leg_y + 245], radius=14, fill="#f8fafc", outline="#475569", width=3)
    draw.text((leg_x + 18, leg_y + 16), "CHÚ GIẢI KÝ HIỆU SƠ ĐỒ ERD:", font=get_font(19, bold=True), fill="#0f172a")
    draw.text((leg_x + 18, leg_y + 55), "• PK (Primary Key): Khóa chính định danh bảng", font=get_font(18, bold=True), fill="#92400e")
    draw.text((leg_x + 18, leg_y + 92), "• FK (Foreign Key): Khóa ngoại liên kết bảng", font=get_font(18, bold=True), fill="#3730a3")
    draw.text((leg_x + 18, leg_y + 129), "• 1 — n : Quan hệ Một - Nhiều giữa các bảng", font=get_font(18, bold=True), fill="#0f172a")
    draw.text((leg_x + 18, leg_y + 166), "• Ràng buộc duy nhất (Unique): cặp (user_id,", font=get_font(18, bold=True), fill="#0f172a")
    draw.text((leg_x + 32, leg_y + 196), "tour_id) trên favorites & reviews; booking_code", font=get_font(18, bold=True), fill="#0f172a")

    path = os.path.join(OUT_DIR, "Hinh_2_10_ERD_RutGon.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_full_erd():
    """Hinh_2_11_ERD_DayDu.png - Hiển thị đầy đủ 11 bảng với chữ to đậm rõ nét"""
    W, H = 1720, 2320
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([12, 12, W - 12, H - 12], fill="#ffffff", outline="#0f172a", width=3)
    draw.rectangle([12, 12, W - 12, 74], fill="#e2e8f0", outline="#0f172a", width=3)
    font_banner = get_font(24, bold=True)
    banner_text = "SƠ ĐỒ QUAN HỆ THỰC THỂ ĐẦY ĐỦ (FULL ERD) - CƠ SỞ DỮ LIỆU POSTGRESQL HỆ THỐNG TOURISM"
    bb = draw.textbbox((0, 0), banner_text, font=font_banner)
    draw.text(((W - (bb[2] - bb[0])) / 2, 29), banner_text, font=font_banner, fill="#0f172a")

    w_box = 485
    x_left = 30
    x_center = 618
    x_right = 1200
    row_h = 31

    cat_a, y_end = draw_table_box(
        draw, x_left, 95, w_box, "categories", "Bảng Danh mục tour",
        [
            ("PK", "id", "BIGSERIAL"),
            ("", "name", "VARCHAR(100)"),
            ("", "slug", "VARCHAR(100) UNIQUE"),
        ],
        row_h=row_h,
    )
    dest_a, y_end = draw_table_box(
        draw, x_left, y_end + 35, w_box, "destinations", "Bảng Điểm đến du lịch",
        [
            ("PK", "id", "BIGSERIAL"),
            ("", "name", "VARCHAR(200)"),
            ("", "slug", "VARCHAR(200) UNIQUE"),
            ("", "image_url", "VARCHAR(500)"),
            ("", "tour_count", "INTEGER DEFAULT 0"),
            ("", "is_active", "BOOLEAN DEFAULT TRUE"),
            ("", "order", "SMALLINT DEFAULT 0"),
        ],
        row_h=row_h,
    )
    alert_a, y_end = draw_table_box(
        draw, x_left, y_end + 35, w_box, "tour_sale_alerts", "Bảng Cảnh báo thiếu khách (Flash Sale)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "sender_id", "-> users.id"),
            ("", "title", "VARCHAR(255)"),
            ("", "message", "TEXT"),
            ("", "target_participants", "INTEGER DEFAULT 20"),
            ("", "current_booked", "INTEGER DEFAULT 0"),
            ("", "shortage_count", "INTEGER DEFAULT 0"),
            ("", "is_read", "BOOLEAN DEFAULT FALSE"),
            ("", "created_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    fav_a, y_end = draw_table_box(
        draw, x_left, y_end + 35, w_box, "favorites", "Bảng Tour yêu thích (Unique: user_id, tour_id)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "tour_id", "-> tours.id"),
            ("", "created_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    rev_a, y_end = draw_table_box(
        draw, x_left, y_end + 35, w_box, "reviews", "Bảng Đánh giá & Nhận xét (Unique: tour_id, user_id)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "user_id", "-> users.id"),
            ("", "rating", "SMALLINT (1..5)"),
            ("", "comment", "TEXT"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    tour_a, y_c_end = draw_table_box(
        draw, x_center, 95, w_box, "tours", "Bảng Chương trình tour du lịch",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "category_id", "-> categories.id"),
            ("FK", "destination_id", "-> destinations.id"),
            ("FK", "guide_id", "-> users.id"),
            ("", "name", "VARCHAR(500)"),
            ("", "price_adult", "NUMERIC(12,0)"),
            ("", "thumbnail", "VARCHAR(500)"),
            ("", "rating", "NUMERIC(3,1) DEFAULT 0"),
            ("", "review_count", "INTEGER DEFAULT 0"),
            ("", "booked_count", "VARCHAR(20) DEFAULT '0'"),
            ("", "target_participants", "INTEGER DEFAULT 20"),
            ("", "tags", "JSONB"),
            ("", "highlights", "JSONB"),
            ("", "itinerary", "JSONB"),
            ("", "gallery", "JSONB"),
            ("", "promo", "VARCHAR(200) NULL"),
            ("", "is_hot", "BOOLEAN DEFAULT FALSE"),
            ("", "is_featured", "BOOLEAN DEFAULT FALSE"),
            ("", "is_active", "BOOLEAN DEFAULT TRUE"),
            ("", "is_priority_sale", "BOOLEAN DEFAULT FALSE"),
            ("", "sale_percent", "SMALLINT DEFAULT 0"),
            ("", "last_sale_alert_at", "TIMESTAMPTZ NULL"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    user_a, y_u_end = draw_table_box(
        draw, x_center, y_c_end + 85, w_box, "users", "Bảng Người dùng (Kế thừa AbstractUser)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("", "username", "VARCHAR(150) UNIQUE"),
            ("", "password", "VARCHAR(128)"),
            ("", "email", "VARCHAR(254)"),
            ("", "first_name", "VARCHAR(150)"),
            ("", "last_name", "VARCHAR(150)"),
            ("", "phone", "VARCHAR(20) NULL"),
            ("", "avatar", "TEXT NULL"),
            ("", "is_superuser", "BOOLEAN (Quản trị viên)"),
            ("", "is_staff", "BOOLEAN (Hướng dẫn viên)"),
            ("", "is_active", "BOOLEAN DEFAULT TRUE"),
            ("", "last_login", "TIMESTAMPTZ NULL"),
            ("", "date_joined", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    book_a, y_r_end = draw_table_box(
        draw, x_right, 95, w_box, "bookings", "Bảng Đơn đặt tour trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "assigned_guide_id", "-> users.id"),
            ("", "booking_code", "VARCHAR(50) UNIQUE"),
            ("", "travel_date", "DATE"),
            ("", "num_adults", "SMALLINT DEFAULT 1"),
            ("", "num_children", "SMALLINT DEFAULT 0"),
            ("", "price_adult", "NUMERIC(12,0)"),
            ("", "price_child", "NUMERIC(12,0)"),
            ("", "total_price", "NUMERIC(14,0)"),
            ("", "contact_name", "VARCHAR(200)"),
            ("", "contact_phone", "VARCHAR(20)"),
            ("", "contact_email", "VARCHAR(254)"),
            ("", "special_request", "TEXT"),
            ("", "status", "VARCHAR(20)"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    cons_a, y_r_end = draw_table_box(
        draw, x_right, y_r_end + 35, w_box, "consultation_requests", "Bảng Yêu cầu tư vấn gọi lại",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "-> tours.id"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "assigned_to_id", "-> users.id"),
            ("", "customer_name", "VARCHAR(150)"),
            ("", "phone", "VARCHAR(20)"),
            ("", "email", "VARCHAR(254)"),
            ("", "note", "TEXT"),
            ("", "status", "VARCHAR(20)"),
            ("", "admin_note", "TEXT"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    sess_a, y_r_end = draw_table_box(
        draw, x_right, y_r_end + 35, w_box, "chat_sessions", "Bảng Phiên trò chuyện trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("", "session_id", "VARCHAR(64) UNIQUE"),
            ("FK", "user_id", "-> users.id"),
            ("FK", "current_tour_id", "-> tours.id"),
            ("FK", "assigned_to_id", "-> users.id"),
            ("", "customer_name", "VARCHAR(150)"),
            ("", "customer_phone", "VARCHAR(20)"),
            ("", "customer_email", "VARCHAR(254)"),
            ("", "status", "VARCHAR(20)"),
            ("", "unread_staff_count", "INTEGER DEFAULT 0"),
            ("", "unread_customer_count", "INTEGER DEFAULT 0"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    msg_a, y_r_end = draw_table_box(
        draw, x_right, y_r_end + 35, w_box, "chat_messages", "Bảng Tin nhắn trò chuyện",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "session_id", "-> chat_sessions.id"),
            ("FK", "sender_user_id", "-> users.id"),
            ("", "sender_type", "VARCHAR(10)"),
            ("", "message", "TEXT"),
            ("", "message_type", "VARCHAR(30)"),
            ("", "metadata", "JSONB"),
            ("", "created_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    # Left Channel (x between 515 and 618)
    draw_orth_relation(draw, (tour_a["category_id"][0], tour_a["category_id"][2]), (cat_a["id"][1], cat_a["id"][2]), 568, "n", "1", "#1d4ed8")
    draw_orth_relation(draw, (tour_a["destination_id"][0], tour_a["destination_id"][2]), (dest_a["id"][1], dest_a["id"][2]), 556, "n", "1", "#1d4ed8")

    draw_orth_relation(draw, (alert_a["tour_id"][1], alert_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 544, "n", "1", "#0f766e")
    draw_orth_relation(draw, (fav_a["tour_id"][1], fav_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 533, "n", "1", "#0f766e")
    draw_orth_relation(draw, (rev_a["tour_id"][1], rev_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 523, "n", "1", "#0f766e")

    draw_orth_relation(draw, (alert_a["sender_id"][1], alert_a["sender_id"][2]), (user_a["id"][0], user_a["id"][2]), 580, "n", "1", "#b45309")
    draw_orth_relation(draw, (fav_a["user_id"][1], fav_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 592, "n", "1", "#b45309")
    draw_orth_relation(draw, (rev_a["user_id"][1], rev_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 604, "n", "1", "#b45309")

    # Center vertical relation
    gx = x_center + w_box // 2
    draw.line([gx, y_c_end, gx, y_c_end + 85], fill="#7c3aed", width=3)
    draw.text((gx + 12, y_c_end + 32), "n (guide_id) -> 1 (users.id)", font=get_font(18, bold=True), fill="#7c3aed")

    # Right Channel (x between 1103 and 1200)
    draw_orth_relation(draw, (book_a["tour_id"][0], book_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1116, "n", "1", "#0f766e")
    draw_orth_relation(draw, (cons_a["tour_id"][0], cons_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1126, "n", "1", "#0f766e")
    draw_orth_relation(draw, (sess_a["current_tour_id"][0], sess_a["current_tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1136, "n", "1", "#0f766e")

    draw_orth_relation(draw, (book_a["user_id"][0], book_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1146, "n", "1", "#b45309")
    draw_orth_relation(draw, (book_a["assigned_guide_id"][0], book_a["assigned_guide_id"][2]), (user_a["id"][1], user_a["id"][2]), 1154, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["user_id"][0], cons_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1162, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["assigned_to_id"][0], cons_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1170, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["user_id"][0], sess_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1177, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["assigned_to_id"][0], sess_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1184, "n", "1", "#b45309")
    draw_orth_relation(draw, (msg_a["sender_user_id"][0], msg_a["sender_user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1191, "n", "1", "#b45309")

    draw_orth_relation(draw, (msg_a["session_id"][1], msg_a["session_id"][2]), (sess_a["id"][1], sess_a["id"][2]), 1698, "n", "1", "#1d4ed8")

    # Legend at bottom center
    leg_x, leg_y = x_center, y_u_end + 55
    draw.rounded_rectangle([leg_x, leg_y, leg_x + 485, leg_y + 245], radius=14, fill="#f8fafc", outline="#475569", width=3)
    draw.text((leg_x + 18, leg_y + 16), "CHÚ GIẢI KÝ HIỆU SƠ ĐỒ ERD:", font=get_font(19, bold=True), fill="#0f172a")
    draw.text((leg_x + 18, leg_y + 55), "• PK (Primary Key): Khóa chính định danh bảng", font=get_font(18, bold=True), fill="#92400e")
    draw.text((leg_x + 18, leg_y + 92), "• FK (Foreign Key): Khóa ngoại liên kết bảng", font=get_font(18, bold=True), fill="#3730a3")
    draw.text((leg_x + 18, leg_y + 129), "• 1 — n : Quan hệ Một - Nhiều giữa các bảng", font=get_font(18, bold=True), fill="#0f172a")
    draw.text((leg_x + 18, leg_y + 166), "• Ràng buộc duy nhất (Unique): cặp (user_id,", font=get_font(18, bold=True), fill="#0f172a")
    draw.text((leg_x + 32, leg_y + 196), "tour_id) trên favorites & reviews; booking_code", font=get_font(18, bold=True), fill="#0f172a")

    path = os.path.join(OUT_DIR, "Hinh_2_11_ERD_DayDu.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


if __name__ == "__main__":
    p10 = generate_compact_erd()
    p11 = generate_full_erd()
    print("Generated:", p10, p11)
