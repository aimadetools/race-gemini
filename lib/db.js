import { pool } from '../db/index.js'; // Import the shared pool

async function connectToDatabase() {
  // The shared pool manages connections, so we don't need a local 'conn' variable
  // We can directly return the pool or a client from it.
  // For the purpose of providing a 'connectToDatabase' function that returns the pool
  // for functions like createUserEventsTable to acquire clients, we'll return the pool directly.
  
  // Test the connection if needed, but the pool itself handles lazy connection.
  // This function primarily serves to return the globally accessible pool.
  try {
    // You might want to acquire and release a client here to truly test connection,
    // but often just returning the pool is sufficient as it connects on first use.
    // For now, let's just return the pool, assuming it's configured correctly.
    // The individual migration functions will acquire and release clients.
    return pool; 
  } catch (error) {
    console.error('Failed to provide database pool:', error);
    throw error;
  }
}

export { connectToDatabase };

