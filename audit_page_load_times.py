import perfometrics.curl as pcurl

urls_to_audit = [
    "https://race-gemini.vercel.app/index.html",
    "https://race-gemini.vercel.app/blog.html",
    "https://race-gemini.vercel.app/generate.html",
    "https://race-gemini.vercel.app/pricing.html",
]

print("Auditing page load times using perfometrics:")

for url in urls_to_audit:
    print(f"\n--- Auditing: {url} ---")
    try:
        metrics = pcurl.CurlUptime(url).get_metrics()
        if metrics:
            print(f"  Time to First Byte (TTFB): {metrics.get('ttfb', 'N/A')}s")
            print(f"  Total Time: {metrics.get('total', 'N/A')}s")

        else:
            print("  No metrics returned.")
    except Exception as e:
        print(f"  An error occurred: {e}")

