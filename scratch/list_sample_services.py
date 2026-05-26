import os
import re

def main():
    sample_pages_dir = "sample-pages"
    if not os.path.exists(sample_pages_dir):
        print(f"Error: {sample_pages_dir} not found.")
        return

    files = os.listdir(sample_pages_dir)
    print(f"Total files: {len(files)}")

    cities = set()
    services = set()

    # Typical filename format:
    # {business_slug}-{city_slug}-{service_slug}-page-{i}.html
    # or {business_slug}-{city_slug}-page-{i}.html
    for f in files:
        if not f.endswith(".html"):
            continue
        
        # Strip extension and page number
        name = f.replace(".html", "")
        name = re.sub(r"-page-\d+", "", name)
        
        # Let's inspect some known cities to extract services
        known_cities = {"austin", "dallas", "denton", "houston", "miami", "phoenix", "los-angeles", "new-york", "san-diego", "san-francisco", "chicago", "san-antonio"}
        
        found_city = None
        for c in known_cities:
            if f"-{c}-" in f or f"-{c}.html" in f:
                found_city = c
                cities.add(c)
                break
        
        if found_city:
            # Everything after the city name (excluding -page-X) is the service type
            parts = name.split(f"-{found_city}-")
            if len(parts) > 1:
                service = parts[1]
                services.add(service)

    print("Unique cities found in filenames:", sorted(cities))
    print("Unique services found in filenames:", sorted(services))

    # Let's print 50 random filenames
    print("\nSample of 50 filenames:")
    for f in sorted(files)[:50]:
        print(" -", f)

if __name__ == "__main__":
    main()
