import os
import csv
import re

def generate_sample_page(template_content, business_name, phone_number, city, service_type, ai_content, primary_color, agency_logo):
    """Generates a single sample page HTML content."""
    
    content = template_content.replace("{{businessName}}", business_name)
    content = content.replace("{{service}}", service_type)
    content = content.replace("{{town}}", city)
    content = content.replace("{{ai_content}}", ai_content)
    content = content.replace("{{primaryColor}}", primary_color)
    content = content.replace("{{agencyLogo}}", agency_logo)

    # Placeholder for phone number, which is only in the tel: link in the new template
    # The original template had it as [PHONE_NUMBER]
    content = content.replace("[PHONE_NUMBER]", phone_number) 
    
    return content

def slugify(text):
    """Converts text to a URL-friendly slug."""
    text = re.sub(r'\s+', '-', text).lower()
    text = re.sub(r'[^a-z0-9-]', '', text)
    return text

def main():
    outreach_csv_path = "outreach-targets.csv"
    template_path = "page-template.html" # Changed to page-template.html
    output_dir = "sample-pages"
    
    os.makedirs(output_dir, exist_ok=True)
    
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()
        
    businesses_to_process = []
    with open(outreach_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Status"] == "Identified": # Only process identified businesses
                businesses_to_process.append(row)
                
    if not businesses_to_process:
        print("No new businesses to process.")
        return

    print(f"Generating sample pages for {len(businesses_to_process)} businesses.")
    
    for business in businesses_to_process:
        business_name = business["Business Name"]
        phone_number = business["Phone"]
        city = business.get("City", "Austin") 
        business_slug = slugify(business_name)

        # Define these inside the loop so they use the current business's data
        current_service_type = "Plumbing Services"
        current_ai_content = f"<p>Looking for reliable {current_service_type} in {city}? {business_name} is your trusted local expert. We are dedicated to providing top-quality service and ensuring customer satisfaction in {city}. Contact us today for all your {current_service_type.lower()} needs!</p>"
        current_primary_color = "#007bff"
        current_agency_logo = f"<span>{business_name}</span>"
        
        for i in range(1, 6): # Generate 5 pages per business
            file_name = os.path.join(output_dir, f"{business_slug}-{slugify(city)}-{slugify(current_service_type)}-page-{i}.html")
            
            # Generate the page content
            html_content = generate_sample_page(template_content, business_name, phone_number, city, current_service_type, current_ai_content, current_primary_color, current_agency_logo)
            
            with open(file_name, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"Created sample page: {file_name}")

if __name__ == "__main__":
    main()
