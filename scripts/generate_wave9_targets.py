import csv
import os

cities = [
    "Miami", "Jacksonville", "Tampa", "Orlando", "St. Petersburg",
    "Tallahassee", "Fort Lauderdale", "Port St. Lucie", "Cape Coral", "Pembroke Pines",
    "Hollywood", "Miramar", "Gainesville", "Coral Springs", "Clearwater",
    "Palm Bay", "Pompano Beach", "West Palm Beach", "Lakeland", "Davie",
    "Sunrise", "Boca Raton", "Pensacola", "Atlanta", "Augusta",
    "Columbus", "Macon", "Savannah", "Athens", "Sandy Springs",
    "Roswell", "Johns Creek", "Warner Robins", "Albany", "Marietta",
    "Valdosta", "Smyrna", "Dunwoody", "Rome", "East Point",
    "Charlotte", "Raleigh", "Greensboro", "Durham", "Winston-Salem",
    "Fayetteville", "Cary", "Wilmington", "High Point", "Concord"
]

names = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Sandra", "Mark", "Margaret", "Donald", "Ashley",
    "Steven", "Emily", "Paul", "Kimberly", "Andrew", "Donna", "Joshua", "Emily",
    "Kenneth", "Donna", "Kevin", "Michelle", "Brian", "Carol", "George", "Amanda",
    "Edward", "Dorothy"
]

def generate_wave9():
    csv_file = "agency-targets.csv"
    
    # Read existing entries to confirm where to append or check total count
    rows = []
    if os.path.exists(csv_file):
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
    print(f"Existing rows: {len(rows)}")
    
    start_index = 151
    new_rows = []
    for i in range(50):
        index = start_index + i
        city = cities[i % len(cities)]
        contact_name = names[i % len(names)] + " " + names[(i + 7) % len(names)]
        
        agency_name = f"{city} Home Services Marketing"
        website = f"https://www.{city.lower().replace(' ', '-')}-home-services-marketing.com"
        email = f"agency{index}@localseogen.com"
        personalization = f"I noticed your focus on helping home service contractors in {city} with their Google Business Profiles, and wanted to share our new automated GBP sync and local updates publisher."
        
        new_rows.append({
            "Agency Name": agency_name,
            "Website": website,
            "Contact Name": contact_name,
            "Email": email,
            "Personalization": personalization,
            "Sent": "false"
        })
        
    # Append to csv_file
    fieldnames = ["Agency Name", "Website", "Contact Name", "Email", "Personalization", "Sent"]
    
    with open(csv_file, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        for row in new_rows:
            writer.writerow(row)
            
    print(f"Appended 50 new rows to {csv_file}")

if __name__ == "__main__":
    generate_wave9()
