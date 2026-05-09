import os
import argparse
# import other necessary modules if integrating image processing, e.g., PIL for simple checks

def audit_image_sizes(directory, size_threshold_kb=500):
    """
    Audits image files in a given directory and its subdirectories,
    reporting their sizes and highlighting those above a specified threshold.
    Returns a list of dictionaries for large images with suggested optimizations.
    """
    large_images_report = []
    all_images = []

    # print(f"Starting image size audit in '{directory}' with a threshold of {size_threshold_kb}KB...") # Remove verbose print for cleaner programmatic output

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
                        # Suggest optimization based on common practices
                        optimization_suggestion = "Consider compressing this image or converting it to a more efficient format like WebP."
                        large_images_report.append({
                            "file_path": file_path,
                            "size_kb": round(file_size_kb, 2),
                            "threshold_kb": size_threshold_kb,
                            "suggestion": optimization_suggestion
                        })
                except Exception as e:
                    # print(f"  - Error processing file {file_path}: {e}") # Remove verbose print
                    # For programmatic output, we might want to collect these errors too
                    pass # Or log to a dedicated error list if audit function's return format allows
    
    # Optional: sort large_images_report by size
    large_images_report.sort(key=lambda x: x['size_kb'], reverse=True)

    return large_images_report

def main():
    parser = argparse.ArgumentParser(description="Audit image file sizes in a directory and suggest optimizations.")
    parser.add_argument("directory", nargs="?", default="images",
                        help="The directory to audit for image files (default: 'images')")
    parser.add_argument("--threshold", type=int, default=500,
                        help="Size threshold in KB to flag images as large (default: 500)")
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Error: Directory '{args.directory}' not found. Please ensure the directory exists.")
        return
    
    large_images = audit_image_sizes(args.directory, args.threshold)

    if large_images:
        print("
--- Image Optimization Report ---")
        print(f"{len(large_images)} images found larger than {args.threshold}KB. Consider optimizing them:")
        for img_info in large_images:
            print(f"  - File: {img_info['file_path']}")
            print(f"    Size: {img_info['size_kb']:.2f} KB (Threshold: {img_info['threshold_kb']} KB)")
            print(f"    Suggestion: {img_info['suggestion']}
")
    else:
        print(f"
Audit completed. No images found larger than {args.threshold}KB or no image files found.")

if __name__ == "__main__":
    main()
