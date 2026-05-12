import csv
import re

def clean_email(email):
    if not isinstance(email, str):
        return None
    match = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', email)
    return match.group(1) if match else None

input_csv_path = 'outreach-targets.csv'
output_csv_path = 'outreach-targets.csv'
updated_rows = []

with open(input_csv_path, mode='r', encoding='utf-8') as infile:
    reader = csv.DictReader(infile)
    fieldnames = reader.fieldnames
    for row in reader:
        original_email = row.get('Email', '').strip()
        cleaned_email = clean_email(original_email)
        row['Email'] = cleaned_email
        updated_rows.append(row)

with open(output_csv_path, mode='w', newline='', encoding='utf-8') as outfile:
    writer = csv.DictWriter(outfile, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(updated_rows)

print(f"Cleaned 'Email' column in {output_csv_path}")
