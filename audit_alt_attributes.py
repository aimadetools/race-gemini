import argparse
import json
import os
from bs4 import BeautifulSoup
from glob import glob

def audit_alt_attributes(html_content, file_path):
    """
    Audits HTML content for <img> tags missing alt attributes or having empty alt attributes.
    Returns a list of dictionaries, each describing an issue.
    """
    issues = []
    soup = BeautifulSoup(html_content, 'html.parser')
    for img_tag in soup.find_all('img'):
        if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
            issues.append({
                "type": "Missing or Empty Alt Attribute",
                "file": file_path,
                "element": str(img_tag),
                "src": img_tag.get('src', 'N/A')
            })
    return issues

def main():
    parser = argparse.ArgumentParser(description="Audit HTML files in a given directory for missing or empty alt attributes.")
    parser.add_argument("dir_path", help="The directory containing HTML files to audit.")
    args = parser.parse_args()

    all_issues = []
    html_files = glob(os.path.join(args.dir_path, '**/*.html'), recursive=True)

    if not html_files:
        print(json.dumps({"message": f"No HTML files found in the directory: {args.dir_path}"}, indent=2))
        return

    for file_path in html_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()
            issues = audit_alt_attributes(html_content, file_path)
            if issues:
                all_issues.extend(issues)
        except Exception as e:
            all_issues.append({"error": f"Failed to process file {file_path}: {e}"})
            
    if all_issues:
        print(json.dumps(all_issues, indent=2))
    else:
        print(json.dumps({"message": "No issues found."}))

if __name__ == "__main__":
    main()
