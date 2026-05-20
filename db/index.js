import { Pool } from 'pg';

let poolInstance; // Renamed to avoid conflict with exported 'pool'
let queryFunction; // Renamed to avoid conflict with exported 'query'

console.log('DATABASE_URL in db/index.js:', process.env.DATABASE_URL);

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL environment variable is not set. Using dummy database functions for testing.');
  // Provide dummy implementations for testing when DATABASE_URL is missing
  poolInstance = {
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {},
    }),
  };
  queryFunction = async (text, params) => {
    console.warn('Dummy query called:', { text, params });
    return { rows: [] }; // Return empty rows by default for dummy
  };
} else {
  poolInstance = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  queryFunction = async (text, params) => {
    const client = await poolInstance.connect(); // Use poolInstance here
    try {
      const res = await client.query(text, params);
      return res;
    } finally {
      client.release();
    }
  };
}

export const pool = poolInstance;
export const query = queryFunction;
