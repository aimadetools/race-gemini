import os
from PIL import Image, ImageDraw, ImageFont

def generate_placeholder_image(path, text, width=1200, height=630):
    """Generates a placeholder WEBP image with text."""
    try:
        img = Image.new('RGB', (width, height), color = (73, 109, 137))
        d = ImageDraw.Draw(img)

        # Try to use a default font that is likely to be available
        try:
            # Common Linux font path, adjust as needed for other OS
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 40)
        except IOError:
            # Fallback to a generic font if specific font not found
            font = ImageFont.load_default()
            print(f"Warning: Specific font not found. Using default font for {path}")

        text_width, text_height = d.textbbox((0,0), text, font=font)[2:]
        
        # Calculate x, y coordinates to center the text
        x = (width - text_width) / 2
        y = (height - text_height) / 2

        d.text((x, y), text, fill=(255, 255, 255), font=font)

        os.makedirs(os.path.dirname(path), exist_ok=True)
        img.save(path, "WEBP")
        print(f"Generated placeholder image: {path}")
    except Exception as e:
        print(f"Error generating image {path}: {e}")

if __name__ == "__main__":
    blog_posts = {
        451: "Local SEO for Bakeries",
        452: "Local SEO for Coffee Shops",
        453: "Local SEO for Pet Groomers",
    }

    base_blog_image_dir = "images/blog"
    base_og_image_dir = "images/og_webp"

    for post_num, title in blog_posts.items():
        # Generate main blog image
        blog_image_path = os.path.join(base_blog_image_dir, f"post{post_num}.webp")
        generate_placeholder_image(blog_image_path, title, width=800, height=450)

        # Generate Open Graph image (larger, specific dimensions)
        og_image_path = os.path.join(base_og_image_dir, f"post{post_num}_og.webp")
        og_text = f"OG Image: {title}"
        generate_placeholder_image(og_image_path, og_text, width=1200, height=630)
