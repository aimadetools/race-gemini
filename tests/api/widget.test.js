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
});
