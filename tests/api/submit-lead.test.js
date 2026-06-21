import { jest } from '@jest/globals';
import handler from '../../api/submit-lead.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';
import { sendEmail } from '../../lib/email.js';

// Mock the email sending library
jest.mock('../../lib/email.js', () => ({
    sendEmail: jest.fn().mockResolvedValue(true)
}));

const mockQuery = jest.fn();

describe('Submit Lead API', () => {
    let mockReq;
    let mockRes;
    let mockKv;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

        mockReq = {
            method: 'POST',
            body: {
                pageId: 'page:12345',
                name: 'Jane Doe',
                email: 'jane@example.com',
                phone: '123-456-7890',
                message: 'Hello, I want a quote.',
                url: 'http://localhost:3000/123/plumbing-in-springfield.html'
            },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            setHeader: jest.fn().mockReturnThis(),
        };

        mockKv = {
            get: jest.fn(),
            lrange: jest.fn()
        };
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    it('should return 405 for non-POST requests', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(405);
    });

    it('should return 400 if required fields are missing', async () => {
        mockReq.body = { name: 'Jane Doe', email: 'jane@example.com' }; // missing pageId
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: expect.stringContaining('Missing required fields')
        }));
    });

    it('should return 400 for invalid email formats', async () => {
        mockReq.body.email = 'not-a-valid-email';
        await handler(mockReq, mockRes, mockKv);
        expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should successfully store lead and send full details to paid user', async () => {
        // Mock SQL responses
        // 1. Fetch page owner metadata
        mockQuery.mockResolvedValueOnce({
            rows: [{
                user_id: 123,
                business_name: 'Super Plumbing',
                service: 'plumbing',
                town: 'springfield'
            }]
        });
        // 2. Insert lead (returns lead ID)
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 456 }] });
        // 3. Fetch user owner profile (email, is_agency, subscription_status)
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'owner@example.com',
                is_agency: true,
                subscription_status: 'active'
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        // Verify lead insertion query (it's the 2nd call now)
        expect(mockQuery).toHaveBeenNthCalledWith(2,
            expect.stringContaining('INSERT INTO leads'),
            ['Jane Doe', 'jane@example.com', '123-456-7890', 'Hello, I want a quote.', 123, 'page:12345', 'http://localhost:3000/123/plumbing-in-springfield.html', 'landing_page', null]
        );

        // Verify full email details sent
        expect(sendEmail).toHaveBeenCalledWith(
            'owner@example.com',
            expect.stringContaining('New Lead'),
            expect.stringContaining('jane@example.com') // Full email visible
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Lead submitted successfully.' });
    });

    it('should successfully store lead and send obscured details to unpaid/trial user', async () => {
        // Mock SQL responses
        // 1. Fetch page owner metadata
        mockQuery.mockResolvedValueOnce({
            rows: [{
                user_id: 789,
                business_name: 'Budget Plumbing',
                service: 'plumbing',
                town: 'springfield'
            }]
        });
        // 2. Insert lead (returns lead ID)
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 457 }] });
        // 3. User profile: not agency, inactive subscription
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'trial-owner@example.com',
                is_agency: false,
                subscription_status: 'inactive'
            }]
        });

        // Mock KV transactions log: empty (no purchases)
        mockKv.lrange.mockResolvedValue([]);

        await handler(mockReq, mockRes, mockKv);

        // Verify obscured email and phone in sent notification
        expect(sendEmail).toHaveBeenCalledWith(
            'trial-owner@example.com',
            expect.stringContaining('New Lead'),
            expect.stringContaining('j***@example.com') // Obscured email
        );
        expect(sendEmail).toHaveBeenCalledWith(
            'trial-owner@example.com',
            expect.stringContaining('New Lead'),
            expect.stringContaining('***-***-7890') // Obscured phone
        );
        expect(sendEmail).toHaveBeenCalledWith(
            'trial-owner@example.com',
            expect.stringContaining('New Lead'),
            expect.stringContaining('Upgrade & Unlock Lead Now') // Upsell button
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should trigger webhook when paid user has enabled webhooks', async () => {
        const originalFetch = globalThis.fetch;
        globalThis.fetch = jest.fn().mockImplementation(() => Promise.resolve({ ok: true }));

        // Mock SQL responses
        // 1. Fetch page owner metadata
        mockQuery.mockResolvedValueOnce({
            rows: [{
                user_id: 123,
                business_name: 'Super Plumbing',
                service: 'plumbing',
                town: 'springfield'
            }]
        });
        // 2. Insert lead (returns lead ID)
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 456 }] });
        // 3. Fetch user owner profile with webhook_url and webhook_enabled
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'owner@example.com',
                is_agency: true,
                subscription_status: 'active',
                webhook_url: 'https://hooks.zapier.com/hooks/catch/123/456',
                webhook_enabled: true
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        // Verify webhook was called with proper payload
        expect(globalThis.fetch).toHaveBeenCalledWith(
            'https://hooks.zapier.com/hooks/catch/123/456',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                }),
                body: expect.stringContaining('"event":"lead.captured"')
            })
        );

        // Restore original fetch
        globalThis.fetch = originalFetch;
    });

    it('should successfully store directory lead for unclaimed agency directory profile', async () => {
        mockReq.body = {
            name: 'Directory prospect',
            email: 'prospect@example.com',
            message: 'Need marketing help',
            agencyDirectoryId: '55',
        };

        // 1. Fetch agency directory details (returns unclaimed)
        mockQuery.mockResolvedValueOnce({
            rows: [{
                claimed_user_id: null,
                name: 'Unclaimed SEO',
                city: 'Miami',
            }]
        });
        // 2. Insert lead
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 700 }] });
        // 3. User check query (will return empty because userId is null)
        mockQuery.mockResolvedValueOnce({ rows: [] });

        await handler(mockReq, mockRes, mockKv);

        expect(mockQuery).toHaveBeenNthCalledWith(1,
            expect.stringContaining('SELECT claimed_user_id, name, city FROM agency_directory WHERE id = $1'),
            [55]
        );
        expect(mockQuery).toHaveBeenNthCalledWith(2,
            expect.stringContaining('INSERT INTO leads'),
            ['Directory prospect', 'prospect@example.com', null, 'Need marketing help', null, null, null, 'agency_profile', 55]
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Lead submitted successfully.' });
    });

    it('should successfully store directory lead for claimed agency directory profile and notify owner', async () => {
        mockReq.body = {
            name: 'Directory prospect 2',
            email: 'prospect2@example.com',
            message: 'Need B2B local SEO',
            agencyDirectoryId: '56',
        };

        // 1. Fetch agency directory details (returns claimed user id 888)
        mockQuery.mockResolvedValueOnce({
            rows: [{
                claimed_user_id: 888,
                name: 'Claimed SEO Inc',
                city: 'Dallas',
            }]
        });
        // 2. Insert lead
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 701 }] });
        // 3. Fetch user owner profile
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'owner-texas@example.com',
                is_agency: true,
                subscription_status: 'active',
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        expect(mockQuery).toHaveBeenNthCalledWith(1,
            expect.stringContaining('SELECT claimed_user_id, name, city FROM agency_directory WHERE id = $1'),
            [56]
        );
        expect(mockQuery).toHaveBeenNthCalledWith(2,
            expect.stringContaining('INSERT INTO leads'),
            ['Directory prospect 2', 'prospect2@example.com', null, 'Need B2B local SEO', 888, null, null, 'agency_profile', 56]
        );
        expect(mockQuery).toHaveBeenNthCalledWith(3,
            expect.stringContaining('SELECT email, is_agency, subscription_status, webhook_url, webhook_enabled, sms_enabled, sms_phone FROM users WHERE id = $1'),
            [888]
        );

        expect(sendEmail).toHaveBeenCalledWith(
            'owner-texas@example.com',
            expect.stringContaining('New Lead'),
            expect.stringContaining('prospect2@example.com')
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should send auto-responder email to lead when auto-responder is enabled for paid user', async () => {
        // Mock SQL responses
        // 1. Fetch page owner metadata
        mockQuery.mockResolvedValueOnce({
            rows: [{
                user_id: 123,
                business_name: 'Super Plumbing',
                service: 'plumbing',
                town: 'springfield'
            }]
        });
        // 2. Insert lead (returns lead ID)
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 456 }] });
        // 3. Fetch user owner profile with auto-responder fields enabled
        mockQuery.mockResolvedValueOnce({
            rows: [{
                email: 'owner@example.com',
                is_agency: true,
                subscription_status: 'active',
                auto_responder_enabled: true,
                auto_responder_subject: 'Thanks for writing, {{lead_name}}!',
                auto_responder_message: 'Hi {{lead_name}},\nWe will help you with {{service}} in {{town}}.'
            }]
        });

        await handler(mockReq, mockRes, mockKv);

        // Verify two sendEmail calls: one to owner, one to lead
        expect(sendEmail).toHaveBeenCalledTimes(2);

        // First call should be lead details to owner
        expect(sendEmail).toHaveBeenNthCalledWith(1,
            'owner@example.com',
            expect.stringContaining('New Lead'),
            expect.any(String)
        );

        // Second call should be auto-responder to lead (jane@example.com)
        expect(sendEmail).toHaveBeenNthCalledWith(2,
            'jane@example.com',
            'Thanks for writing, Jane Doe!',
            expect.stringContaining('We will help you with plumbing in springfield.')
        );

        expect(mockRes.status).toHaveBeenCalledWith(200);
    });
});
