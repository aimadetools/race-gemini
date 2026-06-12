import { query } from '../index.js';
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

export async function createAgencyDirectoryTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS agency_directory (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      website VARCHAR(255),
      contact_name VARCHAR(255),
      email VARCHAR(255),
      personalization TEXT,
      city VARCHAR(100),
      slug VARCHAR(255) UNIQUE NOT NULL,
      claimed_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL DEFAULT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_agency_directory_slug ON agency_directory (slug);
    CREATE INDEX IF NOT EXISTS idx_agency_directory_city ON agency_directory (city);
  `;

  try {
    await query(createTableQuery);
    console.log('Table agency_directory ensured to exist.');

    // Seed table if empty
    const checkCount = await query('SELECT COUNT(*) FROM agency_directory');
    const count = parseInt(checkCount.rows[0].count, 10);

    if (count === 0) {
      console.log('Seeding agency_directory table from agency-targets.csv...');
      const csvPath = path.join(process.cwd(), 'agency-targets.csv');
      
      if (!fs.existsSync(csvPath)) {
        console.warn(`CSV file not found at ${csvPath}, skipping seed.`);
        return;
      }

      const csvData = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvData.split('\n');
      
      // Cities we support/detect
      const cities = [
        'Boston', 'Denver', 'Seattle', 'Chicago', 'Austin', 'Dallas', 
        'Phoenix', 'San Diego', 'Atlanta', 'Portland', 'Sacramento', 
        'Philadelphia', 'San Francisco', 'Miami', 'Houston', 'Salt Lake City'
      ];

      const detectCity = (name, personalization) => {
        const combined = `${name} ${personalization}`.toLowerCase();
        for (const city of cities) {
          if (combined.includes(city.toLowerCase())) {
            return city;
          }
        }
        return 'United States';
      };

      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      // Header is: Agency Name,Website,Contact Name,Email,Personalization,Sent
      // First line is header, skip it.
      let insertedCount = 0;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const row = parseCSVLine(line);
        if (row.length < 4) continue;

        const name = row[0].replace(/^"|"$/g, '').trim();
        const website = row[1].replace(/^"|"$/g, '').trim();
        const contactName = row[2].replace(/^"|"$/g, '').trim();
        const email = row[3].replace(/^"|"$/g, '').trim();
        const personalization = row[4] ? row[4].replace(/^"|"$/g, '').trim() : '';

        if (!name || !email) continue;

        const city = detectCity(name, personalization);
        
        // Ensure slug is clean and unique
        let baseSlug = slugify(name, { lower: true, strict: true });
        let slug = baseSlug;
        let suffix = 1;
        
        // Since we are running in a loop and haven't committed slugs to database yet, 
        // keep track of unique slugs locally for this batch insert.
        // We'll also do a lookup inside the DB just in case.
        while (true) {
          const checkSlug = await query('SELECT id FROM agency_directory WHERE slug = $1', [slug]);
          if (checkSlug.rows.length === 0) {
            break;
          }
          slug = `${baseSlug}-${suffix}`;
          suffix++;
        }

        try {
          await query(
            `INSERT INTO agency_directory (name, website, contact_name, email, personalization, city, slug)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (slug) DO NOTHING`,
            [name, website, contactName, email, personalization, city, slug]
          );
          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert agency seed row: ${name}`, err);
        }
      }
      console.log(`Seeded ${insertedCount} agencies into agency_directory.`);
    }
  } catch (error) {
    console.error('Error ensuring agency_directory table:', error);
    throw error;
  }
}
