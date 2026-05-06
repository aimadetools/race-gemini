import os
import json
from audit_h1_tags import audit_h1_tags

def run_h1_audit_on_html_files(root_dir):
    all_issues = {}
    for dirpath, _, filenames in os.walk(root_dir):
        # Skip node_modules, .vercel and venv directories
        if 'node_modules' in dirpath or '.vercel' in dirpath or 'venv' in dirpath:
            continue
        
        for filename in filenames:
            if filename.endswith(".html"):
                filepath = os.path.join(dirpath, filename)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    
                    # The audit_h1_tags function returns a JSON string, so we need to parse it
                    issues_json_str = audit_h1_tags(html_content, filepath)
                    issues_data = json.loads(issues_json_str)
                    
                    if issues_data["issues"]: # Only report if there are actual issues
                        all_issues[filepath] = issues_data
                except Exception as e:
                    all_issues[filepath] = {"error": f"Error processing file {filepath}: {e}"}
    
    return all_issues

if __name__ == "__main__":
    # Assuming the script is run from the project root
    issues_found = run_h1_audit_on_html_files(".")
    
    if issues_found:
        print(json.dumps(issues_found, indent=2))
    else:
        print("No H1 tag issues found in any HTML files.")
