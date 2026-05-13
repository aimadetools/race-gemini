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

if __name__ == '__main__':
    main()
