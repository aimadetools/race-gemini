import csv
import json
import uuid
import os
import sys
import requests
import logging
from email_validator import validate_email, EmailNotValidError

CSV_PATH = "agency-targets.csv"
logging.basicConfig(
    filename="outreach.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Follow-up Email Template
SUBJECT_LINE = "Quick question about your agency's local SEO page generation (localseogen.com)"
BODY_TEMPLATE = """Hi [Agency Contact Name],

I sent you a quick note a couple of days ago about LocalLeads (https://www.localseogen.com). We offer a white-label platform that generates search-optimized pages for local businesses across every town they serve, allowing agencies to scale their SEO offerings under their own brand.

I know how busy it gets running an agency, so I wanted to follow up and see if you had a chance to check out our white-label program details here: https://www.localseogen.com/agency-white-label.html

With our platform, you can:
* Expand your service offerings without adding development overhead.
* Deliver measurable search improvements for multi-location clients.
* Boost recurring revenue by reselling under your own domain, logo, and brand colors.

Are you open to a brief chat next week, or would you like to set up a free trial account to test the system?

Best regards,

The LocalLeads Team
hello@localseogen.com
"""

def main():
    dry_run = "--dry-run" in sys.argv
    test_email = None
    if dry_run:
        idx = sys.argv.index("--dry-run")
        if idx + 1 < len(sys.argv):
            test_email = sys.argv[idx + 1]
        else:
            test_email = "test@localseogen.com"
        print(f"DRY RUN ENABLED: Sending all emails to {test_email}")

    # Read the targets CSV
    if not os.path.exists(CSV_PATH):
        print(f"Error: CSV file {CSV_PATH} not found.")
        sys.exit(1)

    targets = []
    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            # Lines 32 to 56 correspond to 0-based indices 30 to 54 in DictReader loop
            if 30 <= i <= 54:
                targets.append(row)

    print(f"Loaded {len(targets)} targets from Wave 2 (lines 32-56).")

    emails_to_send = []
    for row in targets:
        recipient_email = row.get("Email", "").strip()
        if not recipient_email:
            continue

        try:
            v = validate_email(recipient_email)
            recipient_email = v.email
        except EmailNotValidError as e:
            logging.warning(f"Skipping invalid email: {recipient_email} - {e}")
            continue

        contact_name = row.get("Contact Name", "").strip()
        
        # Replace placeholders in the body
        body_content = BODY_TEMPLATE.replace("[Agency Contact Name]", contact_name)
        
        # Convert markdown-like content to simple HTML (convert bullet points and links)
        html_body = body_content.replace("\n", "<br/>")
        html_body = html_body.replace("* ", "<li>").replace("</li><br/>", "</li>")
        
        message_id = str(uuid.uuid4())
        tracking_pixel = f'<img src="https://www.localseogen.com/api/track-email-open?id={message_id}" width="1" height="1" border="0" style="display:none;" />'
        body_with_tracking = html_body + tracking_pixel

        target_to = test_email if dry_run else recipient_email

        emails_to_send.append({
            "to": target_to,
            "subject": SUBJECT_LINE,
            "html": body_with_tracking,
            "message_id": message_id,
            "original_email": recipient_email
        })

    if not emails_to_send:
        print("No emails prepared.")
        return

    api_url = os.environ.get(
        "OUTREACH_API_URL", "https://www.localseogen.com/api/execute-outreach"
    )
    outreach_secret = os.environ.get("MIGRATION_SECRET")
    if not outreach_secret:
        print("WARNING: MIGRATION_SECRET environment variable is not set. The API request might fail.")

    headers = {"Content-Type": "application/json"}
    if outreach_secret:
        headers["x-outreach-secret"] = outreach_secret

    print(f"Prepared {len(emails_to_send)} follow-up emails.")
    
    sent_count = 0
    chunk_size = 10
    for i in range(0, len(emails_to_send), chunk_size):
        chunk = emails_to_send[i : i + chunk_size]
        payload = json.dumps({"emails": [
            {k: v for k, v in email.items() if k != "original_email"}
            for email in chunk
        ]})

        try:
            response = requests.post(api_url, data=payload, headers=headers)
            response.raise_for_status()
            print(f"Successfully sent chunk of {len(chunk)} follow-up emails.")
            logging.info(f"Successfully sent {len(chunk)} follow-up emails.")
            sent_count += len(chunk)
        except requests.exceptions.RequestException as e:
            print(f"Error sending emails: {e}")
            logging.error(f"Failed to send follow-up emails: {e}")

    print(f"Successfully sent {sent_count} follow-up emails.")

if __name__ == "__main__":
    main()
