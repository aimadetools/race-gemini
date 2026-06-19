import crypto from 'crypto';

const mockUsers = [];
const mockSeoPages = [];
const mockTestimonials = [];
const mockLeads = [];
const mockKeywordRankings = [];
let nextId = 1;

export const getMockKeywordRankings = () => mockKeywordRankings;
export const addMockKeywordRanking = (r) => mockKeywordRankings.push(r);
export const clearMockKeywordRankings = () => { mockKeywordRankings.length = 0; };

let queryDelegate = null;
export const setQueryDelegate = (fn) => {
    queryDelegate = fn;
};

export const getMockSeoPages = () => mockSeoPages;
export const addMockSeoPage = (page) => mockSeoPages.push(page);
export const clearMockSeoPages = () => { mockSeoPages.length = 0; };

export const getMockTestimonials = () => mockTestimonials;
export const addMockTestimonial = (t) => mockTestimonials.push(t);
export const clearMockTestimonials = () => { mockTestimonials.length = 0; };

export const getMockLeads = () => mockLeads;
export const addMockLead = (l) => mockLeads.push(l);
export const clearMockLeads = () => { mockLeads.length = 0; };

export const originalMockQuery = async (text, params) => {
    const textLower = text.toLowerCase();

    // 1. SELECT query
    if (textLower.startsWith('select')) {
        if (textLower.includes('from leads')) {
            if (textLower.includes('where source = $1')) {
                const source = params[0];
                const rows = mockLeads.filter(l => l.source === source);
                return { rows };
            }
            if (textLower.includes('where user_id = $1')) {
                const userId = params[0]?.toString();
                const rows = mockLeads.filter(l => l.user_id?.toString() === userId);
                return { rows };
            }
            return { rows: mockLeads };
        }

        if (textLower.includes('from keyword_rankings')) {
            if (textLower.includes('where id = $1 and user_id = $2')) {
                const [id, userId] = params;
                const rows = mockKeywordRankings.filter(r => r.id?.toString() === id?.toString() && r.user_id?.toString() === userId?.toString());
                return { rows };
            }
            if (textLower.includes('lower(keyword) = $2 and lower(town) = $3')) {
                const [userId, kw, town] = params;
                const rows = mockKeywordRankings.filter(r => 
                    r.user_id?.toString() === userId?.toString() && 
                    r.keyword?.toLowerCase() === kw?.toLowerCase() && 
                    r.town?.toLowerCase() === town?.toLowerCase()
                );
                return { rows };
            }
            if (textLower.includes('where user_id = $1')) {
                const userId = params[0]?.toString();
                const rows = mockKeywordRankings.filter(r => r.user_id?.toString() === userId);
                return { rows };
            }
        }

        if (textLower.includes('from seo_pages')) {
            if (textLower.includes('count(*)')) {
                const userId = params[0]?.toString();
                const count = mockSeoPages.filter(p => p.user_id?.toString() === userId).length;
                return { rows: [{ count }] };
            }
            if (textLower.includes('where id = $1 and file_name = $2') || textLower.includes('where user_id = $1 and file_name = $2')) {
                const [userId, fileName] = params;
                const page = mockSeoPages.find(p => p.user_id?.toString() === userId?.toString() && p.file_name === fileName);
                return { rows: page ? [page] : [] };
            }
            if (textLower.includes('where id = $1')) {
                const id = params[0];
                const page = mockSeoPages.find(p => p.id === id);
                return { rows: page ? [page] : [] };
            }
            if (textLower.includes('where slug = $1 or file_name = $2')) {
                const [slug, fileName] = params;
                const page = mockSeoPages.find(p => p.slug === slug || p.file_name === fileName);
                return { rows: page ? [page] : [] };
            }
            if (textLower.includes('where user_id = $1 and id != $2')) {
                const userId = params[0]?.toString();
                const excludeId = params[1];
                const service = params[2];
                let rows = mockSeoPages.filter(p => p.user_id?.toString() === userId && p.id !== excludeId);
                rows.sort((a, b) => {
                    const aMatch = a.service === service ? 0 : 1;
                    const bMatch = b.service === service ? 0 : 1;
                    if (aMatch !== bMatch) return aMatch - bMatch;
                    return (b.created_at || 0) - (a.created_at || 0);
                });
                rows = rows.slice(0, 12);
                return { rows };
            }
            if (textLower.includes('where user_id = $1')) {
                const userId = params[0]?.toString();
                let rows = mockSeoPages.filter(p => p.user_id?.toString() === userId);
                if (textLower.includes('limit $2 offset $3')) {
                    const limit = params[1];
                    const offset = params[2];
                    rows = rows.slice(offset, offset + limit);
                }
                return { rows };
            }
            if (textLower.includes('where file_name = $1')) {
                const fileName = params[0];
                const page = mockSeoPages.find(p => p.file_name === fileName);
                return { rows: page ? [page] : [] };
            }
        }

        if (textLower.includes('from testimonials')) {
            if (textLower.includes('author_name = $2') && textLower.includes('review_text = $3')) {
                const userId = params[0]?.toString();
                const authorName = params[1];
                const reviewText = params[2];
                const rows = mockTestimonials.filter(t => 
                    t.user_id?.toString() === userId && 
                    t.author_name === authorName && 
                    t.review_text === reviewText
                );
                return { rows };
            }
            if (textLower.includes('where id = $1 and user_id = $2') || textLower.includes('where id = $1')) {
                const id = params[0]?.toString();
                const userId = params[1]?.toString();
                const rows = mockTestimonials.filter(t => 
                    t.id?.toString() === id && 
                    (!userId || t.user_id?.toString() === userId)
                );
                return { rows };
            }
            if (textLower.includes('where user_id = $1')) {
                const userId = params[0]?.toString();
                const rows = mockTestimonials.filter(t => t.user_id?.toString() === userId);
                return { rows };
            }
        }

        if (textLower.includes('select count(*) from seo_pages where user_id = $1')) {
            const userId = params[0]?.toString();
            const count = mockSeoPages.filter(p => p.user_id?.toString() === userId).length;
            return { rows: [{ count }] };
        }

        // Check WHERE clauses for users
        if (textLower.includes('where email = $1')) {
            const email = params[0];
            const user = mockUsers.find(u => u.email === email);
            if (user) {
                const u = {
                    id: user.id,
                    name: user.name || null,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                    subscription_status: user.subscription_status || 'inactive',
                    stripe_subscription_id: user.stripe_subscription_id || null,
                    logo_url: user.logo_url || null,
                    primary_color: user.primary_color || null,
                    agency_id: user.agency_id || null,
                    is_agency: user.is_agency || false,
                    custom_domain: user.custom_domain || null,
                    custom_domain_redirect: user.custom_domain_redirect || null,
                    google_verification_code: user.google_verification_code || user.googleVerificationCode || null,
                    webhook_url: user.webhook_url || null,
                    webhook_enabled: user.webhook_enabled || false,
                    ga_tracking_id: user.ga_tracking_id || null,
                    fb_pixel_id: user.fb_pixel_id || null,
                    sms_enabled: user.sms_enabled || false,
                    sms_phone: user.sms_phone || null,
                    widget_css: user.widget_css || user.widgetCss || null,
                    google_review_link: user.google_review_link || user.googleReviewLink || null,
                    facebook_review_link: user.facebook_review_link || user.facebookReviewLink || null,
                    yelp_review_link: user.yelp_review_link || user.yelpReviewLink || null,
                    weekly_report_enabled: user.weekly_report_enabled !== false,
                    announcement_text: user.announcement_text || user.announcementText || null,
                    announcement_type: user.announcement_type || user.announcementType || 'news',
                    announcement_coupon_code: user.announcement_coupon_code || user.announcementCouponCode || null,
                    announcement_updated_at: user.announcement_updated_at || user.announcementUpdatedAt || null,
                    announcement_expires_at: user.announcement_expires_at || user.announcementExpiresAt || null,
                    gbp_sync_enabled: user.gbp_sync_enabled || user.gbpSyncEnabled || false,
                    gbp_place_id: user.gbp_place_id || user.gbpPlaceId || null,
                    gbp_last_synced_at: user.gbp_last_synced_at || user.gbpLastSyncedAt || null,
                    business_profile: user.business_profile || user.businessProfile || null,
                    gbp_oauth_refresh_token: user.gbp_oauth_refresh_token || user.gbpOauthRefreshToken || null,
                    gbp_oauth_access_token: user.gbp_oauth_access_token || user.gbpOauthAccessToken || null,
                    gbp_oauth_token_expires_at: user.gbp_oauth_token_expires_at || user.gbpOauthTokenExpiresAt || null,
                    gbp_account_id: user.gbp_account_id || user.gbpAccountId || null,
                    gbp_location_id: user.gbp_location_id || user.gbpLocationId || null,
                };
                return { rows: [u] };

            }
            return { rows: [] };
        }
        
        if (textLower.includes('where id = $1')) {
            const id = params[0]?.toString();
            const user = mockUsers.find(u => u.id.toString() === id);
            if (user) {
                const u = {
                    id: user.id,
                    name: user.name || null,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                    subscription_status: user.subscription_status || 'inactive',
                    stripe_subscription_id: user.stripe_subscription_id || null,
                    logo_url: user.logo_url || null,
                    primary_color: user.primary_color || null,
                    agency_id: user.agency_id || null,
                    is_agency: user.is_agency || false,
                    custom_domain: user.custom_domain || null,
                    custom_domain_redirect: user.custom_domain_redirect || null,
                    google_verification_code: user.google_verification_code || user.googleVerificationCode || null,
                    webhook_url: user.webhook_url || null,
                    webhook_enabled: user.webhook_enabled || false,
                    ga_tracking_id: user.ga_tracking_id || null,
                    fb_pixel_id: user.fb_pixel_id || null,
                    sms_enabled: user.sms_enabled || false,
                    sms_phone: user.sms_phone || null,
                    widget_css: user.widget_css || user.widgetCss || null,
                    google_review_link: user.google_review_link || user.googleReviewLink || null,
                    facebook_review_link: user.facebook_review_link || user.facebookReviewLink || null,
                    yelp_review_link: user.yelp_review_link || user.yelpReviewLink || null,
                    weekly_report_enabled: user.weekly_report_enabled !== false,
                    announcement_text: user.announcement_text || user.announcementText || null,
                    announcement_type: user.announcement_type || user.announcementType || 'news',
                    announcement_coupon_code: user.announcement_coupon_code || user.announcementCouponCode || null,
                    announcement_updated_at: user.announcement_updated_at || user.announcementUpdatedAt || null,
                    announcement_expires_at: user.announcement_expires_at || user.announcementExpiresAt || null,
                    gbp_sync_enabled: user.gbp_sync_enabled || user.gbpSyncEnabled || false,
                    gbp_place_id: user.gbp_place_id || user.gbpPlaceId || null,
                    gbp_last_synced_at: user.gbp_last_synced_at || user.gbpLastSyncedAt || null,
                    business_profile: user.business_profile || user.businessProfile || null,
                    gbp_oauth_refresh_token: user.gbp_oauth_refresh_token || user.gbpOauthRefreshToken || null,
                    gbp_oauth_access_token: user.gbp_oauth_access_token || user.gbpOauthAccessToken || null,
                    gbp_oauth_token_expires_at: user.gbp_oauth_token_expires_at || user.gbpOauthTokenExpiresAt || null,
                    gbp_account_id: user.gbp_account_id || user.gbpAccountId || null,
                    gbp_location_id: user.gbp_location_id || user.gbpLocationId || null,
                };
                return { rows: [u] };

            }
            return { rows: [] };
        }

        if (textLower.includes('where gbp_sync_enabled = true')) {
            const rows = mockUsers.filter(u => u.gbp_sync_enabled === true || u.gbpSyncEnabled === true).map(user => ({
                id: user.id,
                email: user.email,
                google_review_link: user.google_review_link || user.googleReviewLink || null,
                gbp_place_id: user.gbp_place_id || user.gbpPlaceId || null,
                gbp_sync_enabled: true,
                gbp_last_synced_at: user.gbp_last_synced_at || user.gbpLastSyncedAt || null
            }));
            return { rows };
        }
        
        if (textLower.includes('where referral_code = $1')) {
            const refCode = params[0];
            const user = mockUsers.find(u => u.referral_code === refCode);
            if (user) {
                const u = {
                    id: user.id,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                    hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                };
                return { rows: [u] };
            }
            return { rows: [] };
        }

        if (textLower.includes('where agency_id = $1')) {
            const agencyId = params[0]?.toString();
            const clients = mockUsers.filter(u => u.agency_id?.toString() === agencyId);
            const rows = clients.map(user => ({
                id: user.id,
                name: user.name || null,
                email: user.email,
                password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                passwordHash: user.password_hash || user.passwordHash || user.hashed_password,
                hashed_password: user.password_hash || user.passwordHash || user.hashed_password,
                credits: user.credits || 0,
                referral_code: user.referral_code,
                referrer_id: user.referrer_id,
                subscription_status: user.subscription_status || 'inactive',
                stripe_subscription_id: user.stripe_subscription_id || null,
                logo_url: user.logo_url || null,
                primary_color: user.primary_color || null,
                agency_id: user.agency_id || null,
                is_agency: user.is_agency || false,
                custom_domain: user.custom_domain || null,
                custom_domain_redirect: user.custom_domain_redirect || null,
                google_review_link: user.google_review_link || user.googleReviewLink || null,
                facebook_review_link: user.facebook_review_link || user.facebookReviewLink || null,
                yelp_review_link: user.yelp_review_link || user.yelpReviewLink || null,
            }));
            return { rows };
        }

        if (textLower.includes('custom_domain = $1') || textLower.includes('lower(custom_domain) = $1')) {
            const domain = params[0]?.toLowerCase();
            const excludeId = textLower.includes('id != $2') ? params[1]?.toString() : null;
            const user = mockUsers.find(u => u.custom_domain?.toLowerCase() === domain && u.id?.toString() !== excludeId);
            if (user) {
                const u = {
                    id: user.id,
                    name: user.name || null,
                    email: user.email,
                    password_hash: user.password_hash || user.passwordHash || user.hashed_password,
                    credits: user.credits || 0,
                    referral_code: user.referral_code,
                    referrer_id: user.referrer_id,
                    subscription_status: user.subscription_status || 'inactive',
                    stripe_subscription_id: user.stripe_subscription_id || null,
                    logo_url: user.logo_url || null,
                    primary_color: user.primary_color || null,
                    agency_id: user.agency_id || null,
                    is_agency: user.is_agency || false,
                    custom_domain: user.custom_domain || null,
                    custom_domain_redirect: user.custom_domain_redirect || null,
                    google_verification_code: user.google_verification_code || user.googleVerificationCode || null,
                    google_review_link: user.google_review_link || user.googleReviewLink || null,
                    facebook_review_link: user.facebook_review_link || user.facebookReviewLink || null,
                    yelp_review_link: user.yelp_review_link || user.yelpReviewLink || null,
                };
                return { rows: [u] };
            }
            return { rows: [] };
        }
    }

    // 2. INSERT query
    if (textLower.includes('insert into users')) {
        const match = text.match(/insert\s+into\s+users\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newUser = { id: (nextId++).toString() };
            cols.forEach((col, i) => {
                newUser[col] = params[i];
            });
            // Ensure credits defaults to 0 if not provided
            if (newUser.credits === undefined) {
                newUser.credits = 0;
            }
            mockUsers.push(newUser);
            return { rows: [{ id: newUser.id }] };
        }
    }

    if (textLower.includes('insert into keyword_rankings')) {
        const match = text.match(/insert\s+into\s+keyword_rankings\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newRanking = { id: (nextId++).toString(), last_checked: new Date(), created_at: new Date() };
            cols.forEach((col, i) => {
                let val = params[i];
                if (col === 'user_id') newRanking.user_id = val?.toString();
                else if (col === 'keyword') newRanking.keyword = val;
                else if (col === 'town') newRanking.town = val;
                else if (col === 'service') newRanking.service = val;
                else if (col === 'rank') newRanking.rank = val;
                else if (col === 'previous_rank') newRanking.previous_rank = val;
                else newRanking[col] = val;
            });
            mockKeywordRankings.push(newRanking);
            return { rows: [newRanking] };
        }
    }

    if (textLower.includes('insert into seo_pages')) {
        const match = text.match(/insert\s+into\s+seo_pages\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newPage = { id: params[0] || crypto.randomUUID() };
            cols.forEach((col, i) => {
                let val = params[i];
                if (col === 'business_name') newPage.business_name = val;
                else if (col === 'zip_code') newPage.zip_code = val;
                else if (col === 'price_range') newPage.price_range = val;
                else if (col === 'opening_hours') newPage.opening_hours = val;
                else if (col === 'enable_ai_copy') newPage.enable_ai_copy = val;
                else if (col === 'ai_style') newPage.ai_style = val;
                else newPage[col] = val;
            });
            
            const existingIdx = mockSeoPages.findIndex(p => p.slug === newPage.slug);
            if (existingIdx !== -1) {
                mockSeoPages[existingIdx] = { ...mockSeoPages[existingIdx], ...newPage, updated_at: new Date() };
                return { rows: [mockSeoPages[existingIdx]] };
            }
            
            newPage.created_at = new Date();
            newPage.updated_at = new Date();
            mockSeoPages.push(newPage);
            return { rows: [newPage] };
        }
    }

    if (textLower.includes('insert into testimonials')) {
        const match = text.match(/insert\s+into\s+testimonials\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newTestimonial = { id: (nextId++).toString() };
            cols.forEach((col, i) => {
                newTestimonial[col] = params[i];
            });
            newTestimonial.created_at = new Date();
            mockTestimonials.push(newTestimonial);
            return { rows: [newTestimonial] };
        }
    }

    if (textLower.includes('insert into leads')) {
        const match = text.match(/insert\s+into\s+leads\s*\(([^)]+)\)/i);
        if (match) {
            const cols = match[1].split(',').map(c => c.trim().toLowerCase());
            const newLead = { id: (nextId++).toString() };
            cols.forEach((col, i) => {
                newLead[col] = params[i];
            });
            newLead.created_at = new Date();
            newLead.last_followup_step = 0;
            newLead.last_followup_at = null;
            mockLeads.push(newLead);
            return { rows: [newLead] };
        }
    }

    // 3. UPDATE query
    if (textLower.includes('update users')) {
        if (textLower.includes('gbp_oauth_refresh_token = null') || textLower.includes('gbp_oauth_refresh_token =  null') || textLower.includes('gbp_oauth_refresh_token = $1 and gbp_oauth_refresh_token = null') || (textLower.includes('gbp_oauth_refresh_token') && textLower.includes('null') && params.length === 1)) {
            const [userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_oauth_refresh_token = null;
                user.gbp_oauth_access_token = null;
                user.gbp_oauth_token_expires_at = null;
                user.gbp_account_id = null;
                user.gbp_location_id = null;
                user.gbp_sync_enabled = false;
                return { rows: [{ id: user.id }] };
            }
            return { rows: [] };
        }
        if (textLower.includes('gbp_oauth_refresh_token = $1') || textLower.includes('gbp_oauth_refresh_token = $2') || textLower.includes('gbp_oauth_refresh_token = $3')) {
            const [refreshVal, accessVal, expiresVal, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_oauth_refresh_token = refreshVal;
                user.gbp_oauth_access_token = accessVal;
                user.gbp_oauth_token_expires_at = expiresVal;
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('gbp_oauth_access_token = $1') && textLower.includes('gbp_oauth_token_expires_at = $2') && !textLower.includes('gbp_oauth_refresh_token')) {
            const [accessVal, expiresVal, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_oauth_access_token = accessVal;
                user.gbp_oauth_token_expires_at = expiresVal;
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('gbp_account_id = $1') || textLower.includes('gbp_location_id = $2') || textLower.includes('gbp_account_id = $2')) {
            const [accountVal, locationVal, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_account_id = accountVal;
                user.gbp_location_id = locationVal;
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('gbp_sync_enabled = $1') && textLower.includes('gbp_place_id = $2')) {
            const [gbpSyncEnabled, gbpPlaceId, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_sync_enabled = gbpSyncEnabled;
                user.gbp_place_id = gbpPlaceId;
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('gbp_last_synced_at = current_timestamp')) {
            const [userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.gbp_last_synced_at = new Date();
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('announcement_text = $1')) {
            const [text, type, coupon, expiresAt, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.announcement_text = text;
                user.announcement_type = type;
                user.announcement_coupon_code = coupon;
                user.announcement_expires_at = expiresAt;
                user.announcement_updated_at = new Date();
                return { rows: [user] };
            }
            return { rows: [] };
        }
        if (textLower.includes('widget_css = $1')) {
            const [widgetCss, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.widget_css = widgetCss;
                return { rows: [{ id: user.id }] };
            }
            return { rows: [] };
        }
        if (textLower.includes('business_profile = $1')) {
            const [businessProfile, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.business_profile = typeof businessProfile === 'string' ? JSON.parse(businessProfile) : businessProfile;
                return { rows: [{ id: user.id }] };
            }
            return { rows: [] };
        }

        if (textLower.includes('logo_url = $1') && textLower.includes('primary_color = $2')) {
            const [logoUrl, primaryColor, agencyId] = params;
            const user = mockUsers.find(u => u.id.toString() === agencyId.toString() && u.is_agency === true);
            if (user) {
                user.logo_url = logoUrl;
                user.primary_color = primaryColor;
                return { rows: [{ id: user.id }] };
            }
            return { rows: [] };
        }
        if (textLower.includes('credits = credits + $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = (user.credits || 0) + amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('credits = credits - $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = (user.credits || 0) - amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('credits = $1')) {
            const [amount, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.credits = amount;
                return { rows: [{ credits: user.credits }] };
            }
        }
        if (textLower.includes('password_hash = $1') && textLower.includes('email = $2')) {
            const [passwordHash, email] = params;
            const user = mockUsers.find(u => u.email === email);
            if (user) {
                user.password_hash = passwordHash;
                user.hashed_password = passwordHash;
                user.passwordHash = passwordHash;
                return { rows: [user] };
            }
        }
        if (textLower.includes('custom_domain = $1') && textLower.includes('custom_domain_redirect = $2')) {
            const [customDomain, customDomainRedirect, userId] = params;
            const user = mockUsers.find(u => u.id.toString() === userId.toString());
            if (user) {
                user.custom_domain = customDomain;
                user.custom_domain_redirect = customDomainRedirect;
                return { rows: [user] };
            }
        }
        if (textLower.includes('webhook_url = $1') && textLower.includes('webhook_enabled = $2')) {
            if (textLower.includes('weekly_report_enabled = $11')) {
                const [webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, googleReviewLink, facebookReviewLink, yelpReviewLink, googleVerificationCode, weeklyReportEnabled, userId] = params;
                const user = mockUsers.find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.webhook_url = webhookUrl;
                    user.webhook_enabled = webhookEnabled;
                    user.ga_tracking_id = gaTrackingId;
                    user.fb_pixel_id = fbPixelId;
                    user.sms_enabled = smsEnabled;
                    user.sms_phone = smsPhone;
                    user.google_review_link = googleReviewLink;
                    user.facebook_review_link = facebookReviewLink;
                    user.yelp_review_link = yelpReviewLink;
                    user.google_verification_code = googleVerificationCode;
                    user.weekly_report_enabled = weeklyReportEnabled;
                    return { rows: [user] };
                }
            } else if (textLower.includes('google_verification_code = $10')) {
                const [webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, googleReviewLink, facebookReviewLink, yelpReviewLink, googleVerificationCode, userId] = params;
                const user = mockUsers.find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.webhook_url = webhookUrl;
                    user.webhook_enabled = webhookEnabled;
                    user.ga_tracking_id = gaTrackingId;
                    user.fb_pixel_id = fbPixelId;
                    user.sms_enabled = smsEnabled;
                    user.sms_phone = smsPhone;
                    user.google_review_link = googleReviewLink;
                    user.facebook_review_link = facebookReviewLink;
                    user.yelp_review_link = yelpReviewLink;
                    user.google_verification_code = googleVerificationCode;
                    return { rows: [user] };
                }
            } else if (textLower.includes('google_review_link = $7')) {
                const [webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, googleReviewLink, facebookReviewLink, yelpReviewLink, userId] = params;
                const user = mockUsers.find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.webhook_url = webhookUrl;
                    user.webhook_enabled = webhookEnabled;
                    user.ga_tracking_id = gaTrackingId;
                    user.fb_pixel_id = fbPixelId;
                    user.sms_enabled = smsEnabled;
                    user.sms_phone = smsPhone;
                    user.google_review_link = googleReviewLink;
                    user.facebook_review_link = facebookReviewLink;
                    user.yelp_review_link = yelpReviewLink;
                    return { rows: [user] };
                }
            } else if (textLower.includes('sms_enabled = $5')) {
                const [webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, smsEnabled, smsPhone, userId] = params;
                const user = mockUsers.find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.webhook_url = webhookUrl;
                    user.webhook_enabled = webhookEnabled;
                    user.ga_tracking_id = gaTrackingId;
                    user.fb_pixel_id = fbPixelId;
                    user.sms_enabled = smsEnabled;
                    user.sms_phone = smsPhone;
                    return { rows: [user] };
                }
            } else {
                const [webhookUrl, webhookEnabled, gaTrackingId, fbPixelId, userId] = params;
                const user = mockUsers.find(u => u.id.toString() === userId.toString());
                if (user) {
                    user.webhook_url = webhookUrl;
                    user.webhook_enabled = webhookEnabled;
                    user.ga_tracking_id = gaTrackingId;
                    user.fb_pixel_id = fbPixelId;
                    return { rows: [user] };
                }
            }
        }
        if (textLower.includes('update leads')) {
            if (textLower.includes('last_followup_step = $1')) {
                const [step, at, id] = params;
                const lead = mockLeads.find(l => l.id.toString() === id.toString());
                if (lead) {
                    lead.last_followup_step = step;
                    lead.last_followup_at = at;
                    return { rows: [lead] };
                }
            }
        }
    }

    if (textLower.includes('update keyword_rankings')) {
        if (textLower.includes('rank = $1') && textLower.includes('previous_rank = $2')) {
            const [rank, prevRank, id] = params;
            const ranking = mockKeywordRankings.find(r => r.id?.toString() === id?.toString());
            if (ranking) {
                ranking.rank = rank;
                ranking.previous_rank = prevRank;
                ranking.last_checked = new Date();
                return { rows: [ranking] };
            }
        }
    }

    if (textLower.includes('update seo_pages')) {
        if (textLower.includes('where id = $17') || textLower.includes('where id = $16') || textLower.includes('where id = $13') || textLower.includes('where id = $12')) {
            let id, content, business_name, service, town, zip_code, telephone, price_range, opening_hours, enable_ai_copy, ai_style, ai_keywords, primary_color, service_radius, latitude, longitude, faqs;
            
            if (textLower.includes('where id = $17')) {
                [
                    content,
                    business_name,
                    service,
                    town,
                    zip_code,
                    telephone,
                    price_range,
                    opening_hours,
                    enable_ai_copy,
                    ai_style,
                    ai_keywords,
                    primary_color,
                    service_radius,
                    latitude,
                    longitude,
                    faqs,
                    id
                ] = params;
            } else if (textLower.includes('where id = $16')) {
                [
                    content,
                    business_name,
                    service,
                    town,
                    zip_code,
                    telephone,
                    price_range,
                    opening_hours,
                    enable_ai_copy,
                    ai_style,
                    ai_keywords,
                    primary_color,
                    service_radius,
                    latitude,
                    longitude,
                    id
                ] = params;
            } else {
                const [
                    p_content,
                    p_business_name,
                    p_service,
                    p_town,
                    p_zip_code,
                    p_telephone,
                    p_price_range,
                    p_opening_hours,
                    p_enable_ai_copy,
                    p_ai_style,
                    p_ai_keywords,
                    p_primary_color_or_id,
                    p_maybe_id
                ] = params;
                content = p_content;
                business_name = p_business_name;
                service = p_service;
                town = p_town;
                zip_code = p_zip_code;
                telephone = p_telephone;
                price_range = p_price_range;
                opening_hours = p_opening_hours;
                enable_ai_copy = p_enable_ai_copy;
                ai_style = p_ai_style;
                ai_keywords = p_ai_keywords;
                id = p_maybe_id || p_primary_color_or_id;
                primary_color = p_maybe_id ? p_primary_color_or_id : null;
            }
            
            const page = mockSeoPages.find(p => p.id === id);
            if (page) {
                page.content = content;
                page.business_name = business_name;
                page.service = service;
                page.town = town;
                page.zip_code = zip_code;
                page.telephone = telephone;
                page.price_range = price_range;
                page.opening_hours = opening_hours;
                page.enable_ai_copy = enable_ai_copy;
                page.ai_style = ai_style;
                page.ai_keywords = ai_keywords;
                if (primary_color) {
                    page.primary_color = primary_color;
                }
                if (faqs !== undefined) {
                    page.faqs = faqs;
                }
                if (service_radius !== undefined) page.service_radius = service_radius;
                if (latitude !== undefined) page.latitude = latitude;
                if (longitude !== undefined) page.longitude = longitude;
                page.updated_at = new Date();
                return { rows: [page] };
            }
        }
    }

    if (textLower.includes('delete from keyword_rankings')) {
        if (textLower.includes('where id = $1')) {
            const id = params[0]?.toString();
            const idx = mockKeywordRankings.findIndex(r => r.id?.toString() === id);
            if (idx !== -1) {
                mockKeywordRankings.splice(idx, 1);
            }
            return { rows: [] };
        }
    }

    // 4. DELETE query
    if (textLower.includes('delete from seo_pages')) {
        if (textLower.includes('where id = $1')) {
            const id = params[0];
            const idx = mockSeoPages.findIndex(p => p.id === id);
            if (idx !== -1) {
                mockSeoPages.splice(idx, 1);
            }
            return { rows: [] };
        }
        if (textLower.includes('where user_id = $1')) {
            const userId = params[0]?.toString();
            for (let i = mockSeoPages.length - 1; i >= 0; i--) {
                if (mockSeoPages[i].user_id?.toString() === userId) {
                    mockSeoPages.splice(i, 1);
                }
            }
            return { rows: [] };
        }
    }

    if (textLower.includes('delete from testimonials')) {
        if (textLower.includes('where id = $1 and user_id = $2') || textLower.includes('where id = $1')) {
            const id = params[0]?.toString();
            const idx = mockTestimonials.findIndex(t => t.id?.toString() === id);
            if (idx !== -1) {
                mockTestimonials.splice(idx, 1);
            }
            return { rows: [] };
        }
    }

    // Default mock behavior
    return { rows: [] };
};

export const mockQuery = async (text, params) => {
    if (queryDelegate) {
        return queryDelegate(text, params);
    }
    return originalMockQuery(text, params);
};

export const getMockUsers = () => {
    return mockUsers;
};

export const addMockUser = (user) => {
    mockUsers.push(user);
};

export const clearMockUsers = () => {
    mockUsers.length = 0;
    mockSeoPages.length = 0;
    mockTestimonials.length = 0;
    mockLeads.length = 0;
    mockKeywordRankings.length = 0;
    nextId = 1;
};

// Mock the bcrypt hash function since it's used in signup.js
export const mockBcrypt = {
    hash: (password, saltRounds) => Promise.resolve(`mock-hashed-${password}`),
    compare: (password, hashedPassword) => Promise.resolve(hashedPassword === `mock-hashed-${password}`),
};

export const query = mockQuery;

export const pool = {
    connect: async () => ({
        query: mockQuery,
        release: () => {},
    }),
};
