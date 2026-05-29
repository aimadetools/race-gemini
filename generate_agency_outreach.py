import json
import uuid
import re
import csv
import markdown
import os
import requests
import logging
import sys
from email_validator import validate_email, EmailNotValidError

# Define file paths
AGENCY_TARGETS_CSV = "agency-targets.csv"
AGENCY_TEMPLATE_MD = "white-label-agency-outreach-email-template.md"

# Configure logging
logging.basicConfig(
    filename="outreach.log",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

def mark_emails_as_sent(sent_email_addresses):
    if not sent_email_addresses:
        return
    
    rows = []
    fieldnames = []
    with open(AGENCY_TARGETS_CSV, "r") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for row in reader:
            if row.get("Email", "").strip().lower() in (email.lower() for email in sent_email_addresses):
                row["Sent"] = "true"
            rows.append(row)
            
    with open(AGENCY_TARGETS_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Updated CSV: marked {len(sent_email_addresses)} emails as sent.")
    logging.info(f"Updated CSV: marked {len(sent_email_addresses)} emails as sent.")

def generate_agency_emails(dry_run_email=None):
    emails_to_send = []

    # Read email template
    if not os.path.exists(AGENCY_TEMPLATE_MD):
        print(f"Error: Template file {AGENCY_TEMPLATE_MD} not found.")
        sys.exit(1)
        
    with open(AGENCY_TEMPLATE_MD, "r") as f:
        email_template = f.read()

    # Read outreach targets
    if not os.path.exists(AGENCY_TARGETS_CSV):
        print(f"Error: Targets file {AGENCY_TARGETS_CSV} not found.")
        sys.exit(1)

    with open(AGENCY_TARGETS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip if already sent
            if row.get("Sent", "").strip().lower() == "true":
                continue

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

            agency_name = row.get("Agency Name", "").strip()
            contact_name = row.get("Contact Name", "").strip()
            personalization = row.get("Personalization", "").strip()

            # Fill template placeholders
            # The first line of the template is: "Subject: ..."
            subject_line = email_template.split("\n\n")[0].replace("Subject: ", "")
            
            body_content = email_template.replace(
                email_template.split("\n\n")[0] + "\n\n", ""
            )  # Remove subject line
            
            body_content = body_content.replace("[Agency Contact Name]", contact_name)
            body_content = body_content.replace("{{ai_personalization}}", personalization)
            body_content = body_content.replace("[Your Name/LocalLeads Team]", "LocalLeads Team")

            # Convert markdown body to HTML
            html_body = markdown.markdown(body_content)

            message_id = str(uuid.uuid4())  # Generate a unique ID for the email
            tracking_pixel = f'<img src="https://www.localseogen.com/api/track-email-open?id={message_id}" width="1" height="1" border="0" style="display:none;" />'
            body_with_tracking = (
                html_body + tracking_pixel
            )  # Append the pixel to the HTML body

            target_to = dry_run_email if dry_run_email else recipient_email

            emails_to_send.append(
                {
                    "to": target_to,
                    "subject": subject_line,
                    "html": body_with_tracking,
                    "message_id": message_id,
                    "original_email": recipient_email, # Keep track of original email to mark as sent
                }
            )
    return emails_to_send

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate and execute agency white-label outreach.")
    parser.add_argument("--dry-run", type=str, help="Send all emails to this test email address instead of the actual recipients.")
    args = parser.parse_args()

    dry_run_email = args.dry_run or os.environ.get("DRY_RUN_EMAIL")
    
    if dry_run_email:
        print(f"DRY RUN ENABLED: Sending all emails to {dry_run_email}")
        
    emails_to_send = generate_agency_emails(dry_run_email)

    if emails_to_send:
        api_url = os.environ.get(
            "OUTREACH_API_URL", "https://www.localseogen.com/api/execute-outreach"
        )
        print(f"Outreach API URL: {api_url}")
        print(f"Prepared {len(emails_to_send)} emails.")

        outreach_secret = os.environ.get("MIGRATION_SECRET")
        if not outreach_secret:
            print("WARNING: MIGRATION_SECRET environment variable is not set. The API request might fail.")

        headers = {"Content-Type": "application/json"}
        if outreach_secret:
            headers["x-outreach-secret"] = outreach_secret

        sent_emails = []
        chunk_size = 10
        for i in range(0, len(emails_to_send), chunk_size):
            chunk = emails_to_send[i : i + chunk_size]
            payload = json.dumps({"emails": [
                {k: v for k, v in email.items() if k != "original_email"}
                for email in chunk
            ]})

            try:
                response = requests.post(
                    api_url, data=payload, headers=headers
                )
                response.raise_for_status()  # Raise an exception for bad status codes
                print(f"Successfully sent chunk of {len(chunk)} emails.")
                logging.info(f"Successfully sent {len(chunk)} emails.")
                
                # Store the successfully sent email addresses
                for email in chunk:
                    sent_emails.append(email["original_email"])
            except requests.exceptions.RequestException as e:
                print(f"Error sending emails: {e}")
                logging.error(f"Failed to send emails: {e}")

        # Update CSV status if this is not a dry-run
        if not dry_run_email:
            mark_emails_as_sent(sent_emails)

        print(f"Processed {len(emails_to_send)} emails.")
    else:
        print("No emails were parsed to send (all might have been already sent).")
