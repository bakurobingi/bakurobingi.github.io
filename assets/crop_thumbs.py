import os
from PIL import Image

src_folder = "gallery_src"
dst_folder = "gallery_thumbs"
size = (180, 180)

os.makedirs(dst_folder, exist_ok=True)
print("📸 开始裁剪缩略图（输出 JPG，透明铺白底）...\n")

for filename in os.listdir(src_folder):
    if not filename.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
        continue

    src_path = os.path.join(src_folder, filename)
    base, _ = os.path.splitext(filename)
    dst_path = os.path.join(dst_folder, base + ".jpg")

    try:
        im = Image.open(src_path).convert("RGBA")  # 统一拿到透明通道
        # 居中裁成正方形
        w, h = im.size
        m = min(w, h)
        left = (w - m) // 2
        top = (h - m) // 2
        im = im.crop((left, top, left + m, top + m)).resize(size, Image.LANCZOS)

        # 铺白底 -> JPG
        bg = Image.new("RGB", size, (255, 255, 255))
        bg.paste(im, mask=im.split()[-1])  # 使用 alpha 作为 mask
        bg.save(dst_path, "JPEG", quality=85, optimize=True)

        print(f"✅ 已处理: {filename}  ->  {os.path.basename(dst_path)}")
    except Exception as e:
        print(f"❌ 出错 {filename}: {e}")

print("\n🎉 全部完成！结果在 →", dst_folder)
