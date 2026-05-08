import os
import csv
import re
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

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
        print("ERROR: Missing required environment variables (SENDGRID_API_KEY, DOMAIN_URL, FROM_EMAIL).")
        print("Please complete the HELP-REQUEST.md to have these set.")
        return False

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject=subject,
        html_content=html_content
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

    email_blocks = content.split("--- EMAIL FOR:")[1:]

    for block in email_blocks:
        lines = block.strip().split('\n')
        # Extract business name from the first line, e.g., "Torres Plumbing, LLC in Austin ---"
        match = re.search(r"^(.*?) in .*? ---", lines[0])
        if not match:
            continue
        business_name = match.group(1).strip()

        # Extract subject from the second line
        subject_match = re.search(r"Subject: (.*)", lines[1])
        if not subject_match:
            continue
        subject = subject_match.group(1).strip()

        # The rest is the HTML body
        body = "\n".join(lines[2:]).strip()

        emails[business_name] = {"subject": subject, "body": body}

    return emails

def main():
    """
    Main function to read targets, find their emails, and send them.
    """
    print("Starting outreach email campaign...")

    #
    # TODO: The outreach-targets.csv file currently does NOT have an 'Email' column.
    # This script will fail until that column is added and populated with email addresses.
    # The human assistant has been asked to find a way to get these emails.
    #

    emails_to_send = parse_generated_emails(GENERATED_EMAILS_FILE)
    if not emails_to_send:
        print("No emails found in the generated emails file. Exiting.")
        return

    try:
        with open(OUTREACH_TARGETS_FILE, "r") as f:
            reader = csv.DictReader(f)
            # Check if 'Email' column exists
            if 'Email' not in reader.fieldnames:
                print(f"CRITICAL ERROR: The '{OUTREACH_TARGETS_FILE}' file is missing the required 'Email' column.")
                print("Please add the 'Email' column and populate it with the email addresses for each business.")
                return

            for row in reader:
                business_name = row.get("Business Name")
                to_email = row.get("Email")

                if not business_name or not to_email:
                    print(f"Skipping row due to missing Business Name or Email: {row}")
                    continue

                if business_name in emails_to_send:
                    email_data = emails_to_send[business_name]
                    subject = email_data["subject"]
                    body = email_data["body"]
                    # Replace placeholder domain
                    body = body.replace("https://localleads.dev", DOMAIN_URL)

                    # For now, we will just print the email to be sent.
                    # Once the domain and SendGrid are set up, we can uncomment the send_email call.
                    print("---")
                    print(f"PREPARING EMAIL FOR: {business_name}")
                    print(f"TO: {to_email}")
                    print(f"SUBJECT: {subject}")
                    # print(f"BODY: {body[:200]}...") # Uncomment for debugging
                    print("---")

                    # UNCOMMENT THE LINE BELOW TO ACTUALLY SEND EMAILS
                    send_email(to_email, subject, body)

                else:
                    print(f"Could not find a generated email for '{business_name}'. Skipping.")

    except FileNotFoundError:
        print(f"ERROR: Could not find the outreach targets file at {OUTREACH_TARGETS_FILE}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

    print("Outreach email campaign script finished.")

if __name__ == "__main__":
    main()
