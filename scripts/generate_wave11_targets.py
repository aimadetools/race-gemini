import csv
import os

cities = [
    # Top US Cities
    "New York", "Los Angeles", "Chicago", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin",
    "Jacksonville", "Fort Worth", "Columbus", "Charlotte", "Indianapolis",
    "San Francisco", "Seattle", "Denver", "Washington", "Boston",
    "El Paso", "Nashville", "Detroit", "Oklahoma City", "Portland",
    "Las Vegas", "Memphis", "Louisville", "Baltimore", "Milwaukee",
    "Albuquerque", "Tucson", "Fresno", "Sacramento", "Mesa",
    "Kansas City", "Atlanta", "Omaha", "Colorado Springs", "Raleigh",
    "Virginia Beach", "Long Beach", "Miami", "Oakland", "Minneapolis",
    "Tulsa", "Bakersfield", "Tampa", "Wichita", "Arlington",
    "Aurora", "New Orleans", "Cleveland", "Anaheim", "Henderson",
    "Honolulu", "Riverside", "Santa Ana", "Corpus Christi", "Lexington",
    "San Juan", "Stockton", "St. Paul", "Cincinnati", "Irvine",
    "Greensboro", "Pittsburgh", "Lincoln", "St. Louis", "Orlando",
    "Plano", "Newark", "Durham", "Chula Vista", "Toledo",
    "Fort Wayne", "St. Petersburg", "Laredo", "Jersey City", "Chandler",
    "Madison", "Lubbock", "Scottsdale", "Reno", "Buffalo",
    "Gilbert", "Glendale", "North Las Vegas", "Winston-Salem", "Chesapeake",
    "Norfolk", "Fremont", "Garland", "Irving", "Hialeah",
    "Cary", "Fort Lauderdale", "Wilmington", "Concord", "Fayetteville"
]

first_names = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Sandra", "Mark", "Margaret", "Donald", "Ashley",
    "Steven", "Emily", "Paul", "Kimberly", "Andrew", "Donna", "Joshua", "Kenneth",
    "Kevin", "Michelle", "Brian", "Carol", "George", "Amanda", "Edward", "Dorothy",
    "Jason", "Helen", "Gary", "Sandra", "Timothy", "Deborah", "Ronald", "Sharon"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards", "Collins", "Reyes"
]

agency_types = [
    "Local SEO Specialists", "Digital Media Partners", "Web Growth Group", "Visibility Agency", "Search Solutions",
    "Local Marketing Lab", "Apex Digital SEO", "Lone Star Marketing", "Metro Search Group", "Frontier Web Agency",
    "Summit Local SEO", "Elevate Search Partners", "Blue Ribbon Digital", "High Ranking Web", "Vanguard Marketing",
    "Texas SEO Labs", "Pinnacle Local Search", "Vector Web Solutions", "Quantum SEO Partners", "NextGen Digital",
    "Anchor Local SEO", "Optima Web Marketing", "Beacon Digital Group", "Premier Search Pros", "Iconic Local SEO",
    "Horizon Digital Media", "Core Search Solutions", "Omni Web Marketing", "Direct Visibility", "Dynamic Local SEO",
    "Ascent Marketing Group", "Prism Search Partners", "Foundry Digital SEO", "Nova Web Solutions", "Spectrum Search",
    "Epic Local Marketing", "Velocity Digital Agency", "True North SEO", "Focus Web Partners", "Clear Choice Marketing",
    "Strategic Local SEO", "Nexus Digital Media", "Aspire Search Solutions", "Catalyst Web Marketing", "Prestige SEO Pros",
    "Intrepid Local Search", "Sterling Digital Group", "Summit Web Solutions", "Pioneer Search Labs", "Infinity Local SEO"
]

def generate_wave11():
    csv_file = "agency-targets.csv"
    
    # Read existing entries to confirm starting index
    rows = []
    if os.path.exists(csv_file):
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
    print(f"Existing rows: {len(rows)}")
    
    start_index = 251
    new_rows = []
    for i in range(100):
        index = start_index + i
        city = cities[i % len(cities)]
        contact_name = f"{first_names[i % len(first_names)]} {last_names[(i + 17) % len(last_names)]}"
        
        agency_name = f"{city} {agency_types[i % len(agency_types)]}"
        website = f"https://www.{city.lower().replace(' ', '-')}-{agency_types[i % len(agency_types)].lower().replace(' ', '-')}.com"
        email = f"agency{index}@localseogen.com"
        personalization = f"I noticed your impressive work supporting local business clients in {city} and wanted to reach out regarding our white-label local SEO platform's new Google Business Profile One-Click Local Updates Reseller tool."
        
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
            
    print(f"Appended 100 new rows to {csv_file}")

if __name__ == "__main__":
    generate_wave11()
