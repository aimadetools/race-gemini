import os
import csv
import re

def generate_sample_page(template_content, business_name, phone_number, city, page_number):
    """Generates a single sample page HTML content."""
    # Create a unique title for each page, varying content slightly
    page_title = f"{business_name} - {city} Plumber Services - Page {page_number}"
    
    # Replace placeholders in the template
    content = template_content.replace("[BUSINESS_NAME]", business_name)
    content = content.replace("[PHONE_NUMBER]", phone_number)
    content = content.replace("[CITY]", city)
    
    # Add unique content per page number if needed, for now just a small variation
    unique_service_message = f"Offering comprehensive plumbing solutions in {city}, {business_name} is dedicated to serving you. This is page {page_number} of our specialized local content."
    content = content.replace("Welcome to [BUSINESS_NAME], your reliable and affordable plumbing solution in the [CITY] area. We are a locally owned and operated business dedicated to providing top-quality plumbing services to our community. Whether you have a leaky faucet, a clogged drain, or need a new water heater, our team of licensed and insured plumbers is here to help.", unique_service_message)
    content = content.replace(f"{business_name} - Your Trusted Plumber in {city}", page_title)
    
    return content

def slugify(text):
    """Converts text to a URL-friendly slug."""
    text = re.sub(r'\s+', '-', text).lower()
    text = re.sub(r'[^a-z0-9-]', '', text)
    return text

def main():
    outreach_csv_path = "outreach-targets.csv"
    template_path = "sample-page-template.html"
    output_dir = "sample-pages"
    
    os.makedirs(output_dir, exist_ok=True)
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
        
    businesses_to_process = []
    with open(outreach_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            # Skip the first two businesses as they were already processed
            if i < 2: 
                continue
            businesses_to_process.append(row)
            # Process only the next two businesses
            if len(businesses_to_process) >= 2:
                break
                
    if not businesses_to_process:
        print("No new businesses to process.")
        return

    print(f"Generating sample pages for: {[b['Business Name'] for b in businesses_to_process]}")
    
    for business in businesses_to_process:
        business_name = business["Business Name"]
        phone_number = business["Phone"]
        # Default to Austin if city is not in CSV, or can be derived from phone number area code
        city = "Austin" # Assuming Austin for 512 area code for now
        business_slug = slugify(business_name)
        
        for i in range(1, 11): # Generate 10 pages per business
            file_name = os.path.join(output_dir, f"{business_slug}-{slugify(city)}-page-{i}.html")
            
            # Simple content variation for demonstration; can be expanded
            current_template_content = template_content
            
            # Generate the page content
            html_content = generate_sample_page(current_template_content, business_name, phone_number, city, i)
            
            with open(file_name, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"Created sample page: {file_name}")

if __name__ == "__main__":
    main()
