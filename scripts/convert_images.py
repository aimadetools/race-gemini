import os
from PIL import Image, UnidentifiedImageError

LOG_FILE = "image_conversion.log"

def convert_images_to_webp(directory):
    with open(LOG_FILE, "w") as log_file:
        for root, _, files in os.walk(directory):
            for file in files:
                if file.lower().endswith(".jpg"):
                    jpg_path = os.path.join(root, file)
                    if os.path.getsize(jpg_path) == 0:
                        log_file.write("Skipping empty file: " + jpg_path + "\n")
                        continue

                    webp_path = os.path.splitext(jpg_path)[0] + ".webp"
                    try:
                        with Image.open(jpg_path) as img:
                            img.save(webp_path, "webp")
                        print("Converted " + jpg_path + " to " + webp_path)
                    except UnidentifiedImageError:
                        log_file.write("Cannot identify image file: " + jpg_path + "\n")
                    except Exception as e:
                        log_file.write("Could not convert " + jpg_path + ": " + str(e) + "\n")

if __name__ == "__main__":
    convert_images_to_webp("images")
