import os
from PIL import Image, UnidentifiedImageError

def convert_images_to_webp(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(".jpg"):
                jpg_path = os.path.join(root, file)
                if os.path.getsize(jpg_path) == 0:
                    print(f"Skipping empty file: {jpg_path}")
                    continue

                webp_path = os.path.splitext(jpg_path)[0] + ".webp"
                try:
                    with Image.open(jpg_path) as img:
                        img.save(webp_path, "webp")
                    print(f"Converted {jpg_path} to {webp_path}")
                except UnidentifiedImageError:
                    print(f"Cannot identify image file: {jpg_path}")
                except Exception as e:
                    print(f"Could not convert {jpg_path}: {e}")

if __name__ == "__main__":
    convert_images_to_webp("images")
