import csv
import os

CSV_PATH = "agency-targets.csv"

def run():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return

    rows = []
    with open(CSV_PATH, "r") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        for idx, row in enumerate(reader):
            # Check if Sent is already present, if not determine default
            if "Sent" not in row:
                # Mark first 25 rows as sent (0 to 24)
                if idx < 25:
                    row["Sent"] = "true"
                else:
                    row["Sent"] = "false"
            rows.append(row)

    if "Sent" not in fieldnames:
        fieldnames.append("Sent")

    with open(CSV_PATH, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print("Successfully updated agency-targets.csv with Sent column!")

if __name__ == "__main__":
    run()
