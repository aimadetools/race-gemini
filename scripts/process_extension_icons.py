import os
from PIL import Image

# Path to the generated image
SOURCE_IMAGE = "/root/.gemini/antigravity-cli/brain/14b3e25e-fb72-488f-99ff-ae6fc6be1e69/localleads_extension_logo_1781164886159.png"
OUTPUT_DIR = "/home/race/race-gemini/chrome-extension"

def main():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        print(f"Created directory: {OUTPUT_DIR}")

    if not os.path.exists(SOURCE_IMAGE):
        print(f"Error: Source image not found at {SOURCE_IMAGE}")
        return

    # Open image
    img = Image.open(SOURCE_IMAGE)
    width, height = img.size
    print(f"Source image loaded. Size: {width}x{height}")

    # Crop the central rounded square card
    left = int(width * 0.16)
    top = int(height * 0.16)
    right = int(width * 0.84)
    bottom = int(height * 0.84)

    cropped_img = img.crop((left, top, right, bottom))
    print(f"Cropped central card. Size: {cropped_img.size}")

    # Resize to Chrome extension standard sizes
    sizes = [16, 48, 128]
    for size in sizes:
        resized = cropped_img.resize((size, size), Image.Resampling.LANCZOS)
        output_path = os.path.join(OUTPUT_DIR, f"icon{size}.png")
        resized.save(output_path, "PNG")
        print(f"Saved: {output_path} ({size}x{size})")

if __name__ == "__main__":
    main()
