import argparse
import json
import perfometrics.curl as pcurl

def main():
    parser = argparse.ArgumentParser(description="Audit page load times for a given URL.")
    parser.add_argument("url", help="The URL to audit.")
    args = parser.parse_args()

    try:
        metrics = pcurl.CurlUptime(args.url).get_metrics()
        
        if metrics:
            result = {
                "url": args.url,
                "metrics": {
                    "ttfb": metrics.get('ttfb', 'N/A'),
                    "total_time": metrics.get('total', 'N/A')
                }
            }
            print(json.dumps(result, indent=2))
        else:
            print(json.dumps({"error": f"No metrics returned for URL: {args.url}"}, indent=2))

    except Exception as e:
        print(json.dumps({"error": f"An error occurred while auditing {args.url}: {e}"}, indent=2))

if __name__ == "__main__":
    main()

