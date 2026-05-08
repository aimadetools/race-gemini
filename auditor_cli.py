import argparse
import sys
import json
import os
from audits_v2.alt_attributes import audit as alt_attributes_audit
from audits_v2.h1_tags import audit as h1_tags_audit
from audits_v2.broken_links import audit as broken_links_audit
from audits_v2.google_business_profile import audit as google_business_profile_audit
from audits_v2.h2_h3_tags import audit as h2_h3_tags_audit

def _determine_target_type(target):
    if target.startswith('http://') or target.startswith('https://'):
        return 'url'
    elif os.path.exists(target):
        return 'file_path'
    else:
        raise ValueError(f"Invalid target: {target}. Must be a valid URL or file path.")

def main():
    parser = argparse.ArgumentParser(
        description="Consolidated SEO Audit Tool",
        epilog="Use 'auditor_cli.py <command> --help' for more information on a specific command."
    )

    subparsers = parser.add_subparsers(dest='command', help='Available audit commands')

    # --- HTML Audit Subparser ---
    html_parser = subparsers.add_parser('html', help='Audits based on HTML content')
    html_subparsers = html_parser.add_subparsers(dest='audit_type', help='Specific HTML audits')

    # Alt Attributes Audit
    alt_parser = html_subparsers.add_parser('alt-attributes', help='Checks for missing or empty alt attributes in <img> tags')
    alt_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    alt_parser.set_defaults(func=run_alt_attributes_audit)

    # H1 Tags Audit
    h1_parser = html_subparsers.add_parser('h1-tags', help='Checks for the presence and count of H1 tags')
    h1_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    h1_parser.set_defaults(func=run_h1_tags_audit)

    # Broken Links Audit
    broken_links_parser = html_subparsers.add_parser('broken-links', help='Checks for broken external links')
    broken_links_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    broken_links_parser.set_defaults(func=run_broken_links_audit)

    # H2/H3 Tags Audit
    h2_h3_parser = html_subparsers.add_parser('h2-h3-tags', help='Checks for H2 and H3 tags, their content, and hierarchical issues')
    h2_h3_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    h2_h3_parser.set_defaults(func=run_h2_h3_tags_audit)

    # Google Business Profile Audit
    gmb_parser = subparsers.add_parser('gmb', help='Checks for the presence of a Google Business Profile for a given URL')
    gmb_parser.add_argument('target', help='The URL of the business website to audit')
    gmb_parser.set_defaults(func=run_google_business_profile_audit)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if hasattr(args, 'func'):
        args.func(args)
    else:
        # If a subparser was chosen but no specific audit_type was selected (e.g., just 'html')
        parser.print_help()
        sys.exit(1)

def run_alt_attributes_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = alt_attributes_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except ValueError as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)

def run_h1_tags_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = h1_tags_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except ValueError as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)

def run_broken_links_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = broken_links_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except ValueError as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)

def run_h2_h3_tags_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = h2_h3_tags_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except ValueError as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)

def run_google_business_profile_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        if target_type != 'url':
            raise ValueError("Google Business Profile audit only supports URLs as targets.")
        results = google_business_profile_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except ValueError as e:
        print(json.dumps({"error": str(e)}, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
