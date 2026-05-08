import csv
import os

def generate_email_content(template, business_name, city, sample_pages_link, booking_link, my_name, my_website):
    """
    Generates an email content from a template and provided data.
    """
    email_body = template.replace("[Business Name]", business_name)
    email_body = email_body.replace("[City/Town Name]", city)
    email_body = email_body.replace("[Link to sample pages]", sample_pages_link)
    email_body = email_body.replace("[Booking Link]", booking_link)
    email_body = email_body.replace("[My Name]", my_name)
    email_body = email_body.replace("[My Website]", my_website)
    return email_body

def main():
    input_csv_path = 'outreach-targets.csv'
    template_path = 'outreach-email-template.md'
    output_txt_path = 'generated_outreach_emails.txt'

    # Static values for placeholders - These need to be confirmed by human
    MY_NAME = "The LocalLeads Team"
    SAMPLE_PAGES_LINK = "https://www.localseogen.com/sample-pages" 
    BOOKING_LINK = "https://calendly.com/localleads/discovery-call"
    MY_WEBSITE = "localseogen.com"

    try:
        with open(template_path, 'r', encoding='utf-8') as f:
            email_template = f.read()
    except FileNotFoundError:
        print(f"Error: Email template not found at {template_path}")
        return

    generated_emails = []
    skipped_count = 0
    total_prospects = 0

    with open(input_csv_path, mode='r', encoding='utf-8') as infile:
        # Filter out comment lines and empty lines
        filtered_lines = (line for line in infile if not line.strip().startswith('#') and line.strip())
        
        reader = csv.DictReader(filtered_lines)
        
        for i, row in enumerate(reader):
            total_prospects += 1
            business_name = row.get('Business Name', '').strip()
            website = row.get('Website', '').strip()
            email = row.get('Email', '').strip()
            city = row.get('City', '').strip()

            if not email:
                print(f"Skipping {business_name} (row {i+1}): No email address provided.")
                skipped_count += 1
                continue
            
            if not website:
                print(f"Skipping {business_name} (row {i+1}): No website provided.")
                skipped_count += 1
                continue
            
            if not city:
                print(f"Skipping {business_name} (row {i+1}): No city provided.")
                skipped_count += 1
                continue

            # Assuming the Subject is the first line of the template
            subject_line = email_template.split('\n', 1)[0]
            subject = generate_email_content(subject_line, business_name, city, SAMPLE_PAGES_LINK, BOOKING_LINK, MY_NAME, MY_WEBSITE).replace("Subject: ", "")
            
            body = generate_email_content(email_template.split('\n', 1)[1], business_name, city, SAMPLE_PAGES_LINK, BOOKING_LINK, MY_NAME, MY_WEBSITE)

            generated_emails.append((
                f"To: {email}\n"
                f"Subject: {subject}\n\n"
                f"{body}\n"
                f"{'='*80}\n\n"
            ))

    if generated_emails:
        with open(output_txt_path, 'w', encoding='utf-8') as outfile:
            outfile.writelines(generated_emails)
        print(f"\nSuccessfully generated {len(generated_emails)} emails to {output_txt_path}")
    else:
        print("\nNo emails were generated.")

    print(f"Total prospects in CSV: {total_prospects}")
    print(f"Emails skipped: {skipped_count}")

if __name__ == '__main__':
    main()
