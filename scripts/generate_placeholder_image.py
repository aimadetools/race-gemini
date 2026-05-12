from PIL import Image, ImageDraw, ImageFont
import os

def generate_placeholder_image(title, filename, width=1200, height=630, quality=80, output_dir="images/blog"):
    background_color = "#f0f0f0"
    text_color = "#333333"

    try:
        font_path = "arial.ttf"  # Try a common font name
        font_size = int(height / 10)  # Scale font size with height
        font = ImageFont.truetype(font_path, font_size)
    except IOError:
        print(f"Warning: Could not load font from {font_path}. Using default Pillow font.")
        font = ImageFont.load_default()
        font_size = int(height / 15) # Adjust for default font and scaled height

    img = Image.new("RGB", (width, height), color=background_color)
    d = ImageDraw.Draw(img)

    # Calculate text size and position
    text_lines = []
    current_line = []
    words = title.split()
    
    # Simple word wrapping for the title
    max_line_width = width - (width // 10) # Some padding, scaled with width
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = d.textbbox((0,0), test_line, font=font)
        text_width = bbox[2] - bbox[0]
        
        if text_width < max_line_width:
            current_line.append(word)
        else:
            text_lines.append(" ".join(current_line))
            current_line = [word]
    text_lines.append(" ".join(current_line))
    
    if not text_lines: # Handle empty title gracefully
        text_lines = ["No Title Provided"]

    total_text_height = sum([d.textbbox((0,0), line, font=font)[3] - d.textbbox((0,0), line, font=font)[1] for line in text_lines]) + (len(text_lines) - 1) * (font_size / 4) # Add some line spacing

    y_text = (height - total_text_height) / 2
    for line in text_lines:
        bbox = d.textbbox((0,0), line, font=font)
        text_width = bbox[2] - bbox[0]
        x_text = (width - text_width) / 2
        d.text((x_text, y_text), line, font=font, fill=text_color)
        y_text += (bbox[3] - bbox[0]) + (font_size / 4) # Move to next line

    # Determine the final output path
    if os.path.dirname(filename) or os.path.isabs(filename): # If filename already includes a directory path or is absolute
        output_path = filename
    else: # If filename is just a basename, join it with output_dir
        output_path = os.path.join(output_dir, filename)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "webp", quality=quality)
    print(f"Generated placeholder image: {output_path}")

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate a placeholder WEBP image with a title.")
    parser.add_argument("title", type=str, help="The title to display on the image.")
    parser.add_argument("filename", type=str, help="The output filename for the WEBP image (e.g., 'post123.webp').")
    parser.add_argument("--width", type=int, default=1200, help="The width of the image.")
    parser.add_argument("--height", type=int, default=630, help="The height of the image.")
    parser.add_argument("--quality", type=int, default=80, help="The quality of the WEBP image (1-100).")
    parser.add_argument("--output-dir", type=str, default="images/blog", help="The output directory for the generated image.")
    args = parser.parse_args()

    generate_placeholder_image(args.title, args.filename, args.width, args.height, args.quality, args.output_dir)
