import os
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


def draw_table_box(draw, x, y, w, table_name, subtitle, fields, row_h=28, header_h=52):
    """
    Draw an ERD table box at top-left (x, y) with width w.
    fields: list of tuples (badge, field_name, field_type)
      badge in ("PK", "FK", "")
    Returns dict mapping field_name -> (left_x, right_x, center_y) and box_bottom_y.
    """
    total_h = header_h + len(fields) * row_h + 6
    # Shadow / border
    draw.rectangle([x, y, x + w, y + total_h], fill="#ffffff", outline="#1e3a8a", width=2)
    draw.rectangle([x, y, x + w, y + header_h], fill="#1e3a8a", outline="#1e3a8a", width=2)

    font_title = get_font(16, bold=True)
    font_sub = get_font(12, italic=True)
    font_badge = get_font(12, bold=True)
    font_field = get_font(14, bold=False)
    font_field_bold = get_font(14, bold=True)
    font_type = get_font(13, bold=False)

    # Header text
    tb = draw.textbbox((0, 0), table_name, font=font_title)
    tw = tb[2] - tb[0]
    draw.text((x + (w - tw) / 2, y + 7), table_name, font=font_title, fill="#ffffff")

    sb = draw.textbbox((0, 0), subtitle, font=font_sub)
    sw = sb[2] - sb[0]
    draw.text((x + (w - sw) / 2, y + 30), subtitle, font=font_sub, fill="#dbeafe")

    anchors = {}
    cur_y = y + header_h + 3
    for i, (badge, fname, ftype) in enumerate(fields):
        ry = cur_y + row_h // 2
        if i % 2 == 1:
            draw.rectangle([x + 2, cur_y, x + w - 2, cur_y + row_h], fill="#f8fafc")

        # Badge (PK / FK)
        if badge == "PK":
            draw.rounded_rectangle([x + 8, cur_y + 4, x + 42, cur_y + row_h - 4], radius=4, fill="#fef3c7", outline="#d97706")
            draw.text((x + 14, cur_y + 6), "PK", font=font_badge, fill="#b45309")
        elif badge == "FK":
            draw.rounded_rectangle([x + 8, cur_y + 4, x + 42, cur_y + row_h - 4], radius=4, fill="#e0e7ff", outline="#4338ca")
            draw.text((x + 14, cur_y + 6), "FK", font=font_badge, fill="#3730a3")

        # Field name
        f_font = font_field_bold if badge in ("PK", "FK") else font_field
        f_color = "#0f172a" if badge != "PK" else "#92400e"
        draw.text((x + 50, cur_y + 5), fname, font=f_font, fill=f_color)

        # Field type right-aligned
        tb_type = draw.textbbox((0, 0), ftype, font=font_type)
        type_w = tb_type[2] - tb_type[0]
        draw.text((x + w - type_w - 10, cur_y + 6), ftype, font=font_type, fill="#475569")

        anchors[fname] = (x, x + w, ry)
        cur_y += row_h

    return anchors, y + total_h


def draw_orth_relation(draw, p_start, p_end, channel_x, card_start="n", card_end="1", color="#1e40af"):
    """
    Draw an orthogonal relationship line from p_start (x1, y1) to p_end (x2, y2) via vertical channel_x.
    """
    x1, y1 = p_start
    x2, y2 = p_end
    pts = [(x1, y1), (channel_x, y1), (channel_x, y2), (x2, y2)]
    for i in range(len(pts) - 1):
        draw.line([pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]], fill=color, width=2)

    # Small circle at FK start and short bar at PK end
    draw.ellipse([x1 - 4, y1 - 4, x1 + 4, y1 + 4], fill=color, outline=color)
    draw.ellipse([x2 - 4, y2 - 4, x2 + 4, y2 + 4], fill="#ffffff", outline=color, width=2)

    font_card = get_font(12, bold=True)
    # Cardinality labels near endpoints
    dx1 = 10 if channel_x > x1 else -20
    dx2 = 10 if channel_x > x2 else -20
    draw.text((x1 + dx1, y1 - 16), card_start, font=font_card, fill=color)
    draw.text((x2 + dx2, y2 - 16), card_end, font=font_card, fill=color)


def generate_compact_erd():
    """Hinh_2_10_ERD_RutGon.png - Chỉ hiển thị Tên bảng + Khóa chính (PK) & Khóa ngoại (FK)"""
    W, H = 1820, 1180
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    # Outer border & Title banner
    draw.rectangle([20, 20, W - 20, H - 20], fill="#ffffff", outline="#1e293b", width=3)
    draw.rectangle([20, 20, W - 20, 76], fill="#f1f5f9", outline="#1e293b", width=2)
    font_banner = get_font(20, bold=True)
    banner_text = "SƠ ĐỒ QUAN HỆ THỰC THỂ RÚT GỌN (ERD) - HỆ THỐNG ĐẶT TOUR DU LỊCH TOURISM (11 BẢNG)"
    bb = draw.textbbox((0, 0), banner_text, font=font_banner)
    draw.text(((W - (bb[2] - bb[0])) / 2, 36), banner_text, font=font_banner, fill="#0f172a")

    w_box = 410
    x_left = 65
    x_center = 705
    x_right = 1345

    # Left column tables (5 tables)
    cat_a, _ = draw_table_box(
        draw, x_left, 110, w_box, "categories", "Bảng Danh mục loại hình tour",
        [("PK", "id", "BIGSERIAL")]
    )
    dest_a, _ = draw_table_box(
        draw, x_left, 240, w_box, "destinations", "Bảng Điểm đến du lịch",
        [("PK", "id", "BIGSERIAL")]
    )
    alert_a, _ = draw_table_box(
        draw, x_left, 390, w_box, "tour_sale_alerts", "Bảng Cảnh báo thiếu khách (Flash Sale)",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "BIGINT -> tours.id"), ("FK", "sender_id", "BIGINT -> users.id")]
    )
    fav_a, _ = draw_table_box(
        draw, x_left, 600, w_box, "favorites", "Bảng Danh sách tour yêu thích",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "BIGINT -> tours.id"), ("FK", "user_id", "BIGINT -> users.id")]
    )
    rev_a, _ = draw_table_box(
        draw, x_left, 810, w_box, "reviews", "Bảng Đánh giá & Nhận xét tour",
        [("PK", "id", "BIGSERIAL"), ("FK", "tour_id", "BIGINT -> tours.id"), ("FK", "user_id", "BIGINT -> users.id")]
    )

    # Center column tables (2 core hub tables: tours & users)
    tour_a, _ = draw_table_box(
        draw, x_center, 180, w_box, "tours", "Bảng Chương trình tour du lịch (Bảng trung tâm)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "category_id", "BIGINT -> categories.id"),
            ("FK", "destination_id", "BIGINT -> destinations.id"),
            ("FK", "guide_id", "BIGINT -> users.id"),
        ],
    )
    user_a, _ = draw_table_box(
        draw, x_center, 660, w_box, "users", "Bảng Tài khoản người dùng (KH / HDV / QTV)",
        [("PK", "id", "BIGSERIAL")],
    )

    # Right column tables (4 tables)
    book_a, _ = draw_table_box(
        draw, x_right, 110, w_box, "bookings", "Bảng Đơn đặt tour trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "assigned_guide_id", "BIGINT -> users.id"),
        ],
    )
    cons_a, _ = draw_table_box(
        draw, x_right, 360, w_box, "consultation_requests", "Bảng Yêu cầu tư vấn gọi lại",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "assigned_to_id", "BIGINT -> users.id"),
        ],
    )
    sess_a, _ = draw_table_box(
        draw, x_right, 615, w_box, "chat_sessions", "Bảng Phiên trò chuyện trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "current_tour_id", "BIGINT -> tours.id"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "assigned_to_id", "BIGINT -> users.id"),
        ],
    )
    msg_a, _ = draw_table_box(
        draw, x_right, 885, w_box, "chat_messages", "Bảng Tin nhắn trò chuyện (Bot / HDV / KH)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "session_id", "BIGINT -> chat_sessions.id"),
            ("FK", "sender_user_id", "BIGINT -> users.id"),
        ],
    )

    # Relationship lines in Left Channel (x between 475 and 705)
    draw_orth_relation(draw, (tour_a["category_id"][0], tour_a["category_id"][2]), (cat_a["id"][1], cat_a["id"][2]), 605, "n", "1", "#1d4ed8")
    draw_orth_relation(draw, (tour_a["destination_id"][0], tour_a["destination_id"][2]), (dest_a["id"][1], dest_a["id"][2]), 580, "n", "1", "#1d4ed8")

    # Left tables -> tours.id
    draw_orth_relation(draw, (alert_a["tour_id"][1], alert_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 555, "n", "1", "#0f766e")
    draw_orth_relation(draw, (fav_a["tour_id"][1], fav_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 535, "n", "1", "#0f766e")
    draw_orth_relation(draw, (rev_a["tour_id"][1], rev_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 515, "n", "1", "#0f766e")

    # Left tables -> users.id
    draw_orth_relation(draw, (alert_a["sender_id"][1], alert_a["sender_id"][2]), (user_a["id"][0], user_a["id"][2]), 630, "n", "1", "#b45309")
    draw_orth_relation(draw, (fav_a["user_id"][1], fav_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 650, "n", "1", "#b45309")
    draw_orth_relation(draw, (rev_a["user_id"][1], rev_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 670, "n", "1", "#b45309")

    # Center vertical relation: tours.guide_id -> users.id
    gx = x_center + w_box // 2
    draw.line([gx, 180 + 52 + 4 * 28 + 6, gx, 660], fill="#7c3aed", width=2)
    draw.text((gx + 10, 460), "n (guide_id) -> 1 (users.id)", font=get_font(13, bold=True), fill="#7c3aed")

    # Right Channel (x between 1115 and 1345)
    # Right tables -> tours.id
    draw_orth_relation(draw, (book_a["tour_id"][0], book_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1165, "n", "1", "#0f766e")
    draw_orth_relation(draw, (cons_a["tour_id"][0], cons_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1185, "n", "1", "#0f766e")
    draw_orth_relation(draw, (sess_a["current_tour_id"][0], sess_a["current_tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1205, "n", "1", "#0f766e")

    # Right tables -> users.id
    draw_orth_relation(draw, (book_a["user_id"][0], book_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1235, "n", "1", "#b45309")
    draw_orth_relation(draw, (book_a["assigned_guide_id"][0], book_a["assigned_guide_id"][2]), (user_a["id"][1], user_a["id"][2]), 1250, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["user_id"][0], cons_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1265, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["assigned_to_id"][0], cons_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1280, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["user_id"][0], sess_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1295, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["assigned_to_id"][0], sess_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1310, "n", "1", "#b45309")
    draw_orth_relation(draw, (msg_a["sender_user_id"][0], msg_a["sender_user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1325, "n", "1", "#b45309")

    # chat_messages.session_id -> chat_sessions.id (on right outer margin)
    draw_orth_relation(draw, (msg_a["session_id"][1], msg_a["session_id"][2]), (sess_a["id"][1], sess_a["id"][2]), 1780, "n", "1", "#1d4ed8")

    # Legend at bottom center
    leg_x, leg_y = x_center - 30, 860
    draw.rounded_rectangle([leg_x, leg_y, leg_x + 470, leg_y + 195], radius=12, fill="#f8fafc", outline="#94a3b8", width=2)
    draw.text((leg_x + 20, leg_y + 14), "CHÚ GIẢI KÝ HIỆU SƠ ĐỒ ERD:", font=get_font(15, bold=True), fill="#0f172a")
    draw.text((leg_x + 20, leg_y + 45), "• PK (Primary Key): Khóa chính định danh duy nhất của bảng", font=get_font(14), fill="#92400e")
    draw.text((leg_x + 20, leg_y + 75), "• FK (Foreign Key): Khóa ngoại tham chiếu sang bảng liên kết", font=get_font(14), fill="#3730a3")
    draw.text((leg_x + 20, leg_y + 105), "• 1 — n : Quan hệ Một - Nhiều giữa Bảng chính và Bảng phụ", font=get_font(14), fill="#0f172a")
    draw.text((leg_x + 20, leg_y + 135), "• Ràng buộc duy nhất (Unique): (user_id, tour_id) trên bảng", font=get_font(14), fill="#0f172a")
    draw.text((leg_x + 34, leg_y + 158), "favorites & reviews; booking_code trên bảng bookings", font=get_font(14), fill="#0f172a")

    path = os.path.join(OUT_DIR, "Hinh_2_10_ERD_RutGon.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_full_erd():
    """Hinh_2_11_ERD_DayDu.png - Hiển thị đầy đủ 11 bảng kèm toàn bộ các trường thuộc tính"""
    W, H = 2100, 1960
    img = Image.new("RGB", (W, H), "#ffffff")
    draw = ImageDraw.Draw(img)

    draw.rectangle([20, 20, W - 20, H - 20], fill="#ffffff", outline="#1e293b", width=3)
    draw.rectangle([20, 20, W - 20, 78], fill="#f1f5f9", outline="#1e293b", width=2)
    font_banner = get_font(21, bold=True)
    banner_text = "SƠ ĐỒ QUAN HỆ THỰC THỂ ĐẦY ĐỦ (FULL ERD) - CƠ SỞ DỮ LIỆU POSTGRESQL HỆ THỐNG TOURISM"
    bb = draw.textbbox((0, 0), banner_text, font=font_banner)
    draw.text(((W - (bb[2] - bb[0])) / 2, 36), banner_text, font=font_banner, fill="#0f172a")

    w_box = 460
    x_left = 65
    x_center = 820
    x_right = 1565
    row_h = 25

    # Left Column (5 tables)
    cat_a, y_end = draw_table_box(
        draw, x_left, 105, w_box, "categories", "Bảng Danh mục tour",
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
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "sender_id", "BIGINT -> users.id"),
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
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("", "created_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )
    rev_a, y_end = draw_table_box(
        draw, x_left, y_end + 35, w_box, "reviews", "Bảng Đánh giá & Nhận xét (Unique: tour_id, user_id)",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("", "rating", "SMALLINT (1..5)"),
            ("", "comment", "TEXT"),
            ("", "created_at", "TIMESTAMPTZ"),
            ("", "updated_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    # Center Column (tours & users)
    tour_a, y_c_end = draw_table_box(
        draw, x_center, 105, w_box, "tours", "Bảng Chương trình tour du lịch",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "category_id", "BIGINT -> categories.id"),
            ("FK", "destination_id", "BIGINT -> destinations.id"),
            ("FK", "guide_id", "BIGINT -> users.id"),
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

    user_a, _ = draw_table_box(
        draw, x_center, y_c_end + 80, w_box, "users", "Bảng Người dùng (Kế thừa AbstractUser)",
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

    # Right Column (4 tables)
    book_a, y_r_end = draw_table_box(
        draw, x_right, 105, w_box, "bookings", "Bảng Đơn đặt tour trực tuyến",
        [
            ("PK", "id", "BIGSERIAL"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "assigned_guide_id", "BIGINT -> users.id"),
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
            ("FK", "tour_id", "BIGINT -> tours.id"),
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "assigned_to_id", "BIGINT -> users.id"),
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
            ("FK", "user_id", "BIGINT -> users.id"),
            ("FK", "current_tour_id", "BIGINT -> tours.id"),
            ("FK", "assigned_to_id", "BIGINT -> users.id"),
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
            ("FK", "session_id", "BIGINT -> chat_sessions.id"),
            ("FK", "sender_user_id", "BIGINT -> users.id"),
            ("", "sender_type", "VARCHAR(10)"),
            ("", "message", "TEXT"),
            ("", "message_type", "VARCHAR(30)"),
            ("", "metadata", "JSONB"),
            ("", "created_at", "TIMESTAMPTZ"),
        ],
        row_h=row_h,
    )

    # Left Channel lines (x between 525 and 820)
    draw_orth_relation(draw, (tour_a["category_id"][0], tour_a["category_id"][2]), (cat_a["id"][1], cat_a["id"][2]), 690, "n", "1", "#1d4ed8")
    draw_orth_relation(draw, (tour_a["destination_id"][0], tour_a["destination_id"][2]), (dest_a["id"][1], dest_a["id"][2]), 665, "n", "1", "#1d4ed8")

    draw_orth_relation(draw, (alert_a["tour_id"][1], alert_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 630, "n", "1", "#0f766e")
    draw_orth_relation(draw, (fav_a["tour_id"][1], fav_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 605, "n", "1", "#0f766e")
    draw_orth_relation(draw, (rev_a["tour_id"][1], rev_a["tour_id"][2]), (tour_a["id"][0], tour_a["id"][2]), 580, "n", "1", "#0f766e")

    draw_orth_relation(draw, (alert_a["sender_id"][1], alert_a["sender_id"][2]), (user_a["id"][0], user_a["id"][2]), 720, "n", "1", "#b45309")
    draw_orth_relation(draw, (fav_a["user_id"][1], fav_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 745, "n", "1", "#b45309")
    draw_orth_relation(draw, (rev_a["user_id"][1], rev_a["user_id"][2]), (user_a["id"][0], user_a["id"][2]), 770, "n", "1", "#b45309")

    # Center vertical relation: tours.guide_id -> users.id
    gx = x_center + w_box // 2
    draw.line([gx, y_c_end, gx, y_c_end + 80], fill="#7c3aed", width=2)
    draw.text((gx + 10, y_c_end + 30), "n (guide_id) -> 1 (users.id)", font=get_font(14, bold=True), fill="#7c3aed")

    # Right Channel lines (x between 1280 and 1565)
    draw_orth_relation(draw, (book_a["tour_id"][0], book_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1330, "n", "1", "#0f766e")
    draw_orth_relation(draw, (cons_a["tour_id"][0], cons_a["tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1355, "n", "1", "#0f766e")
    draw_orth_relation(draw, (sess_a["current_tour_id"][0], sess_a["current_tour_id"][2]), (tour_a["id"][1], tour_a["id"][2]), 1380, "n", "1", "#0f766e")

    draw_orth_relation(draw, (book_a["user_id"][0], book_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1410, "n", "1", "#b45309")
    draw_orth_relation(draw, (book_a["assigned_guide_id"][0], book_a["assigned_guide_id"][2]), (user_a["id"][1], user_a["id"][2]), 1430, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["user_id"][0], cons_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1450, "n", "1", "#b45309")
    draw_orth_relation(draw, (cons_a["assigned_to_id"][0], cons_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1470, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["user_id"][0], sess_a["user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1490, "n", "1", "#b45309")
    draw_orth_relation(draw, (sess_a["assigned_to_id"][0], sess_a["assigned_to_id"][2]), (user_a["id"][1], user_a["id"][2]), 1510, "n", "1", "#b45309")
    draw_orth_relation(draw, (msg_a["sender_user_id"][0], msg_a["sender_user_id"][2]), (user_a["id"][1], user_a["id"][2]), 1530, "n", "1", "#b45309")

    # chat_messages.session_id -> chat_sessions.id (outer right margin)
    draw_orth_relation(draw, (msg_a["session_id"][1], msg_a["session_id"][2]), (sess_a["id"][1], sess_a["id"][2]), 2055, "n", "1", "#1d4ed8")

    # Legend at bottom center
    leg_x, leg_y = x_center - 5, 1320
    draw.rounded_rectangle([leg_x, leg_y, leg_x + 470, leg_y + 205], radius=12, fill="#f8fafc", outline="#94a3b8", width=2)
    draw.text((leg_x + 20, leg_y + 16), "CHÚ GIẢI KÝ HIỆU SƠ ĐỒ ERD:", font=get_font(15, bold=True), fill="#0f172a")
    draw.text((leg_x + 20, leg_y + 48), "• PK (Primary Key): Khóa chính định danh duy nhất của bảng", font=get_font(14), fill="#92400e")
    draw.text((leg_x + 20, leg_y + 78), "• FK (Foreign Key): Khóa ngoại tham chiếu sang bảng liên kết", font=get_font(14), fill="#3730a3")
    draw.text((leg_x + 20, leg_y + 108), "• 1 — n : Quan hệ Một - Nhiều giữa Bảng chính và Bảng phụ", font=get_font(14), fill="#0f172a")
    draw.text((leg_x + 20, leg_y + 138), "• Ràng buộc duy nhất (Unique): (user_id, tour_id) trên bảng", font=get_font(14), fill="#0f172a")
    draw.text((leg_x + 34, leg_y + 162), "favorites & reviews; booking_code trên bảng bookings", font=get_font(14), fill="#0f172a")

    path = os.path.join(OUT_DIR, "Hinh_2_11_ERD_DayDu.png")
    img.save(path, "PNG", dpi=(300, 300))
    return path


if __name__ == "__main__":
    p10 = generate_compact_erd()
    p11 = generate_full_erd()
    print("Generated:", p10, p11)
