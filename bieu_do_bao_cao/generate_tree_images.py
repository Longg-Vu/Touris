import os
from PIL import Image, ImageDraw, ImageFont

OUT_DIR = r"d:\DoAnTotNghiep\Tourism\bieu_do_bao_cao"
os.makedirs(OUT_DIR, exist_ok=True)

FONT_SEGOE = "C:/Windows/Fonts/segoeui.ttf"
FONT_SEGOE_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_ARIAL = "C:/Windows/Fonts/arial.ttf"
FONT_ARIAL_BOLD = "C:/Windows/Fonts/arialbd.ttf"


def get_font(size, bold=False):
    if bold:
        path = FONT_SEGOE_BOLD if os.path.exists(FONT_SEGOE_BOLD) else FONT_ARIAL_BOLD
    else:
        path = FONT_SEGOE if os.path.exists(FONT_SEGOE) else FONT_ARIAL
    return ImageFont.truetype(path, size)


def draw_chevron(draw, cx, cy, expanded=False, color="#cccccc"):
    """Draw VS Code style '>' or 'v' chevron."""
    if expanded:
        # 'v'
        draw.line([(cx - 6, cy - 3), (cx, cy + 4), (cx + 6, cy - 3)], fill=color, width=2)
    else:
        # '>'
        draw.line([(cx - 3, cy - 6), (cx + 4, cy), (cx - 3, cy + 6)], fill=color, width=2)


def draw_folder_icon(draw, x, y, expanded=False):
    """Draw VS Code golden-brown folder icon at top-left (x, y) size ~22x18."""
    color = "#c09553"
    tab_color = "#d4a96a"
    # Folder tab on top-left
    draw.polygon([(x, y + 3), (x + 9, y + 3), (x + 11, y + 6), (x, y + 6)], fill=tab_color)
    # Main folder body
    draw.rounded_rectangle([x, y + 5, x + 22, y + 19], radius=2, fill=color)
    if expanded:
        # Slightly lighter open flap
        draw.polygon([(x + 1, y + 9), (x + 22, y + 9), (x + 20, y + 19), (x - 1, y + 19)], fill="#d6a862")


def draw_file_icon(draw, x, y, icon_type):
    """Draw VS Code style file icons at top-left (x, y) size ~20x20."""
    if icon_type == "env":
        draw.rounded_rectangle([x + 1, y + 1, x + 20, y + 20], radius=2, fill="#ebd54b")
        f = get_font(7, bold=True)
        draw.text((x + 2, y + 11), ".ENV", font=f, fill="#181818")
    elif icon_type == "py":
        # Python top-left blue, bottom-right yellow
        draw.rounded_rectangle([x + 6, y + 1, x + 15, y + 10], radius=3, fill="#3776ab")
        draw.rounded_rectangle([x + 2, y + 5, x + 15, y + 11], radius=3, fill="#3776ab")
        draw.rounded_rectangle([x + 6, y + 10, x + 19, y + 16], radius=3, fill="#ffd343")
        draw.rounded_rectangle([x + 6, y + 11, x + 15, y + 20], radius=3, fill="#ffd343")
    elif icon_type == "txt":
        draw.rounded_rectangle([x + 3, y + 1, x + 18, y + 20], radius=2, fill="#2b2b2b", outline="#9da5b4", width=2)
        for ly in (y + 6, y + 10, y + 14):
            draw.line([x + 6, ly, x + 15, ly], fill="#9da5b4", width=2)
    elif icon_type == "jsx":
        # React cyan atom
        cx, cy = x + 11, y + 10
        draw.ellipse([cx - 9, cy - 4, cx + 9, cy + 4], outline="#61dafb", width=2)
        draw.ellipse([cx - 4, cy - 9, cx + 4, cy + 9], outline="#61dafb", width=2)
        draw.ellipse([cx - 2, cy - 2, cx + 2, cy + 2], fill="#61dafb")
    elif icon_type == "js":
        draw.rounded_rectangle([x + 1, y + 1, x + 20, y + 20], radius=2, fill="#f7df1e")
        f = get_font(11, bold=True)
        draw.text((x + 5, y + 4), "JS", font=f, fill="#181818")
    elif icon_type == "css":
        draw.rounded_rectangle([x + 1, y + 1, x + 20, y + 20], radius=2, fill="#42a5f5")
        f = get_font(13, bold=True)
        draw.text((x + 6, y + 2), "#", font=f, fill="#ffffff")
    elif icon_type == "html":
        draw.rounded_rectangle([x + 1, y + 1, x + 20, y + 20], radius=2, fill="#e44d26")
        f = get_font(11, bold=True)
        draw.text((x + 3, y + 4), "<>", font=f, fill="#ffffff")
    elif icon_type == "json":
        f = get_font(16, bold=True)
        draw.text((x + 3, y), "{ }", font=f, fill="#fbc02d")
    elif icon_type == "git":
        draw.ellipse([x + 3, y + 3, x + 18, y + 18], fill="#f05032")
        draw.line([x + 7, y + 10, x + 14, y + 10], fill="#ffffff", width=2)
    elif icon_type == "md":
        draw.rounded_rectangle([x + 1, y + 3, x + 20, y + 18], radius=2, fill="#42a5f5")
        f = get_font(10, bold=True)
        draw.text((x + 3, y + 4), "M↓", font=f, fill="#ffffff")


def render_vscode_tree(filename, items, width=540):
    """
    Render a VS Code Dark Explorer tree image matching the user's screenshot.
    items: list of dicts:
      {
        'level': int (0, 1, 2, 3),
        'kind': 'root' | 'folder' | 'file',
        'expanded': bool,
        'icon': str (for file),
        'name': str,
        'dim': bool (e.g. venv / node_modules / dist dimmed in gitignore)
      }
    """
    row_h = 38
    pad_top = 14
    pad_bot = 16
    H = pad_top + len(items) * row_h + pad_bot
    W = width

    img = Image.new("RGB", (W, H), "#181818")
    draw = ImageDraw.Draw(img)

    font = get_font(21, bold=False)
    font_root = get_font(21, bold=False)

    for idx, item in enumerate(items):
        y_top = pad_top + idx * row_h
        cy = y_top + row_h // 2
        lvl = item["level"]

        # Draw vertical indent guide lines for levels >= 1
        for g_lvl in range(1, lvl + 1):
            gx = 18 + (g_lvl - 1) * 24
            draw.line([gx, y_top, gx, y_top + row_h], fill="#383838", width=1)

        base_x = 18 + lvl * 24
        text_color = "#7a7a7a" if item.get("dim") else "#d4d4d4"

        if item["kind"] == "root":
            draw_chevron(draw, base_x, cy, expanded=True, color="#cccccc")
            draw.text((base_x + 16, y_top + 5), item["name"], font=font_root, fill="#cccccc")
        elif item["kind"] == "folder":
            draw_chevron(draw, base_x, cy, expanded=item.get("expanded", False), color="#cccccc")
            draw_folder_icon(draw, base_x + 15, cy - 10, expanded=item.get("expanded", False))
            draw.text((base_x + 46, y_top + 5), item["name"], font=font, fill=text_color)
        else:
            # File
            draw_file_icon(draw, base_x + 14, cy - 10, item["icon"])
            draw.text((base_x + 46, y_top + 5), item["name"], font=font, fill=text_color)

    path = os.path.join(OUT_DIR, filename)
    img.save(path, "PNG", dpi=(300, 300))
    return path


def generate_backend_vscode():
    items = [
        {"level": 0, "kind": "root", "name": "Tourism"},
        {"level": 1, "kind": "folder", "expanded": True, "name": "backend"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "accounts"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "bookings"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "chat"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "reviews"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "tourism_backend"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "tours"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "venv", "dim": True},
        {"level": 2, "kind": "file", "icon": "env", "name": ".env", "dim": True},
        {"level": 2, "kind": "file", "icon": "env", "name": ".env.example"},
        {"level": 2, "kind": "file", "icon": "py", "name": "manage.py"},
        {"level": 2, "kind": "file", "icon": "txt", "name": "requirements.txt"},
        {"level": 2, "kind": "file", "icon": "py", "name": "seed_guides.py"},
    ]
    return render_vscode_tree("Hinh_3_1_CauTruc_Backend.png", items, width=480)


def generate_frontend_vscode():
    items = [
        {"level": 0, "kind": "root", "name": "Tourism"},
        {"level": 1, "kind": "folder", "expanded": True, "name": "frontend"},
        {"level": 2, "kind": "folder", "expanded": False, "name": "dist", "dim": True},
        {"level": 2, "kind": "folder", "expanded": False, "name": "node_modules", "dim": True},
        {"level": 2, "kind": "folder", "expanded": False, "name": "public"},
        {"level": 2, "kind": "folder", "expanded": True, "name": "src"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "api"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "assets"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "components"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "context"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "pages"},
        {"level": 3, "kind": "folder", "expanded": False, "name": "utils"},
        {"level": 3, "kind": "file", "icon": "css", "name": "App.css"},
        {"level": 3, "kind": "file", "icon": "jsx", "name": "App.jsx"},
        {"level": 3, "kind": "file", "icon": "css", "name": "index.css"},
        {"level": 3, "kind": "file", "icon": "jsx", "name": "main.jsx"},
        {"level": 2, "kind": "file", "icon": "env", "name": ".env.example"},
        {"level": 2, "kind": "file", "icon": "git", "name": ".gitignore"},
        {"level": 2, "kind": "file", "icon": "html", "name": "index.html"},
        {"level": 2, "kind": "file", "icon": "json", "name": "package-lock.json"},
        {"level": 2, "kind": "file", "icon": "json", "name": "package.json"},
        {"level": 2, "kind": "file", "icon": "md", "name": "README.md"},
        {"level": 2, "kind": "file", "icon": "js", "name": "vite.config.js"},
    ]
    return render_vscode_tree("Hinh_3_2_CauTruc_Frontend.png", items, width=480)


if __name__ == "__main__":
    p1 = generate_backend_vscode()
    p2 = generate_frontend_vscode()
    print("Generated:", p1, p2)
