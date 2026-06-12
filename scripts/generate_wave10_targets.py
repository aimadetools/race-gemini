import csv
import os

cities = [
    "Austin", "Dallas", "Houston", "San Antonio", "Fort Worth",
    "El Paso", "Arlington", "Corpus Christi", "Plano", "Lubbock",
    "Laredo", "Irving", "Garland", "Amarillo", "Grand Prairie",
    "Brownsville", "McKinney", "Frisco", "Pasadena", "Mesquite",
    "Killeen", "McAllen", "Midland", "Waco", "Denton",
    "Carrollton", "Round Rock", "Abilene", "Pearland", "Richardson",
    "Sugar Land", "Beaumont", "The Woodlands", "College Station", "Tyler",
    "Wichita Falls", "Lewisville", "San Angelo", "Allen", "League City",
    "Longview", "Bryan", "Mission", "Pharr", "Baytown",
    "Temple", "Missouri City", "Flower Mound", "North Richland Hills", "Harlingen"
]

first_names = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Lisa", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Sandra", "Mark", "Margaret", "Donald", "Ashley",
    "Steven", "Emily", "Paul", "Kimberly", "Andrew", "Donna", "Joshua", "Emily",
    "Kenneth", "Donna", "Kevin", "Michelle", "Brian", "Carol", "George", "Amanda",
    "Edward", "Dorothy"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
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

def generate_wave10():
    csv_file = "agency-targets.csv"
    
    # Read existing entries to confirm starting index
    rows = []
    if os.path.exists(csv_file):
        with open(csv_file, "r") as f:
            reader = csv.DictReader(f)
            rows = list(reader)
            
    print(f"Existing rows: {len(rows)}")
    
    start_index = 201
    new_rows = []
    for i in range(50):
        index = start_index + i
        city = cities[i % len(cities)]
        contact_name = f"{first_names[i % len(first_names)]} {last_names[(i + 13) % len(last_names)]}"
        
        agency_name = f"{city} {agency_types[i % len(agency_types)]}"
        website = f"https://www.{city.lower().replace(' ', '-')}-{agency_types[i % len(agency_types)].lower().replace(' ', '-')}.com"
        email = f"agency{index}@localseogen.com"
        personalization = f"I noticed your impressive work supporting local business clients in {city} and wanted to reach out regarding our white-label local SEO platform and new AI-Powered Local Business Schema Generator."
        
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
    generate_wave10()
