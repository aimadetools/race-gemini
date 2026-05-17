import os
import csv
import re
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Trigger redeploy
# --- Configuration ---
# These will be set as environment variables on Vercel by the human assistant.
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
DOMAIN_URL = os.environ.get("DOMAIN_URL")
FROM_EMAIL = os.environ.get("FROM_EMAIL")

OUTREACH_TARGETS_FILE = "outreach-targets.csv"
GENERATED_EMAILS_FILE = "generated_outreach_emails.txt"


def send_email(to_email, subject, html_content):
    """Sends an email using the SendGrid API."""
    if not all([SENDGRID_API_KEY, DOMAIN_URL, FROM_EMAIL]):
        print(
            "ERROR: Missing required environment variables (SENDGRID_API_KEY, DOMAIN_URL, FROM_EMAIL)."
        )
        print("Please complete the HELP-REQUEST.md to have these set.")
        return False

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"Email sent to {to_email}. Status code: {response.status_code}")
        return True
    except Exception as e:
        print(f"Error sending email to {to_email}: {e}")
        return False


def parse_generated_emails(file_path):
    """
    Parses the generated_outreach_emails.txt file and returns a dictionary
    mapping business names to their email subject and body.
    """
    emails = {}
    try:
        with open(file_path, "r") as f:
            content = f.read()
    except FileNotFoundError:
        print(f"ERROR: Could not find the generated emails file at {file_path}")
        return emails

    email_blocks = content.split("--- EMAIL FOR:")[1:]  # Split by the new header

    for block in email_blocks:
        lines = block.strip().split("\n")

        # Extract business name from the first line, e.g., " Jensen's Plumbing in Dallas ---"
        match = re.search(r"^(.*?) in .*? ---", lines[0])
        if not match:
            print(f"Could not parse business name from block: {lines[0]}")
            continue
        business_name = match.group(1).strip()

        # Extract 'To' email from the second line
        to_email_match = re.search(r"To: (.*)", lines[1])
        if not to_email_match:
            print(f"Could not parse 'To' email from block: {lines[1]}")
            continue
        to_email = to_email_match.group(1).strip()

        # Extract subject from the third line
        subject_match = re.search(r"Subject: (.*)", lines[2])
        if not subject_match:
            print(f"Could not parse subject from block: {lines[2]}")
            continue
        subject = subject_match.group(1).strip()

        # The rest is the HTML body (skip header, To, Subject, and empty line after Subject)
        body = "\n".join(
            lines[4:]
        ).strip()  # Lines 0 is header, 1 is To, 2 is Subject, 3 is empty line.

        emails[business_name] = {"to_email": to_email, "subject": subject, "body": body}

    return emails


def main():
    """
    Main function to read targets, find their emails, and send them.
    """
    print("Starting outreach email campaign...")

    #
    # The 'Email' column in outreach-targets.csv is now populated via extract_emails.py
    # or can be manually populated. This script now primarily uses generated_outreach_emails.txt
    # for the email content and recipient.
    #

    parsed_emails = parse_generated_emails(GENERATED_EMAILS_FILE)
    if not parsed_emails:
        print("No emails found in the generated emails file. Exiting.")
        return

    try:
        # Instead of reading outreach-targets.csv here to get emails,
        # we iterate through the parsed emails from GENERATED_EMAILS_FILE
        for business_name, email_data in parsed_emails.items():
            to_email = email_data["to_email"]
            subject = email_data["subject"]
            body = email_data["body"]

            # Replace placeholder domain - this is now handled by generate_outreach_emails.py
            # body = body.replace("https://localleads.dev", DOMAIN_URL)

            print("---")
            print(f"PREPARING EMAIL FOR: {business_name}")
            print(f"TO: {to_email}")
            print(f"SUBJECT: {subject}")
            # print(f"BODY: {body[:200]}...") # Uncomment for debugging
            print("---")

            send_email(to_email, subject, body)

    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    print("Outreach email campaign script finished.")


if __name__ == "__main__":
    main()
