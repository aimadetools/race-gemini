import { jest } from '@jest/globals';

import handler from '../../api/widget.js';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('Embeddable Service Area Widget API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'GET',
            query: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn(),
        };

        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(null);
    });

    test('should return 405 for non-GET methods', async () => {
        req.method = 'POST';
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    test('should return JS comment if clientId is missing', async () => {
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Missing clientId'));
    });

    test('should return JS comment if clientId is not a valid number', async () => {
        req.query.clientId = 'abc';
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Invalid clientId'));
    });

    test('should return JS comment if client profile is not found in DB', async () => {
        req.query.clientId = '999';
        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [] }; // User not found
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Client profile not found'));
    });

    test('should return JS comment if client has no pages generated', async () => {
        req.query.clientId = '123';
        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null }] };
            }
            if (text.includes('SELECT service, town')) {
                return { rows: [] }; // No pages found
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining('No pages generated yet'));
    });

    test('should return 200 and custom JS script when client has pages and custom configurations', async () => {
        req.query.clientId = '123';
        req.query.theme = 'dark';
        req.query.layout = 'grid';
        req.query.color = 'ff5500';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: 'seo.mybusiness.com', primary_color: '#ff5500' }] };
            }
            if (text.includes('SELECT service, town')) {
                return { rows: [
                    { service: 'Plumbing', town: 'London', file_name: 'plumbing-in-london-plumbers.html' },
                    { service: 'Heating', town: 'Paris', file_name: 'heating-in-paris-plumbers.html' }
                ] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        
        // Assert the returned JS code contains the correct configurations and data
        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('theme = "dark"');
        expect(sentContent).toContain('layout = "grid"');
        expect(sentContent).toContain('baseColor = "#ff5500"');
        expect(sentContent).toContain('customDomain = "seo.mybusiness.com"');
        expect(sentContent).toContain('referralCode = "ref123"');
        expect(sentContent).toContain('Plumbing');
        expect(sentContent).toContain('Paris');
    });

    test('should include widgetCss in the generated script when present in user profile', async () => {
        req.query.clientId = '123';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null, widget_css: '.custom-class { color: magenta; }' }] };
            }
            if (text.includes('SELECT service, town')) {
                return { rows: [
                    { service: 'Plumbing', town: 'London', file_name: 'plumbing-in-london-plumbers.html' }
                ] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);
        
        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('widgetCss = ".custom-class { color: magenta; }"');
        expect(sentContent).toContain('styles + \'\\n\' + widgetCss');
    });

    test('should return reviews widget with fallback reviews if client has no testimonials', async () => {
        req.query.clientId = '123';
        req.query.type = 'reviews';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null, google_review_link: 'https://g.page/mybiz' }] };
            }
            if (text.includes('SELECT author_name, rating')) {
                return { rows: [] }; // No testimonials found
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);

        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('__localseoReviewsLoaded_123');
        expect(sentContent).toContain('James Anderson'); // from fallback reviews
        expect(sentContent).toContain('Sarah Miller');
        expect(sentContent).toContain('averageRating = 5'); // 5.0 rating for mock fallback reviews
        expect(sentContent).toContain('reviewLink = "https://g.page/mybiz"');
    });

    test('should return reviews widget with client reviews and calculate average rating correctly', async () => {
        req.query.clientId = '123';
        req.query.type = 'reviews';
        req.query.layout = 'grid';
        req.query.theme = 'dark';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: 'reviews.mybiz.com', primary_color: '#ffaa00', google_review_link: 'https://g.page/mybiz' }] };
            }
            if (text.includes('SELECT author_name, rating')) {
                return { rows: [
                    { author_name: 'John Doe', rating: 4, review_text: 'Good job', review_date: '2026-06-15T00:00:00.000Z', author_avatar: 'avatar1.png' },
                    { author_name: 'Jane Smith', rating: 5, review_text: 'Amazing', review_date: '2026-06-16T00:00:00.000Z', author_avatar: null }
                ] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);

        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('theme = "dark"');
        expect(sentContent).toContain('layout = "grid"');
        expect(sentContent).toContain('baseColor = "#ffaa00"');
        expect(sentContent).toContain('averageRating = 4.5'); // (4 + 5) / 2 = 4.5
        expect(sentContent).toContain('John Doe');
        expect(sentContent).toContain('Jane Smith');
        expect(sentContent).toContain('Good job');
        expect(sentContent).toContain('avatar1.png');
    });

    test('should return reviews widget with carousel layout when layout is not badge or grid', async () => {
        req.query.clientId = '123';
        req.query.type = 'reviews';
        req.query.layout = 'carousel';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null }] };
            }
            if (text.includes('SELECT author_name, rating')) {
                return { rows: [
                    { author_name: 'John Doe', rating: 5, review_text: 'Perfect', review_date: '2026-06-15T00:00:00.000Z', author_avatar: null }
                ] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);

        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('layout = "carousel"');
        expect(sentContent).toContain('ll-carousel-wrapper');
        expect(sentContent).toContain('ll-carousel-track');
    });

    test('should return lead-gen widget when type is lead-gen', async () => {
        req.query.clientId = '123';
        req.query.type = 'lead-gen';
        req.query.theme = 'glassmorphic';

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null, email: 'agency@leads.com', agency_slug: 'test-agency' }] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);

        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('theme = "glassmorphic"');
        expect(sentContent).toContain('clientId = 123');
        expect(sentContent).toContain('agencyEmail = "agency@leads.com"');
        expect(sentContent).toContain('Free Local Search Audit');
        expect(sentContent).toContain('ll-leadgen-container');
    });

    test('should return business-card widget when type is business-card', async () => {
        req.query.clientId = '123';
        req.query.type = 'business-card';
        req.query.theme = 'light';
        req.query.color = '00ff00';
        req.query.font = 'outfit';

        const mockProfile = {
            name: 'ACME Plumbers',
            type: 'Plumber',
            phone: '555-1234',
            email: 'acme@plumbers.com',
            description: 'Best plumbers in town',
            address: {
                streetAddress: '123 Main St',
                addressLocality: 'Austin',
                addressRegion: 'TX',
                postalCode: '78701',
                addressCountry: 'US'
            },
            hours: ['Mo-Fr 08:00-17:00']
        };

        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT referral_code')) {
                return { rows: [{ referral_code: 'ref123', custom_domain: null, primary_color: null, name: 'ACME Corp', google_review_link: 'https://g.page/acme', email: 'corp@acme.com', business_profile: mockProfile, phone: '555-1111' }] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/javascript; charset=utf-8');
        expect(res.status).toHaveBeenCalledWith(200);

        const sentContent = res.send.mock.calls[0][0];
        expect(sentContent).toContain('theme = "light"');
        expect(sentContent).toContain('baseColor = "#00ff00"');
        expect(sentContent).toContain('__localseoCardLoaded_123');
        expect(sentContent).toContain('ACME Plumbers');
        expect(sentContent).toContain('acme@plumbers.com');
        expect(sentContent).toContain('123 Main St');
        expect(sentContent).toContain('Mo-Fr 08:00-17:00');
        expect(sentContent).toContain('Powered by');
        expect(sentContent).toContain("font-family: 'Outfit', system-ui, -apple-system, sans-serif;");
        expect(sentContent).toContain('family=Outfit');
    });
});
