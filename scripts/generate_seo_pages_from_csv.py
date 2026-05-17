import csv
import requests
import json
import time
import os

# Configuration
API_ENDPOINT = "http://localhost:3000/api/generate-seo-pages"
INPUT_CSV_PATH = "outreach-targets.csv"
OUTPUT_DIR = "generated-seo-pages"  # This is where the API will save the files
DEFAULT_AI_STYLE = "professional"
DEFAULT_PRIMARY_COLOR = "#007bff"
ENABLE_AI_COPY = (
    False  # Set to True if GEMINI_API_KEY is available in the Vercel environment
)


def main():
    if not os.path.exists(OUTPUT_DIR):
        print(f"Output directory '{OUTPUT_DIR}' does not exist. Creating it...")
        os.makedirs(OUTPUT_DIR)

    generated_count = 0
    skipped_count = 0
    total_prospects = 0

    try:
        with open(INPUT_CSV_PATH, mode="r", encoding="utf-8") as infile:
            # Filter out comment lines and empty lines
            filtered_lines = (
                line
                for line in infile
                if not line.strip().startswith("#") and line.strip()
            )
            reader = csv.DictReader(filtered_lines)

            for i, row in enumerate(reader):
                total_prospects += 1
                business_name = row.get("Business Name", "").strip()
                city = row.get("City", "").strip()
                service_type = row.get("Service Type", "").strip()

                if not business_name or not city or not service_type:
                    print(
                        f"Skipping row {i+1}: Missing Business Name, City, or Service Type. (Business: '{business_name}', City: '{city}', Service: '{service_type}')"
                    )
                    skipped_count += 1
                    continue

                payload = {
                    "businessName": business_name,
                    "services": [service_type],
                    "towns": [city],
                    "enableAICopy": ENABLE_AI_COPY,
                    "aiStyle": DEFAULT_AI_STYLE,
                    "primaryColor": DEFAULT_PRIMARY_COLOR,
                }

                headers = {"Content-Type": "application/json"}

                try:
                    print(
                        f"Generating page for: {business_name}, {service_type} in {city}..."
                    )
                    response = requests.post(
                        API_ENDPOINT, headers=headers, data=json.dumps(payload)
                    )
                    response.raise_for_status()  # Raise an exception for HTTP errors (4xx or 5xx)

                    result = response.json()
                    if result.get(
                        "message"
                    ) == "SEO pages generated successfully!" and result.get("pages"):
                        generated_count += len(result["pages"])
                        for page in result["pages"]:
                            print(f"  Generated: {page['fileName']} at {page['path']}")
                    else:
                        print(
                            f"  Failed to generate page for {business_name} in {city}: {result.get('message', 'Unknown error')}"
                        )
                        skipped_count += 1

                except requests.exceptions.RequestException as e:
                    print(
                        f"  Error making API request for {business_name} in {city}: {e}"
                    )
                    skipped_count += 1
                except json.JSONDecodeError as e:
                    print(
                        f"  Error decoding JSON response for {business_name} in {city}: {e}. Response: {response.text}"
                    )
                    skipped_count += 1

                time.sleep(0.5)  # Be polite to the local server

    except FileNotFoundError:
        print(f"Error: Input CSV file not found at {INPUT_CSV_PATH}")
        return
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    print(f"\n--- Generation Summary ---")
    print(f"Total prospects in CSV: {total_prospects}")
    print(f"Pages successfully generated: {generated_count}")
    print(f"Prospects skipped or failed to generate pages: {skipped_count}")
    print(f"Generated pages are saved in the '{OUTPUT_DIR}' directory.")


if __name__ == "__main__":
    main()
