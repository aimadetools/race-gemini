import re
import os
import subprocess

def generate_missing_images(report_file, script_path, image_output_dir):
    missing_images = set()
    
    with open(report_file, 'r') as f:
        for line in f:
            match = re.search(r"Link: /images/blog/(post\d+\.webp|[\w-]+\.webp)", line)
            if match:
                missing_images.add(match.group(1))

    print(f"Found {len(missing_images)} unique missing images. Generating placeholders...")

    for image_name in sorted(list(missing_images)): # Sort for consistent output
        title = f"Placeholder for {image_name.replace('.webp', '')}"
        
        # Construct the full command to run generate_placeholder_image.py
        # Assuming generate_placeholder_image.py is in the current directory
        command = [
            "python3", # Use python3 explicitly
            script_path,
            title,
            image_name,
            "--output-dir",
            image_output_dir
        ]
        
        try:
            # Execute the command
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            print(result.stdout.strip())
        except subprocess.CalledProcessError as e:
            print(f"Error generating {image_name}: {e.stderr.strip()}")
        except FileNotFoundError:
            print(f"Error: python3 command not found. Ensure python3 is in your PATH or specify full path.")

    print("Placeholder generation complete.")

if __name__ == "__main__":
    report_path = "/home/race/.gemini/tmp/race-gemini/broken_links_report.txt"
    placeholder_script = "generate_placeholder_image.py"
    output_directory = "images/blog"
    
    generate_missing_images(report_path, placeholder_script, output_directory)

