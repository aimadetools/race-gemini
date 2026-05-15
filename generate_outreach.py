import json
import uuid
import re
import csv
import markdown
import os
import tempfile # Import tempfile

from google.generativeai import GenerativeModel
from google.generativeai.types import GenerationConfig

# Define file paths
OUTREACH_TARGETS_CSV = 'outreach-targets.csv'
OUTREACH_EMAIL_TEMPLATE_MD = 'outreach-email-template.md'

# Initialize Gemini API
gemini_api_key = os.environ.get("GEMINI_API_KEY")
gemini_model = None

if gemini_api_key:
    genai = GenerativeModel(gemini_api_key)
    # Configure generation to be more creative and flexible
    gemini_config = GenerationConfig(
        temperature=0.7,
        top_p=0.9,
        top_k=40,
        candidate_count=1
    )
    gemini_model = genai.get_model('gemini-pro') # Assuming 'gemini-pro' is the desired model
else:
    print("GEMINI_API_KEY is not set. AI personalization will be skipped.")

def slugify(text):
    """Converts text to a URL-friendly slug."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace(' ', '-')
    text = ''.join(e for e in text if e.isalnum() or e == '-')
    return text


def generate_outreach_emails():
    emails_to_send = []

    # Read email template
    with open(OUTREACH_EMAIL_TEMPLATE_MD, 'r') as f:
        email_template = f.read()

    # Read outreach targets
    with open(OUTREACH_TARGETS_CSV, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get('Email') and re.match(r"[^@]+@[^@]+\.[^@]+", row['Email'].strip()):
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
                subject_line = email_template.split('\n\n')[0].replace('Subject: ', '')
                subject_line = subject_line.replace('[Business Name]', business_name)
                subject_line = subject_line.replace('[City/Town Name]', city)
                subject_line = subject_line.replace('[Service Type]', service_type)
                
                body_content = email_template.replace(email_template.split('\n\n')[0] + '\n\n', '') # Remove subject line
                body_content = body_content.replace('[Business Name]', business_name)
                body_content = body_content.replace('[City/Town Name]', city)
                body_content = body_content.replace('[Link to sample pages]', sample_page_link)
                body_content = body_content.replace('[Service Type]', service_type)

                ai_personalization_content = ''
                if gemini_model:
                    try:
                        personalization_prompt = (
                            f"Write a very short, engaging, and personalized opening sentence or two "
                            f"for an outreach email to '{business_name}', a '{service_type}' business in '{city}'. "
                            f"Mention their business and location directly, and subtly hint at growth potential. "
                            f"Keep it under 2 sentences."
                        )
                        response = gemini_model.generate_content(personalization_prompt, generation_config=gemini_config)
                        ai_personalization_content = response.text.strip() + '\n\n' # Add newlines for formatting
                    except Exception as e:
                        print(f"Error generating AI personalization for {business_name}: {e}")
                        ai_personalization_content = '' # Fallback to empty if AI fails
                
                body_content = body_content.replace('{{ai_personalization}}', ai_personalization_content)

                # Convert markdown body to HTML
                html_body = markdown.markdown(body_content)

                message_id = str(uuid.uuid4()) # Generate a unique ID for the email
                tracking_pixel = f'<img src="https://www.localseogen.com/api/track-email-open?id={message_id}" width="1" height="1" border="0" style="display:none;" />'
                body_with_tracking = html_body + tracking_pixel # Append the pixel to the HTML body

                emails_to_send.append({
                    "to": recipient_email,
                    "subject": subject_line,
                    "html": body_with_tracking,
                    "message_id": message_id
                })
    return emails_to_send


if __name__ == "__main__":
    emails_json = generate_outreach_emails()

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
            curl_command = f"curl -X POST -H 'Content-Type: application/json' --data-binary @- {api_url} <<EOF\n{payload}\nEOF"
            
            # Append the curl command to the shell script
            with open("execute_outreach_curl.sh", "a") as f:
                f.write(curl_command + "\n")
        
        print(f"Generated {len(emails_json)} curl commands in execute_outreach_curl.sh")
    else:
        print("No emails were parsed to send.")
