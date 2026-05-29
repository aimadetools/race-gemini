import 'dotenv/config';
import { query } from '../db/index.js';

async function run() {
  try {
    const res = await query(`
      SELECT 
        event_data->>'path' as path,
        COUNT(*) as count,
        event_data->>'pageId' as page_id
      FROM user_events 
      WHERE event_name = 'page_view'
      GROUP BY path, page_id
      ORDER BY count DESC
      LIMIT 10;
    `);
    console.log('Top paths:');
    console.table(res.rows);

    const ipRes = await query(`
      SELECT 
        event_data->>'ip' as ip,
        event_data->>'userAgent' as user_agent,
        COUNT(*) as count
      FROM user_events 
      GROUP BY ip, user_agent
      ORDER BY count DESC
      LIMIT 10;
    `);
    console.log('Top IPs/UserAgents:');
    console.table(ipRes.rows);

    const recentRes = await query(`
      SELECT 
        created_at,
        event_data
      FROM user_events 
      WHERE event_name = 'page_view'
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    console.log('Recent events details:');
    console.log(JSON.stringify(recentRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}
run();
