from PIL import Image
import os

def generate_responsive_image(input_path, output_dir="images/blog", widths=[480, 800, 1200], quality=80):
    """
    Generates responsive WebP images from a single input image.

    Args:
        input_path (str): Path to the original image file.
        output_dir (str): Directory where responsive images will be saved.
        widths (list): List of target widths for the responsive images.
        quality (int): Quality for WebP conversion (1-100).
    """
    if not os.path.exists(input_path):
        print(f"Error: Input image not found at {input_path}")
        return

    try:
        with Image.open(input_path) as img:
            original_width, original_height = img.size
            aspect_ratio = original_width / original_height

            base_name = os.path.splitext(os.path.basename(input_path))[0]
            os.makedirs(output_dir, exist_ok=True)

            generated_files = []

            for width in widths:
                if width > original_width:
                    # Don't upscale, just use original if smaller than target width
                    target_width = original_width
                    target_height = original_height
                    # Skip if an image of this size was already generated or is the original
                    if (target_width, target_height) in [(i.size[0], i.size[1]) for i in generated_files]:
                        continue
                    
                else:
                    target_width = width
                    target_height = int(width / aspect_ratio)

                resized_img = img.resize((target_width, target_height), Image.LANCZOS)
                
                output_filename = f"{base_name}-{target_width}w.webp"
                output_path = os.path.join(output_dir, output_filename)
                
                resized_img.save(output_path, "webp", quality=quality)
                generated_files.append(resized_img) # Store image object to check for duplicates
                print(f"Generated responsive image: {output_path} ({target_width}x{target_height})")

            # Also save the original size as webp if not already included and it's not webp
            if img.format.lower() != 'webp':
                output_filename = f"{base_name}-{original_width}w.webp"
                output_path = os.path.join(output_dir, output_filename)
                img.save(output_path, "webp", quality=quality)
                print(f"Generated original size WebP: {output_path} ({original_width}x{original_height})")

    except Exception as e:
        print(f"Error processing {input_path}: {e}")

if __name__ == "__main__":
    import argparse
    import glob

    parser = argparse.ArgumentParser(description="Generate responsive WebP images from input images.")
    parser.add_argument("input_paths", nargs='+', help="Path(s) to the input image file(s). Can use glob patterns.")
    parser.add_argument("--output-dir", type=str, default="images/blog", help="The output directory for the generated images.")
    parser.add_argument("--widths", type=int, nargs='*', default=[480, 800, 1200], help="List of target widths for responsive images.")
    parser.add_argument("--quality", type=int, default=80, help="The quality of the WebP images (1-100).")
    args = parser.parse_args()

    for pattern in args.input_paths:
        for input_path in glob.glob(pattern):
            generate_responsive_image(input_path, args.output_dir, args.widths, args.quality)