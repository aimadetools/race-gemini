import os
import json
from audit_h2_h3_tags import audit_h2_h3_tags

def run_h2_h3_audit_on_html_files(root_dir):
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
                    
                    issues_json_str = audit_h2_h3_tags(html_content, filepath)
                    issues_data = json.loads(issues_json_str)
                    
                    if issues_data["issues"]:
                        all_issues[filepath] = issues_data
                except Exception as e:
                    all_issues[filepath] = {"error": f"Error processing file {filepath}: {e}"}
    
    return all_issues

if __name__ == "__main__":
    issues_found = run_h2_h3_audit_on_html_files(".")
    
    if issues_found:
        print(json.dumps(issues_found, indent=2))
    else:
        print("No H2/H3 tag issues found in any HTML files.")
