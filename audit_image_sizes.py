import os
import argparse

def audit_image_sizes(directory, size_threshold_kb=500):
    """
    Audits image files in a given directory and its subdirectories,
    reporting their sizes and highlighting those above a specified threshold.
    """
    large_images = []
    all_images = []

    print(f"Starting image size audit in '{directory}' with a threshold of {size_threshold_kb}KB...")

    for root, _, files in os.walk(directory):
        for file in files:
            # Basic check for common image extensions
            if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp')):
                file_path = os.path.join(root, file)
                try:
                    file_size_bytes = os.path.getsize(file_path)
                    file_size_kb = file_size_bytes / 1024
                    all_images.append((file_path, file_size_kb))

                    if file_size_kb > size_threshold_kb:
                        large_images.append((file_path, file_size_kb))
                except Exception as e:
                    print(f"  - Error processing file {file_path}: {e}")

    all_images.sort(key=lambda x: x[1], reverse=True) # Sort by size, largest first

    if all_images:
        print("\n--- Image Size Report ---")
        for img_path, img_size in all_images:
            status = " (LARGE)" if img_size > size_threshold_kb else ""
            print(f"  - {img_path}: {img_size:.2f} KB{status}")
        
        if large_images:
            print(f"\nAudit completed. {len(large_images)} images found larger than {size_threshold_kb}KB.")
        else:
            print(f"\nAudit completed. No images found larger than {size_threshold_kb}KB.")
    else:
        print("\nAudit completed. No image files found.")

def main():
    parser = argparse.ArgumentParser(description="Audit image file sizes in a directory.")
    parser.add_argument("directory", nargs="?", default="images",
                        help="The directory to audit for image files (default: 'images')")
    parser.add_argument("--threshold", type=int, default=500,
                        help="Size threshold in KB to flag images as large (default: 500)")
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Error: Directory '{args.directory}' not found. Please ensure the directory exists.")
        return
    
    audit_image_sizes(args.directory, args.threshold)

if __name__ == "__main__":
    main()

