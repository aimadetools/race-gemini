import os
import re
from bs4 import BeautifulSoup

def audit_alt_attributes(html_file_path):
    """
    Audits an HTML file for <img> tags missing alt attributes or having empty alt attributes.
    Returns a list of issues found in the file.
    """
    issues = []
    try:
        with open(html_file_path, 'r', encoding='utf-8') as f:
            soup = BeautifulSoup(f, 'html.parser')
            for img_tag in soup.find_all('img'):
                if not img_tag.has_attr('alt') or not img_tag['alt'].strip():
                    issues.append(f"  - Missing or empty alt attribute: <img src='{img_tag.get('src', 'N/A')}'>")
    except Exception as e:
        issues.append(f"  - Error processing file: {e}")
    return issues

def main():
    project_root = os.getcwd()
    all_issues = {}

    print("Starting audit for missing or empty alt attributes in HTML files...")

    for root, _, files in os.walk(project_root):
        for file in files:
            if file.endswith(".html"):
                html_file_path = os.path.join(root, file)
                relative_path = os.path.relpath(html_file_path, project_root)
                
                # Exclude files in node_modules and venv directories
                if "node_modules" in relative_path or "venv" in relative_path:
                    continue

                issues_in_file = audit_alt_attributes(html_file_path)
                if issues_in_file:
                    all_issues[relative_path] = issues_in_file

    if all_issues:
        print("\n--- Audit Results ---")
        for file_path, issues in all_issues.items():
            print(f"File: {file_path}")
            for issue in issues:
                print(issue)
        print("\nAudit completed with issues found.")
    else:
        print("\nAudit completed. No missing or empty alt attributes found in any HTML files.")

if __name__ == "__main__":
    main()
