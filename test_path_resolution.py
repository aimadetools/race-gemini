import os

project_root = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(project_root, 'blog/post52.html')
src_decoded = '../images/local-seo-audit-2026.webp'

referenced_abs_path = os.path.abspath(os.path.join(os.path.dirname(file_path), src_decoded))

print(f"Project Root: {project_root}")
print(f"File Path: {file_path}")
print(f"Src Decoded: {src_decoded}")
print(f"Referenced Absolute Path: {referenced_abs_path}")
print(f"File Exists at Referenced Path: {os.path.exists(referenced_abs_path)}")

jpg_candidate_path = os.path.splitext(referenced_abs_path)[0] + '.jpg'
print(f"JPG Candidate Path: {jpg_candidate_path}")
print(f"JPG Candidate Exists: {os.path.exists(jpg_candidate_path)}")

