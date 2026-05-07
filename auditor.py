
import argparse
import json
import os
import sys
from glob import glob
import requests

from audits.alt_attributes import audit as audit_alt_attributes
from audits.h1_tags import audit as audit_h1_tags
from audits.broken_links import audit as audit_broken_links


AUDIT_FUNCTIONS = {
    "alt_attributes": audit_alt_attributes,
    "h1_tags": audit_h1_tags,
    "broken_links": audit_broken_links,
}

def run_audits(audits_to_run, target):
    """
    Runs the specified audits on the given target (directory or URL).
    """
    all_results = {}

    for audit_name in audits_to_run:
        if audit_name not in AUDIT_FUNCTIONS:
            print(f"Unknown audit: {audit_name}", file=sys.stderr)
            continue

        audit_function = AUDIT_FUNCTIONS[audit_name]
        audit_results = []

        if os.path.isdir(target):
            for filepath in glob(os.path.join(target, '**', '*.html'), recursive=True):
                try:
                    if audit_name == "broken_links":
                        audit_results.extend(audit_function(filepath))
                    else:
                        with open(filepath, 'r', encoding='utf-8') as f:
                            html_content = f.read()
                        audit_results.extend(audit_function(html_content, filepath))
                except Exception as e:
                    audit_results.append({"error": f"Could not process file {filepath}: {e}"})
        elif target.startswith('http'):
            try:
                if audit_name == "broken_links":
                    audit_results.extend(audit_function(target))
                else:
                    response = requests.get(target, timeout=10)
                    response.raise_for_status()
                    html_content = response.text
                    audit_results.extend(audit_function(html_content, target))
            except requests.exceptions.RequestException as e:
                audit_results.append({"error": f"Failed to fetch URL: {e}"})
        else: # It's a single file
             try:
                if audit_name == "broken_links":
                    audit_results.extend(audit_function(target))
                else:
                    with open(target, 'r', encoding='utf-8') as f:
                        html_content = f.read()
                    audit_results.extend(audit_function(html_content, target))
             except Exception as e:
                audit_results.append({"error": f"Could not process file {target}: {e}"})


        all_results[audit_name] = audit_results

    return all_results

def main():
    """
    Main function to run the audits.
    """
    parser = argparse.ArgumentParser(description='Run SEO audits on a directory of HTML files or a URL.')
    parser.add_argument('target', help='Directory of HTML files or URL to audit.')
    parser.add_argument('--audits', nargs='+', choices=AUDIT_FUNCTIONS.keys(),
                        default=list(AUDIT_FUNCTIONS.keys()),
                        help='Which audits to run.')
    args = parser.parse_args()

    results = run_audits(args.audits, args.target)
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
