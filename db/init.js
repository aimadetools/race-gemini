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
import { addWebhookAndTrackingColumnsToUsers } from './migrations/add_webhook_and_tracking_columns_to_users.js';
import { addSmsColumnsToUsers } from './migrations/add_sms_columns_to_users.js';
import { createTestimonialsTable } from './migrations/create_testimonials_table.js';
import { addFollowupColumnsToLeads } from './migrations/add_followup_columns_to_leads.js';
import { addStripeCustomerIdToUsers } from './migrations/add_stripe_customer_id_to_users.js';
import { addIndexingStatusToSeoPages } from './migrations/add_indexing_status_to_seo_pages.js';
import { addWidgetCssToUsers } from './migrations/add_widget_css_to_users.js';
import { addAiKeywordsToSeoPages } from './migrations/add_ai_keywords_to_seo_pages.js';
import { addPrimaryColorToSeoPages } from './migrations/add_primary_color_to_seo_pages.js';
import { addExternalReviewLinksToUsers } from './migrations/add_external_review_links_to_users.js';
import { addLocalUpdatesToUsers } from './migrations/add_local_updates_to_users.js';
import { addRadiusAndCoordinatesToSeoPages } from './migrations/add_radius_and_coordinates_to_seo_pages.js';
import { createAgencyDirectoryTable } from './migrations/create_agency_directory.js';
import { addGoogleVerificationCodeToUsers } from './migrations/add_google_verification_code_to_users.js';
import { addIsUnlockedToLeads } from './migrations/add_is_unlocked_to_leads.js';
import { addWeeklyReportEnabledToUsers } from './migrations/add_weekly_report_enabled_to_users.js';
import { addGbpSyncToUsers } from './migrations/add_gbp_sync_to_users.js';
import { addFaqsToSeoPages } from './migrations/add_faqs_to_seo_pages.js';
import { addBusinessProfileToUsers } from './migrations/add_business_profile_to_users.js';
import { addGbpOauthToUsers } from './migrations/add_gbp_oauth_to_users.js';
import { createKeywordRankingsTable } from './migrations/create_keyword_rankings_table.js';
import { addAgencyDirectoryIdToLeads } from './migrations/add_agency_directory_id_to_leads.js';


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

    console.log('Ensuring webhook and tracking columns exist in users table...');
    await addWebhookAndTrackingColumnsToUsers();

    console.log('Ensuring SMS notification columns exist in users table...');
    await addSmsColumnsToUsers();

    console.log('Ensuring testimonials table exists...');
    await createTestimonialsTable();

    console.log('Ensuring Stripe customer ID column exists in users table...');
    await addStripeCustomerIdToUsers();

    console.log('Ensuring follow-up columns exist in leads table...');
    await addFollowupColumnsToLeads();

    console.log('Ensuring indexing status columns exist in seo_pages table...');
    await addIndexingStatusToSeoPages();

    console.log('Ensuring widget CSS column exists in users table...');
    await addWidgetCssToUsers();

    console.log('Ensuring AI keywords column exists in seo_pages table...');
    await addAiKeywordsToSeoPages();

    console.log('Ensuring primary color column exists in seo_pages table...');
    await addPrimaryColorToSeoPages();

    console.log('Ensuring external review links exist in users table...');
    await addExternalReviewLinksToUsers();

    console.log('Ensuring local updates columns exist in users table...');
    await addLocalUpdatesToUsers();

    console.log('Ensuring radius and coordinates columns exist in seo_pages table...');
    await addRadiusAndCoordinatesToSeoPages();

    console.log('Ensuring agency directory table exists and is seeded...');
    await createAgencyDirectoryTable();

    console.log('Ensuring google_verification_code column exists in users table...');
    await addGoogleVerificationCodeToUsers();

    console.log('Ensuring is_unlocked column exists in leads table...');
    await addIsUnlockedToLeads();

    console.log('Ensuring weekly_report_enabled column exists in users table...');
    await addWeeklyReportEnabledToUsers();

    console.log('Ensuring Google Business Profile sync columns exist in users table...');
    await addGbpSyncToUsers();

    console.log('Ensuring FAQs column exists in seo_pages table...');
    await addFaqsToSeoPages();

    console.log('Ensuring business_profile column exists in users table...');
    await addBusinessProfileToUsers();

    console.log('Ensuring Google Business Profile OAuth columns exist in users table...');
    await addGbpOauthToUsers();

    console.log('Ensuring keyword rankings table exists...');
    await createKeywordRankingsTable();

    console.log('Ensuring agency_directory_id column exists in leads table...');
    await addAgencyDirectoryIdToLeads();

    console.log('Database initialization completed.');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}



