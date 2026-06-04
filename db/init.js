import { createUsersTable } from './migrations/create_users_table.js';
import { createReferralsAndAlterUsers } from './migrations/create_referrals_and_update_users.js';
import { createSeoPagesTable } from './migrations/create-seo-pages-table.js';
import { alterSeoPagesUserId } from './migrations/alter_seo_pages_user_id.js';
import { addMetadataColumnsToSeoPages } from './migrations/add_metadata_columns_to_seo_pages.js';
import { addAgencyColumnsToUsers } from './migrations/add_agency_columns_to_users.js';
import { createLeadsTable } from './migrations/create_leads_table.js';
import { alterLeadsTableV2 } from './migrations/alter_leads_table_v2.js';
import { createAgencyInquiriesTable } from './migrations/create_agency_inquiries_table.js';
import { addCustomDomainToUsers } from './migrations/add_custom_domain_to_users.js';

export async function initializeDatabase() {
  try {
    console.log('Ensuring users table exists...');
    await createUsersTable();

    console.log('Ensuring referrals table exists and users are altered...');
    await createReferralsAndAlterUsers();

    console.log('Ensuring seo_pages table exists...');
    await createSeoPagesTable();

    console.log('Ensuring seo_pages user_id column is correct type...');
    await alterSeoPagesUserId();

    console.log('Ensuring metadata columns exist in seo_pages table...');
    await addMetadataColumnsToSeoPages();

    console.log('Ensuring agency-related columns exist in users table...');
    await addAgencyColumnsToUsers();

    console.log('Ensuring leads table exists...');
    await createLeadsTable();

    console.log('Ensuring leads table schema is up to date...');
    await alterLeadsTableV2();

    console.log('Ensuring agency_inquiries table exists...');
    await createAgencyInquiriesTable();

    console.log('Ensuring custom domain columns exist in users table...');
    await addCustomDomainToUsers();

    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

