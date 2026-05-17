import os
import csv
import re


def generate_sample_page(
    template_content,
    business_name,
    phone_number,
    city,
    service_type,
    ai_content,
    primary_color,
):
    """Generates a single sample page HTML content."""

    content = template_content.replace("{{businessName}}", business_name)
    content = content.replace("{{service}}", service_type)
    content = content.replace("{{town}}", city)
    content = content.replace("{{ai_content}}", ai_content)
    content = content.replace("{{primaryColor}}", primary_color)

    # Placeholder for phone number, which is only in the tel: link in the new template
    # The original template had it as [PHONE_NUMBER]
    content = content.replace("[PHONE_NUMBER]", phone_number)

    return content


def slugify(text):
    """Converts text to a URL-friendly slug."""
    text = re.sub(r"\s+", "-", text).lower()
    text = re.sub(r"[^a-z0-9-]", "", text)
    return text


def generate_for_business(business, template_content):
    """Generates 5 sample pages for a single business."""
    output_dir = "sample-pages"
    os.makedirs(output_dir, exist_ok=True)

    business_name = business["Business Name"]
    phone_number = business["Phone"]
    city = business.get("City", "Austin")
    business_slug = slugify(business_name)

    service_type = business.get(
        "Service Type", "Plumbing Services"
    )  # Get Service Type dynamically

    # Define these inside the loop so they use the current business's data
    current_ai_content = (
        f"<p>Looking for reliable {service_type} in {city}? {business_name} is your trusted local expert. "
        f"We are dedicated to providing top-quality service and ensuring customer satisfaction in {city}. "
        f"Our team at {business_name} specializes in {service_type.lower()} and is ready to help you with all your needs. "
        f"Contact us today for a free consultation or to schedule an appointment!</p>"
    )
    current_primary_color = business.get("Primary Color", "#007bff")

    generated_files = []
    for i in range(1, 6):  # Generate 5 pages per business
        file_name = os.path.join(
            output_dir,
            f"{business_slug}-{slugify(city)}-{slugify(service_type)}-page-{i}.html",
        )

        # Generate the page content
        html_content = generate_sample_page(
            template_content,
            business_name,
            phone_number,
            city,
            service_type,
            current_ai_content,
            current_primary_color,
        )

        with open(file_name, "w", encoding="utf-8") as f:
            f.write(html_content)
        print(f"Created sample page: {file_name}")
        generated_files.append(file_name)
    return generated_files


def main():
    outreach_csv_path = "outreach-targets.csv"
    template_path = "page-template.html"  # Changed to page-template.html

    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()

    businesses_to_process = []
    with open(outreach_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Status"] == "Identified":  # Only process identified businesses
                businesses_to_process.append(row)

    if not businesses_to_process:
        print("No new businesses to process.")
        return

    print(f"Generating sample pages for {len(businesses_to_process)} businesses.")

    for business in businesses_to_process:
        generate_for_business(business, template_content)


if __name__ == "__main__":
    main()
