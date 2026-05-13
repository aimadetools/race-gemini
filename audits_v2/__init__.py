import sys
import os

# Add the project root to sys.path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

# Add the virtual environment's site-packages to sys.path
venv_site_packages = os.path.join(project_root, '.venv', 'lib', 'python3.12', 'site-packages')
if os.path.exists(venv_site_packages) and venv_site_packages not in sys.path:
    sys.path.insert(0, venv_site_packages)
