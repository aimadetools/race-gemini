import argparse
import sys
import json
import os
from audits_v2.alt_attributes import audit as alt_attributes_audit
from audits_v2.h1_tags import audit as h1_tags_audit

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
    # Determine target type
    if args.target.startswith('http://') or args.target.startswith('https://'):
        target_type = 'url'
    elif os.path.exists(args.target):
        target_type = 'file_path'
    else:
        print(json.dumps({"error": f"Invalid target: {args.target}. Must be a valid URL or file path."}, indent=2))
        sys.exit(1)

    results = alt_attributes_audit(args.target, target_type=target_type)
    print(json.dumps(results, indent=2))

def run_h1_tags_audit(args):
    # Determine target type
    if args.target.startswith('http://') or args.target.startswith('https://'):
        target_type = 'url'
    elif os.path.exists(args.target):
        target_type = 'file_path'
    else:
        print(json.dumps({"error": f"Invalid target: {args.target}. Must be a valid URL or file path."}, indent=2))
        sys.exit(1)

    results = h1_tags_audit(args.target, target_type=target_type)
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
