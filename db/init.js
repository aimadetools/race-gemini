import { createUsersTable } from './migrations/create_users_table.js';
import { createReferralsAndAlterUsers } from './migrations/create_referrals_and_update_users.js';
import { createSeoPagesTable } from './migrations/create-seo-pages-table.js';

export async function initializeDatabase() {
  try {
    console.log('Ensuring users table exists...');
    await createUsersTable();

    console.log('Ensuring referrals table exists and users are altered...');
    await createReferralsAndAlterUsers();

    console.log('Ensuring seo_pages table exists...');
    await createSeoPagesTable();

    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

