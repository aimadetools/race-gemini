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
from audits_v2.robots_txt import audit as robots_txt_audit
from audits_v2.canonical_tags import audit as canonical_tags_audit
from audits_v2.sitemap_xml import audit as sitemap_xml_audit
from audits_v2.schema_markup import audit as schema_markup_audit
from audits_v2.meta_tags import audit as meta_tags_audit
from audits_v2.header_response_codes import audit as header_response_codes_audit

def _determine_target_type(target):
    if target.startswith('http://') or target.startswith('https://'):
        return 'url'
    elif os.path.exists(target):
        return 'file_path'
    else:
        raise ValueError(f"Invalid target: {target}. Must be a valid URL or file path.")





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

def run_robots_txt_audit(args):
    try:
        results = robots_txt_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_canonical_tags_audit(args):
    try:
        results = canonical_tags_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_sitemap_xml_audit(args):
    try:
        results = sitemap_xml_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_schema_markup_audit(args):
    try:
        results = schema_markup_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_meta_tags_audit(args):
    try:
        results = meta_tags_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def run_header_response_codes_audit(args):
    try:
        results = header_response_codes_audit(args.target)
        print(json.dumps(results, indent=2))
    except Exception as e:
        print(json.dumps({"error": f"An unexpected error occurred: {str(e)}"}, indent=2))
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Run various SEO audits.")
    subparsers = parser.add_subparsers(dest='audit_type', help='Available audit commands')

    # locations audit parser
    locations_parser = subparsers.add_parser('locations', help='Audit website for specific location mentions.')
    locations_parser.add_argument('target', type=str, help='The URL to audit.')
    locations_parser.add_argument('--locations-db', type=str, required=True, help='Comma-separated list of locations to search for.')
    locations_parser.add_argument('--max-depth', type=int, default=2, help='Maximum depth for crawling internal links.')
    locations_parser.set_defaults(func=run_locations_audit)

    # blog-posts audit parser (if needed, currently not called by api/audit.js directly in auditPromises)
    blog_posts_parser = subparsers.add_parser('blog-posts', help='Audit blog posts for certain criteria.')
    blog_posts_parser.add_argument('target', type=str, help='The URL to audit.')
    blog_posts_parser.add_argument('--domain', type=str, help='The domain of the website to restrict blog post checks.')
    blog_posts_parser.set_defaults(func=run_blog_posts_audit)

    # Example for other HTML audits (many share similar args)
    html_parser = subparsers.add_parser('html', help='Run HTML-related audits.')
    html_subparsers = html_parser.add_subparsers(dest='html_audit_type', help='Specific HTML audit commands')

    alt_attributes_parser = html_subparsers.add_parser('alt-attributes', help='Audit image alt attributes.')
    alt_attributes_parser.add_argument('target', type=str, help='The URL to audit.')
    alt_attributes_parser.set_defaults(func=run_alt_attributes_audit)

    # broken_links audit parser
    broken_links_parser = html_subparsers.add_parser('broken-links', help='Audit for broken links.')
    broken_links_parser.add_argument('target', type=str, help='The URL to audit.')
    broken_links_parser.add_argument('--timeout', type=int, default=10, help='Timeout for link checks in seconds.')
    broken_links_parser.set_defaults(func=run_broken_links_audit)

    # h1_tags audit parser
    h1_tags_parser = html_subparsers.add_parser('h1-tags', help='Audit H1 tags.')
    h1_tags_parser.add_argument('target', type=str, help='The URL to audit.')
    h1_tags_parser.set_defaults(func=run_h1_tags_audit)

    # h2_h3_tags audit parser
    h2_h3_tags_parser = html_subparsers.add_parser('h2-h3-tags', help='Audit H2/H3 tags.')
    h2_h3_tags_parser.add_argument('target', type=str, help='The URL to audit.')
    h2_h3_tags_parser.set_defaults(func=run_h2_h3_tags_audit)

    # mobile_friendliness audit parser
    mobile_friendliness_parser = html_subparsers.add_parser('mobile-friendliness', help='Audit mobile-friendliness.')
    mobile_friendliness_parser.add_argument('target', type=str, help='The URL to audit.')
    mobile_friendliness_parser.set_defaults(func=run_mobile_friendliness_audit)

    # structured_data audit parser
    structured_data_parser = html_subparsers.add_parser('structured-data', help='Audit structured data.')
    structured_data_parser.add_argument('target', type=str, help='The URL to audit.')
    structured_data_parser.set_defaults(func=run_structured_data_audit)
    
    # readability audit parser
    readability_parser = html_subparsers.add_parser('readability', help='Audit readability.')
    readability_parser.add_argument('target', type=str, help='The URL to audit.')
    readability_parser.set_defaults(func=run_readability_audit)

    # page_load_times audit parser
    page_load_times_parser = html_subparsers.add_parser('page-load-times', help='Audit page load times.')
    page_load_times_parser.add_argument('target', type=str, help='The URL to audit.')
    page_load_times_parser.add_argument('--timeout', type=int, default=30, help='Timeout for page load check in seconds.')
    page_load_times_parser.add_argument('--samples', type=int, default=1, help='Number of samples to take for page load time.')
    page_load_times_parser.set_defaults(func=run_page_load_times_audit)
    
    # canonical_tags audit parser
    canonical_tags_parser = html_subparsers.add_parser('canonical-tags', help='Audit canonical tags.')
    canonical_tags_parser.add_argument('target', type=str, help='The URL to audit.')
    canonical_tags_parser.set_defaults(func=run_canonical_tags_audit)

    # schema_markup audit parser
    schema_markup_parser = html_subparsers.add_parser('schema-markup', help='Audit schema markup.')
    schema_markup_parser.add_argument('target', type=str, help='The URL to audit.')
    schema_markup_parser.set_defaults(func=run_schema_markup_audit)

    # meta_tags audit parser
    meta_tags_parser = html_subparsers.add_parser('meta-tags', help='Audit meta tags.')
    meta_tags_parser.add_argument('target', type=str, help='The URL to audit.')
    meta_tags_parser.set_defaults(func=run_meta_tags_audit)


    # http audit parser
    http_parser = subparsers.add_parser('http', help='Run HTTP-related audits.')
    http_subparsers = http_parser.add_subparsers(dest='http_audit_type', help='Specific HTTP audit commands')

    header_response_codes_parser = http_subparsers.add_parser('header-response-codes', help='Audit header response codes.')
    header_response_codes_parser.add_argument('target', type=str, help='The URL to audit.')
    header_response_codes_parser.set_defaults(func=run_header_response_codes_audit)

    # robots audit parser
    robots_parser = subparsers.add_parser('robots', help='Run robots.txt audits.')
    robots_parser.add_argument('target', type=str, help='The URL to audit.')
    robots_parser.set_defaults(func=run_robots_txt_audit)

    # xml audit parser
    xml_parser = subparsers.add_parser('xml', help='Run XML-related audits.')
    xml_subparsers = xml_parser.add_subparsers(dest='xml_audit_type', help='Specific XML audit commands')

    sitemap_xml_parser = xml_subparsers.add_parser('sitemap-xml', help='Audit sitemap.xml.')
    sitemap_xml_parser.add_argument('target', type=str, help='The URL to audit.')
    sitemap_xml_parser.set_defaults(func=run_sitemap_xml_audit)

    args = parser.parse_args()

    if hasattr(args, 'func'):
        if args.audit_type == 'html' and hasattr(args, 'html_audit_type') and args.html_audit_type:
            args.func(args)
        elif args.audit_type == 'http' and hasattr(args, 'http_audit_type') and args.http_audit_type:
            args.func(args)
        elif args.audit_type == 'xml' and hasattr(args, 'xml_audit_type') and args.xml_audit_type:
            args.func(args)
        else:
            args.func(args)
    else:
        parser.print_help()

if __name__ == '__main__':
    main()
