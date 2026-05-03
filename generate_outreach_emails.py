from generate_sample_pages import generate_for_business, slugify
import csv
import os

def generate_outreach_emails():
    outreach_csv_path = "outreach-targets.csv"
    template_path = "outreach-email-template.md"
    output_file_path = "generated_outreach_emails.txt"
    page_template_path = "page-template.html"

    # --- Configuration for placeholders ---
    my_name = "Founder, LocalLeads"
    booking_link = "https://calendly.com/localleads/discovery"
    my_website = "https://localleads.dev" # I will use a placeholder, the human can replace it

    if not os.path.exists(outreach_csv_path):
        print(f"Error: {outreach_csv_path} not found.")
        return

    if not os.path.exists(template_path):
        print(f"Error: {template_path} not found.")
        return

    if not os.path.exists(page_template_path):
        print(f"Error: {page_template_path} not found.")
        return

    with open(template_path, 'r', encoding='utf-8') as f:
        email_template = f.read()

    with open(page_template_path, 'r', encoding='utf-8') as f:
        page_template_content = f.read()

    generated_emails = []

    with open(outreach_csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["Status"] == "Identified":
                business_name = row["Business Name"]
                city = row["City"]
                service_type = row.get("Service Type", "Plumbing Services")

                # Generate sample pages
                generated_files = generate_for_business(row, page_template_content)
                
                # Construct a more specific sample page link
                if generated_files:
                    first_page = os.path.basename(generated_files[0])
                    sample_page_link = f"{my_website}/sample-pages/{first_page}"
                else:
                    sample_page_link = f"[{my_website}/sample-pages/](No pages generated)"


                personalized_email = email_template.replace("[Business Name]", business_name)
                personalized_email = personalized_email.replace("[City/Town Name]", city)
                personalized_email = personalized_email.replace("[mention current city, e.g., Austin]", city)
                personalized_email = personalized_email.replace("[My Name]", my_name)
                personalized_email = personalized_email.replace("[Link to sample pages]", sample_page_link)
                personalized_email = personalized_email.replace("[Booking Link]", booking_link)
                personalized_email = personalized_email.replace("[My Website]", my_website)
                
                generated_emails.append("--- EMAIL FOR: " + business_name + " in " + city + " ---\n" + personalized_email + "\n\n")

    if generated_emails:
        with open(output_file_path, 'w', encoding='utf-8') as f:
            f.writelines(generated_emails)
        print(f"Generated {len(generated_emails)} outreach emails to {output_file_path}")
    else:
        print("No identified businesses found to generate emails for.")

if __name__ == "__main__":
    generate_outreach_emails()
