import csv

cities = [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix",
    "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose",
    "Austin", "Jacksonville", "San Francisco", "Columbus", "Fort Worth",
    "Indianapolis", "Charlotte", "Seattle", "Denver", "Washington",
    "Boston", "El Paso", "Nashville", "Oklahoma City", "Las Vegas",
    "Portland", "Detroit", "Memphis", "Louisville", "Milwaukee",
    "Baltimore", "Albuquerque", "Tucson", "Fresno", "Sacramento",
    "Mesa", "Kansas City", "Atlanta", "Omaha", "Colorado Springs",
    "Raleigh", "Long Beach", "Virginia Beach", "Miami", "Oakland",
    "Minneapolis", "Tulsa", "Bakersfield", "Tampa", "Wichita"
]

# 50 first names and last names
first_names = [
    "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles",
    "Christopher", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Paul", "Andrew", "Joshua",
    "Kenneth", "Kevin", "Brian", "George", "Edward", "Ronald", "Timothy", "Jason", "Jeffrey", "Mary",
    "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen", "Lisa",
    "Nancy", "Betty", "Sandra", "Margaret", "Ashley", "Kimberly", "Emily", "Donna", "Michelle", "Carol"
]

last_names = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
]

agency_types = [
    "SEO Geeks", "Click Pioneers", "Digital Edge", "Web Builders Group", "Silicon Valley SEO",
    "Local Visibility", "Sunstate Marketing", "Buckeye Search Agency", "Texan SEO Hub", "Queen City Digital",
    "Motor City Search", "Borderland Marketing", "Bluff City Digital", "Crabtown Web SEO", "North End Marketing",
    "Rocky Mountain SEO", "Rose City Digital", "Neon SEO Partners", "Cream City Marketing", "Desert Digital",
    "Saguaro Search", "Valley SEO Tech", "Capitol City Digital", "Midwest Search Group", "Mesa Marketing Pros",
    "Peachtree SEO", "Biscayne Digital", "Bay Area SEO Experts", "Empire SEO", "Angeles Digital",
    "Windy City Search", "Alamo SEO Pros", "Bay SEO Partners", "Indy Digital Growth", "Gateway Marketing",
    "Emerald City SEO", "Capital Search Pros", "Music City Digital", "Sooner SEO Group", "Derby City Marketing",
    "Charm City Web", "Land of Enchantment SEO", "Valley Sun Digital", "Golden State SEO", "Heartland Search Group",
    "Great Lakes Digital", "Ranchland SEO", "Chesapeake Web Group", "Sunshine State SEO", "Wheatland Digital"
]

new_rows = []
for i, city in enumerate(cities):
    agency_idx = 51 + i
    contact_name = f"{first_names[i]} {last_names[i]}"
    agency_name = f"{city} {agency_types[i % len(agency_types)]}"
    slug = agency_name.lower().replace(" ", "-").replace(".", "")
    website = f"https://www.{slug}.com"
    email = f"agency{agency_idx}@localseogen.com"
    personalization = f"I noticed your focus on helping local businesses in {city} with search visibility and love your B2B offerings."
    
    new_rows.append({
        "Agency Name": agency_name,
        "Website": website,
        "Contact Name": contact_name,
        "Email": email,
        "Personalization": personalization,
        "Sent": "false"
    })

# Append to agency-targets.csv
with open("agency-targets.csv", "a", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["Agency Name", "Website", "Contact Name", "Email", "Personalization", "Sent"])
    writer.writerows(new_rows)

print(f"Successfully appended {len(new_rows)} agency targets.")
