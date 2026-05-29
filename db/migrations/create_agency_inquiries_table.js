import { query } from '../index.js';

export async function createAgencyInquiriesTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS agency_inquiries (
      id VARCHAR(50) PRIMARY KEY,
      timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      agency_name VARCHAR(255) NOT NULL,
      website VARCHAR(255) NOT NULL,
      contact_person VARCHAR(255) NOT NULL,
      contact_email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(50),
      client_volume VARCHAR(100),
      message TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_agency_inquiries_email ON agency_inquiries (contact_email);
  `;

  try {
    await query(createTableQuery);
    console.log('Table agency_inquiries ensured to exist.');
  } catch (error) {
    console.error('Error ensuring agency_inquiries table:', error);
    throw error;
  }
}
