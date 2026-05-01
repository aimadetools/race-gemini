import csv
import os
import re

def slugify(text):
    """Converts text to a URL-friendly slug."""
    text = re.sub(r'\s+', '-', text).lower()
    text = re.sub(r'[^a-z0-9-]', '', text)
    return text

def generate_outreach_emails():
    outreach_csv_path = "outreach-targets.csv"
    template_path = "outreach-email-template.md"
    output_file_path = "generated_outreach_emails.txt"

    # --- Configuration for placeholders ---
    my_name = "Founder, LocalLeads"
    # User to fill these in manually after generation
    booking_link_placeholder = "[YOUR_BOOKING_LINK_HERE]"
    my_website_placeholder = "[YOUR_WEBSITE_HERE]"
    # Base URL for sample pages (user needs to host these and provide the base URL)
    sample_pages_base_url_placeholder = "[YOUR_HOSTED_SAMPLE_PAGES_BASE_URL]" 

    if not os.path.exists(outreach_csv_path):
        print(f"Error: {outreach_csv_path} not found.")
        return

    if not os.path.exists(template_path):
        print(f"Error: {template_path} not found.")
        return

    with open(template_path, 'r', encoding='utf-8') as f:
        email_template = f.read()

    generated_emails = []

    with open(outreach_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Status"] == "Identified":
                business_name = row["Business Name"]
                city = row["City"]
                
                # Construct a more specific sample page link if possible
                # This assumes a slugified structure for sample pages like:
                # {base_url}/sample-pages/{business-slug}-{city-slug}-plumbing-services-page-1.html
                # User will need to replace sample_pages_base_url_placeholder
                business_slug = slugify(business_name)
                city_slug = slugify(city)
                # Assuming 'Plumbing Services' is the default service type for sample pages generated
                service_type_slug = slugify("Plumbing Services") 
                
                sample_page_link = f"{sample_pages_base_url_placeholder}/sample-pages/{business_slug}-{city_slug}-{service_type_slug}-page-1.html"


                personalized_email = email_template.replace("[Business Name]", business_name)
                personalized_email = personalized_email.replace("[City/Town Name]", city)
                personalized_email = personalized_email.replace("[My Name]", my_name)
                personalized_email = personalized_email.replace("[Link to sample pages]", sample_page_link)
                personalized_email = personalized_email.replace("[Booking Link]", booking_link_placeholder)
                personalized_email = personalized_email.replace("[My Website]", my_website_placeholder)
                
                generated_emails.append("--- EMAIL FOR: " + business_name + " in " + city + " ---\n" + personalized_email + "\n\n")

    if generated_emails:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.writelines(generated_emails)
        print(f"Generated {len(generated_emails)} outreach emails to {output_file_path}")
    else:
        print("No identified businesses found to generate emails for.")

if __name__ == "__main__":
    generate_outreach_emails()
