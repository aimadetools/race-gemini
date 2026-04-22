import re
import sys
import os

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Regex to remove the existing social-share div block
    # It handles various indentations and content within the div.
    old_social_share_regex = r'(?s)\s*<div class="social-share">.*?</div>\s*'
    content_after_removal = re.sub(old_social_share_regex, "", content)

    # The new social share HTML and script to insert
    new_social_share_block = """            <div id="social-share-container" class="social-share"></div>
            <script src="../js/social-share.js"></script>"""

    # Insert the new block before the closing </main> tag
    # This also handles potential variations in </main> tag indentation.
    # We look for </main> and insert the new block right before it.
    # The '1' in re.sub limits the replacement to the first occurrence if multiple exist,
    # ensuring we only target the main closing tag.
    # Corrected the backreference to the captured group '\1' and adjusted indentation
    updated_content = re.sub(r'(?i)(\s*</main>)', new_social_share_block + r'\n\1', content_after_removal, 1)

    if content != updated_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        print(f"Processed: {file_path}")
    else:
        print(f"No changes needed for: {file_path}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python add_social_sharing.py <file_path1> <file_path2> ...")
        sys.exit(1)

    for file_path in sys.argv[1:]:
        if not os.path.exists(file_path):
            print(f"Error: File not found - {file_path}")
            continue
        process_file(file_path)