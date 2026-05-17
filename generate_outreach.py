import json
import uuid
import re
import csv
import markdown
import os
import requests
import logging
from email_validator import validate_email, EmailNotValidError

# Define file paths
OUTREACH_TARGETS_CSV = os.environ.get("OUTREACH_TARGETS_CSV", "outreach-targets.csv")
OUTREACH_EMAIL_TEMPLATE_MD = os.environ.get(
    "OUTREACH_EMAIL_TEMPLATE_MD", "outreach-email-template.md"
)

# Configure logging
logging.basicConfig(
    filename="outreach.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)


def slugify(text):
    """Converts text to a URL-friendly slug."""
    if not text:
        return ""
    text = text.lower()
    text = text.replace(" ", "-")
    text = "".join(e for e in text if e.isalnum() or e == "-")
    return text


def generate_outreach_emails():
    emails_to_send = []

    # Read email template
    with open(OUTREACH_EMAIL_TEMPLATE_MD, "r") as f:
        email_template = f.read()

    # Read outreach targets
    with open(OUTREACH_TARGETS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            recipient_email = row.get("Email", "").strip()
            if not recipient_email:
                continue

            try:
                # Validate email
                v = validate_email(recipient_email)
                recipient_email = v.email
            except EmailNotValidError as e:
                logging.warning(f"Skipping invalid email: {recipient_email} - {e}")
                continue

            business_name = row.get("Business Name", "").strip()
            city = row.get("City", "").strip()
            service_type = row.get("Service Type", "").strip()

            # Construct personalized link
            base_url = "https://www.localseogen.com/generated-seo-pages/"
            service_slug = slugify(service_type)
            business_slug = slugify(business_name)
            city_slug = slugify(city)

            sample_page_link = (
                f"{base_url}{service_slug}-in-{city_slug}-{business_slug}.html"
            )

            # Fill template placeholders
            subject_line = email_template.split("\n\n")[0].replace("Subject: ", "")
            subject_line = subject_line.replace("[Business Name]", business_name)
            subject_line = subject_line.replace("[City/Town Name]", city)
            subject_line = subject_line.replace("[Service Type]", service_type)

            body_content = email_template.replace(
                email_template.split("\n\n")[0] + "\n\n", ""
            )  # Remove subject line
            body_content = body_content.replace("[Business Name]", business_name)
            body_content = body_content.replace("[City/Town Name]", city)
            body_content = body_content.replace(
                "[Link to sample pages]", sample_page_link
            )
            body_content = body_content.replace("[Service Type]", service_type)

            # Convert markdown body to HTML
            html_body = markdown.markdown(body_content)

            message_id = str(uuid.uuid4())  # Generate a unique ID for the email
            tracking_pixel = f'<img src="https://www.localseogen.com/api/track-email-open?id={message_id}" width="1" height="1" border="0" style="display:none;" />'
            body_with_tracking = (
                html_body + tracking_pixel
            )  # Append the pixel to the HTML body

            emails_to_send.append(
                {
                    "to": recipient_email,
                    "subject": subject_line,
                    "html": body_with_tracking,
                    "message_id": message_id,
                }
            )
    return emails_to_send


if __name__ == "__main__":
    emails_to_send = generate_outreach_emails()

    if emails_to_send:
        api_url = os.environ.get(
            "OUTREACH_API_URL", "https://www.localseogen.com/api/execute-outreach"
        )

        chunk_size = 10
        for i in range(0, len(emails_to_send), chunk_size):
            chunk = emails_to_send[i : i + chunk_size]
            payload = json.dumps({"emails": chunk})

            try:
                response = requests.post(
                    api_url, data=payload, headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()  # Raise an exception for bad status codes
                logging.info(f"Successfully sent {len(chunk)} emails.")
            except requests.exceptions.RequestException as e:
                logging.error(f"Failed to send emails: {e}")

        print(f"Processed {len(emails_to_send)} emails.")
    else:
        print("No emails were parsed to send.")
