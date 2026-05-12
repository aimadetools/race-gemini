import argparse
import sys
import json
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from audits_v2.alt_attributes import audit as alt_attributes_audit
from audits_v2.h1_tags import audit as h1_tags_audit
from audits_v2.broken_links import audit as broken_links_audit
from audits_v2.google_business_profile import audit as google_business_profile_audit
from audits_v2.h2_h3_tags import audit as h2_h3_tags_audit
from audits_v2.mobile_friendliness import audit as mobile_friendliness_audit
from audits_v2.blog_posts import audit as blog_posts_audit
from audits_v2.structured_data import audit as structured_data_audit
from audits_v2.readability import audit as readability_audit
from audits_v2.page_load_times import audit as page_load_times_audit
from audits_v2.locations import audit as locations_audit

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
    broken_links_parser.add_argument('--timeout', type=int, default=10, help='Timeout for link checking in seconds')
    broken_links_parser.set_defaults(func=run_broken_links_audit)

    # H2/H3 Tags Audit
    h2_h3_parser = html_subparsers.add_parser('h2-h3-tags', help='Checks for H2 and H3 tags, their content, and hierarchical issues')
    h2_h3_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    h2_h3_parser.set_defaults(func=run_h2_h3_tags_audit)

    # Mobile Friendliness Audit
    mobile_friendliness_parser = html_subparsers.add_parser('mobile-friendliness', help='Checks the mobile-friendliness of a given URL')
    mobile_friendliness_parser.add_argument('target', help='The URL to audit')
    mobile_friendliness_parser.set_defaults(func=run_mobile_friendliness_audit)

    # Blog Posts Audit
    blog_posts_parser = html_subparsers.add_parser('blog-posts', help='Audits blog posts for SEO and readability metrics')
    blog_posts_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    blog_posts_parser.add_argument('--domain', help='Optional: The base domain of the website for internal link checking (e.g., example.com)')
    blog_posts_parser.set_defaults(func=run_blog_posts_audit)

    # Structured Data Audit
    structured_data_parser = html_subparsers.add_parser('structured-data', help='Audits for JSON-LD structured data in HTML content')
    structured_data_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    structured_data_parser.set_defaults(func=run_structured_data_audit)

    # Readability Audit
    readability_parser = html_subparsers.add_parser('readability', help='Audits text readability using metrics like Flesch-Kincaid')
    readability_parser.add_argument('target', help='Path to the HTML file or URL to audit')
    readability_parser.set_defaults(func=run_readability_audit)

    # Page Load Times Audit
    page_load_times_parser = html_subparsers.add_parser('page-load-times', help='Measures page load times for a given URL')
    page_load_times_parser.add_argument('target', help='The URL to audit')
    page_load_times_parser.add_argument('--timeout', type=int, default=10, help='Timeout for each request in seconds')
    page_load_times_parser.add_argument('--samples', type=int, default=1, help='Number of load time samples to take')
    page_load_times_parser.set_defaults(func=run_page_load_times_audit)

    # Google Business Profile Audit
    gmb_parser = subparsers.add_parser('gmb', help='Attempts to check for the presence of a Google Business Profile for a given URL via scraping. This method is not fully reliable.')
    gmb_parser.add_argument('target', help='The URL of the business website to audit')
    gmb_parser.set_defaults(func=run_google_business_profile_audit)

    # Locations Audit
    locations_parser = subparsers.add_parser('locations', help='Audits a website for mentions of specific locations')
    locations_parser.add_argument('target', help='The base URL of the website to audit')
    locations_parser.add_argument('--locations-db', required=True, help='Comma-separated list of locations to search for (e.g., "New York,Los Angeles")')
    locations_parser.add_argument('--max-depth', type=int, default=2, help='Maximum depth for crawling internal links (default: 2)')
    locations_parser.set_defaults(func=run_locations_audit)

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
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_h1_tags_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = h1_tags_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_broken_links_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = broken_links_audit(args.target, target_type=target_type, timeout=args.timeout)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_h2_h3_tags_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = h2_h3_tags_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_google_business_profile_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = google_business_profile_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_locations_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        # Parse locations_db from comma-separated string to list
        locations_db = [loc.strip() for loc in args.locations_db.split(',')]
        kwargs = {'locations_db': locations_db, 'max_depth': args.max_depth}
        results = locations_audit(args.target, target_type=target_type, **kwargs)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_mobile_friendliness_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = mobile_friendliness_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_blog_posts_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        # Pass domain if provided
        kwargs = {'domain': args.domain} if args.domain else {}
        results = blog_posts_audit(args.target, target_type=target_type, **kwargs)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_structured_data_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = structured_data_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_readability_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        results = readability_audit(args.target, target_type=target_type)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_page_load_times_audit(args):
    try:
        target_type = _determine_target_type(args.target)
        kwargs = {'timeout': args.timeout, 'samples': args.samples}
        results = page_load_times_audit(args.target, target_type=target_type, **kwargs)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

if __name__ == '__main__':
    main()
