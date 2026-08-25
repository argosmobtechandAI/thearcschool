import os
import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_gradient(width, height, top_color, bottom_color):
    base = Image.new('RGB', (width, height), top_color)
    top_r, top_g, top_b = top_color
    bot_r, bot_g, bot_b = bottom_color
    
    # Generate vertical gradient
    gradient = Image.new('RGB', (width, height))
    draw = ImageDraw.Draw(gradient)
    for y in range(height):
        r = int(top_r + (bot_r - top_r) * (y / height))
        g = int(top_g + (bot_g - top_g) * (y / height))
        b = int(top_b + (bot_b - top_b) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b))
    return gradient

def add_rounded_corners(im, rad):
    circle = Image.new('L', (rad * 2, rad * 2), 0)
    draw = ImageDraw.Draw(circle)
    draw.ellipse((0, 0, rad * 2 - 1, rad * 2 - 1), fill=255)
    alpha = Image.new('L', im.size, 255)
    w, h = im.size
    alpha.paste(circle.crop((0, 0, rad, rad)), (0, 0))
    alpha.paste(circle.crop((0, rad, rad, rad * 2)), (0, h - rad))
    alpha.paste(circle.crop((rad, 0, rad * 2, rad)), (w - rad, 0))
    alpha.paste(circle.crop((rad, rad, rad * 2, rad * 2)), (w - rad, h - rad))
    im.putalpha(alpha)
    return im

def build_marketing_screenshot(
    src_img_path,
    output_path,
    target_size=(1284, 2778),
    badge="THE ARC SCHOOL",
    title="Student Dashboard",
    subtitle="All your classes, notices & updates in one place",
    bg_gradient=((10, 25, 60), (0, 0, 128)),
    font_bold_path="/Users/chandanmallik/projects/thearcschool/student_app/assets/fonts/Cabin-Bold.ttf",
    font_regular_path="/Users/chandanmallik/projects/thearcschool/student_app/assets/fonts/Quicksand-Bold.ttf"
):
    W, H = target_size
    canvas = create_gradient(W, H, bg_gradient[0], bg_gradient[1])
    draw = ImageDraw.Draw(canvas)

    # Decorative background circles/glow
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-200, -200, 600, 600), fill=(14, 165, 233, 40))
    glow_draw.ellipse((W - 400, H - 600, W + 300, H + 300), fill=(245, 158, 11, 25))
    canvas.paste(glow, (0, 0), glow)

    # Load Fonts
    try:
        badge_font = ImageFont.truetype(font_bold_path, size=36)
        title_font = ImageFont.truetype(font_bold_path, size=74)
        subtitle_font = ImageFont.truetype(font_regular_path, size=40)
    except Exception:
        badge_font = ImageFont.load_default()
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()

    # Draw Badge
    badge_text = badge.upper()
    badge_bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    bw = badge_bbox[2] - badge_bbox[0]
    bh = badge_bbox[3] - badge_bbox[1]
    
    badge_x = (W - bw) // 2
    badge_y = int(H * 0.055)
    
    # Pill background for badge
    pill_padding_x = 32
    pill_padding_y = 12
    pill_rect = [
        badge_x - pill_padding_x,
        badge_y - pill_padding_y,
        badge_x + bw + pill_padding_x,
        badge_y + bh + pill_padding_y
    ]
    draw.rounded_rectangle(pill_rect, radius=24, fill=(255, 255, 255, 30), outline=(245, 158, 11, 200), width=2)
    draw.text((badge_x, badge_y - 2), badge_text, font=badge_font, fill=(245, 158, 11))

    # Draw Title
    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    tw = title_bbox[2] - title_bbox[0]
    title_x = (W - tw) // 2
    title_y = badge_y + bh + 45
    draw.text((title_x, title_y), title, font=title_font, fill=(255, 255, 255))

    # Draw Subtitle
    sub_bbox = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    sw = sub_bbox[2] - sub_bbox[0]
    sub_x = (W - sw) // 2
    sub_y = title_y + (title_bbox[3] - title_bbox[1]) + 24
    draw.text((sub_x, sub_y), subtitle, font=subtitle_font, fill=(203, 213, 225))

    # Load & Frame Screenshot
    app_img = Image.open(src_img_path).convert('RGBA')
    
    # Device Frame Geometry
    frame_top = sub_y + 110
    frame_width = int(W * 0.84)
    # maintain original aspect ratio or fit nicely
    orig_w, orig_h = app_img.size
    aspect = orig_h / orig_w
    frame_height = int(frame_width * aspect)
    
    # If it overflows target height, scale appropriately
    max_height = H - frame_top + 100
    if frame_height > max_height:
        frame_height = max_height
        frame_width = int(frame_height / aspect)

    frame_x = (W - frame_width) // 2
    
    # Resample app screenshot
    resized_app = app_img.resize((frame_width, frame_height), Image.Resampling.LANCZOS)
    
    # Add rounded corners to screen
    corner_radius = 56
    rounded_app = add_rounded_corners(resized_app, corner_radius)
    
    # Outer device bezel border
    bezel_padding = 16
    bezel_w = frame_width + bezel_padding * 2
    bezel_h = frame_height + bezel_padding * 2
    bezel_x = frame_x - bezel_padding
    bezel_y = frame_top - bezel_padding
    
    # Shadow layer
    shadow_img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow_img)
    shadow_draw.rounded_rectangle(
        [bezel_x + 6, bezel_y + 16, bezel_x + bezel_w - 6, bezel_y + bezel_h + 20],
        radius=corner_radius + 8,
        fill=(0, 0, 0, 160)
    )
    shadow_blurred = shadow_img.filter(ImageFilter.GaussianBlur(radius=28))
    canvas.paste(shadow_blurred, (0, 0), shadow_blurred)

    # Bezel background
    bezel_canvas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    bezel_draw = ImageDraw.Draw(bezel_canvas)
    bezel_draw.rounded_rectangle(
        [bezel_x, bezel_y, bezel_x + bezel_w, bezel_y + bezel_h],
        radius=corner_radius + 6,
        fill=(25, 30, 45, 255),
        outline=(255, 255, 255, 70),
        width=3
    )
    canvas.paste(bezel_canvas, (0, 0), bezel_canvas)

    # Paste app screenshot
    canvas.paste(rounded_app, (frame_x, frame_top), rounded_app)

    # Save final image
    canvas.save(output_path, quality=95)
    print(f"Generated {output_path} ({W}x{H})")

def build_direct_screenshot(src_img_path, output_path, target_size=(1284, 2778), bg_color=(248, 250, 252)):
    W, H = target_size
    canvas = Image.new('RGB', (W, H), bg_color)
    app_img = Image.open(src_img_path).convert('RGBA')
    orig_w, orig_h = app_img.size
    
    # Scale to fit width or height cleanly
    scale = min(W / orig_w, H / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    
    resized = app_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    x = (W - new_w) // 2
    y = (H - new_h) // 2
    canvas.paste(resized, (x, y), resized)
    canvas.save(output_path, quality=95)
    print(f"Generated direct fit {output_path} ({W}x{H})")

def main():
    base_dir = "/Users/chandanmallik/projects/thearcschool/student_app"
    screenshots_dir = os.path.join(base_dir, "screenshots")
    out_dir = os.path.join(base_dir, "app_store_assets", "screenshots")
    os.makedirs(out_dir, exist_ok=True)
    
    items = [
        {
            "src": "dashboard.png",
            "name": "01_dashboard",
            "title": "Smart Student Dashboard",
            "subtitle": "Track attendance, notices & daily insights instantly"
        },
        {
            "src": "timetable.png",
            "name": "02_timetable",
            "title": "Weekly Class Timetable",
            "subtitle": "Stay on schedule with real-time class periods & rooms"
        },
        {
            "src": "results.png",
            "name": "03_academic_results",
            "title": "Exam Results & Progress",
            "subtitle": "Analyze performance with grade cards & score breakdown"
        },
        {
            "src": "work.png",
            "name": "04_assignments_homework",
            "title": "Coursework & Homework",
            "subtitle": "Submit tasks on time and access learning materials"
        },
        {
            "src": "hamburger.png",
            "name": "05_student_portal",
            "title": "Complete School Portal",
            "subtitle": "Access fees, circulars, gallery & academic calendar"
        }
    ]
    
    # Sizes required by App Store Connect:
    # 6.7" Display: 1284 x 2778
    # 6.5" Display: 1242 x 2688
    
    for item in items:
        src_path = os.path.join(screenshots_dir, item["src"])
        if not os.path.exists(src_path):
            continue
            
        # 1. Marketing 6.7" (1284 x 2778)
        out_67 = os.path.join(out_dir, f"{item['name']}_6.7_1284x2778.png")
        build_marketing_screenshot(
            src_path,
            out_67,
            target_size=(1284, 2778),
            badge="THE ARC SCHOOL",
            title=item["title"],
            subtitle=item["subtitle"],
            bg_gradient=((15, 23, 42), (0, 0, 102))
        )
        
        # 2. Marketing 6.5" (1242 x 2688)
        out_65 = os.path.join(out_dir, f"{item['name']}_6.5_1242x2688.png")
        build_marketing_screenshot(
            src_path,
            out_65,
            target_size=(1242, 2688),
            badge="THE ARC SCHOOL",
            title=item["title"],
            subtitle=item["subtitle"],
            bg_gradient=((15, 23, 42), (0, 0, 102))
        )
        
        # 3. Direct Full-screen (Raw scaled 1284 x 2778)
        out_raw = os.path.join(out_dir, f"{item['name']}_raw_1284x2778.png")
        build_direct_screenshot(src_path, out_raw, target_size=(1284, 2778))

if __name__ == "__main__":
    main()
