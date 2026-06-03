import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  if (!process.env.DATABASE_URL) return;

  try {
    // Search for page views where event_data contains a pageId or path matching the generated-seo-pages
    const clicks = await pool.query(`
      SELECT * 
      FROM user_events 
      WHERE event_name = 'page_view' 
        AND (event_data->>'pageId' LIKE '%static-seo-page%' 
             OR event_data->>'path' LIKE '%generated-seo-pages%'
             OR event_data->>'url' LIKE '%generated-seo-pages%')
      ORDER BY created_at DESC
      LIMIT 100
    `);
    console.log('Clicks on generated SEO pages:', clicks.rows.length);
    if (clicks.rows.length > 0) {
      console.table(clicks.rows);
    } else {
      // Let's print a sample of 20 page views to see what they look like
      const sampleViews = await pool.query(`
        SELECT * 
        FROM user_events 
        WHERE event_name = 'page_view'
        ORDER BY created_at DESC 
        LIMIT 20
      `);
      console.log('Sample page views:');
      console.log(JSON.stringify(sampleViews.rows, null, 2));
    }
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

main();
