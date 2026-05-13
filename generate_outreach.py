import json
import uuid
import re
import csv
import markdown # Add this line

# Define file paths
OUTREACH_TARGETS_CSV = 'outreach-targets.csv'
OUTREACH_EMAIL_TEMPLATE_MD = 'outreach-email-template.md'
GENERATED_OUTREACH_EMAILS_TXT = 'generated_outreach_emails.txt'

def slugify(text):
    """Converts text to a URL-friendly slug."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace(' ', '-')
    text = ''.join(e for e in text if e.isalnum() or e == '-')
    return text

def generate_emails_txt_file():
    emails_to_send = []

    # Read email template
    with open(OUTREACH_EMAIL_TEMPLATE_MD, 'r') as f:
        email_template = f.read()

    # Read outreach targets
    with open(OUTREACH_TARGETS_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Email') and row['Email'].strip():
                business_name = row['Business Name'].strip()
                city = row['City'].strip()
                service_type = row['Service Type'].strip()
                recipient_email = row['Email'].strip()

                # Construct personalized link
                base_url = "https://www.localseogen.com/generated-seo-pages/"
                service_slug = slugify(service_type)
                business_slug = slugify(business_name)
                city_slug = slugify(city)
                
                sample_page_link = f"{base_url}{service_slug}-in-{city_slug}-{business_slug}.html"

                # Fill template placeholders
                subject_line = email_template.split('\n')[0].replace('Subject: ', '')
                subject_line = subject_line.replace('[Business Name]', business_name)
                subject_line = subject_line.replace('[City/Town Name]', city)
                subject_line = subject_line.replace('[Service Type]', service_type)
                
                body_content = email_template.replace(email_template.split('\n')[0] + '\n\n', '') # Remove subject line
                body_content = body_content.replace('[Business Name]', business_name)
                body_content = body_content.replace('[City/Town Name]', city)
                body_content = body_content.replace('[Link to sample pages]', sample_page_link)
                body_content = body_content.replace('[Service Type]', service_type)

                full_email_block = f"""--- EMAIL FOR: {business_name}
To: {recipient_email}
Subject: {subject_line}

{body_content}
"""
                emails_to_send.append(full_email_block)

    # Write generated emails to file
    with open(GENERATED_OUTREACH_EMAILS_TXT, 'w') as f:
        for email_block in emails_to_send:
            f.write(email_block)

    print(f"Generated {len(emails_to_send)} emails in {GENERATED_OUTREACH_EMAILS_TXT}")

def parse_emails_to_json(file_path):
    parsed_emails = []
    try:
        with open(file_path, 'r') as f:
            content = f.read()
            email_blocks = re.split(r'--- EMAIL FOR:.*?\n', content)[1:] # Split by '--- EMAIL FOR:' and skip the first empty part

            for block in email_blocks:
                to_match = re.search(r'To: (.*)\n', block)
                subject_match = re.search(r'Subject: (.*)\n', block)
                
                if to_match and subject_match:
                    to_email = to_match.group(1).strip()
                    subject = subject_match.group(1).strip()
                    
                    # Extract body: everything after the subject line and a newline
                    body_start = block.find(subject_match.group(0)) + len(subject_match.group(0))
                    body = block[body_start:].strip()

                    # Convert markdown body to HTML
                    html_body = markdown.markdown(body)

                    message_id = str(uuid.uuid4()) # Generate a unique ID for the email
                    tracking_pixel = f'<img src="https://www.localseogen.com/api/track-email-open?id={message_id}" width="1" height="1" border="0" style="display:none;" />'
                    body_with_tracking = html_body + tracking_pixel # Append the pixel to the HTML body

                    parsed_emails.append({
                        "to": to_email,
                        "subject": subject,
                        "html": body_with_tracking,
                        "message_id": message_id # Include message_id in the JSON for logging/tracking purposes
                    })
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
    except Exception as e:
        print(f"Error parsing emails: {e}")
    return parsed_emails

if __name__ == "__main__":
    generate_emails_txt_file() # Ensure the .txt file is up to date

    emails_json = parse_emails_to_json(GENERATED_OUTREACH_EMAILS_TXT)

    if emails_json:
        # The URL for the serverless function
        api_url = "https://www.localseogen.com/api/execute-outreach"
        
        # Clear the shell script file
        with open("execute_outreach_curl.sh", "w") as f:
            f.write("#!/bin/bash\n")

        # Process emails in chunks of 10
        chunk_size = 10
        for i in range(0, len(emails_json), chunk_size):
            chunk = emails_json[i:i + chunk_size]
            payload = json.dumps({"emails": chunk})
            
            # Escape single quotes in the payload for shell execution
            escaped_payload = payload.replace("'", "'\\''")
            
            # Construct the curl command
            curl_command = f"curl -X POST -H 'Content-Type: application/json' -d '{escaped_payload}' {api_url}"
            
            # Append the curl command to the shell script
            with open("execute_outreach_curl.sh", "a") as f:
                f.write(curl_command + "\n")
        
        print(f"Generated {len(emails_json)} curl commands in execute_outreach_curl.sh")
    else:
        print("No emails were parsed to send.")