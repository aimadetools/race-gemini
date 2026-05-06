import os
import json
from audit_alt_attributes import audit_alt_attributes

def run_audit_on_html_files(root_dir):
    all_issues = {}
    for dirpath, _, filenames in os.walk(root_dir):
        # Skip node_modules and .vercel directories
        if 'node_modules' in dirpath or '.vercel' in dirpath:
            continue
        
        for filename in filenames:
            if filename.endswith(".html"):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    
                    issues = audit_alt_attributes(html_content, filepath)
                    
                    if issues:
                        all_issues[filepath] = issues
                except Exception as e:
                    all_issues[filepath] = {"error": f"Error processing file {filepath}: {e}"}
    
    return all_issues

if __name__ == "__main__":
    # Assuming the script is run from the project root
    issues_found = run_audit_on_html_files(".")
    
    if issues_found:
        print(json.dumps(issues_found, indent=2))
    else:
        print("No missing or empty alt attributes found in any HTML files.")
