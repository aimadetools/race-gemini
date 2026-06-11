import { jest } from '@jest/globals';
import handler from '../../api/capture-email.js';
import { clearMockUsers, setQueryDelegate } from '../../db/mockDb.js';

const mockQuery = jest.fn();

describe('Capture Email API', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(mockQuery);
        mockQuery.mockClear();

        mockReq = {
            method: 'POST',
            body: {
                email: 'lead@example.com',
                url: 'http://localhost:3000/seo-roi-calculator.html'
            },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    afterEach(() => {
        setQueryDelegate(null);
    });

    it('should return 405 for non-POST requests', async () => {
        mockReq.method = 'GET';
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(405);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Only POST requests are allowed.' });
    });

    it('should return 400 if email is missing', async () => {
        mockReq.body = { url: 'http://localhost:3000/seo-roi-calculator.html' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and URL are required.' });
    });

    it('should return 400 if url is missing', async () => {
        mockReq.body = { email: 'lead@example.com' };
        await handler(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Email and URL are required.' });
    });

    it('should successfully store captured email as lead', async () => {
        const mockLead = {
            id: 999,
            email: 'lead@example.com',
            url: 'http://localhost:3000/seo-roi-calculator.html',
            source: 'free-audit'
        };
        mockQuery.mockResolvedValueOnce({ rows: [mockLead] });

        await handler(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO leads'),
            ['lead@example.com', 'http://localhost:3000/seo-roi-calculator.html', 'free-audit']
        );

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Email captured successfully.',
            data: mockLead
        });
    });

    it('should successfully store captured email as lead with userId, name, and source', async () => {
        mockReq.body = {
            email: 'agency_lead@example.com',
            url: 'http://agencyclient.com',
            userId: 123,
            name: 'Client Business Name',
            source: 'audit_widget'
        };

        const mockLead = {
            id: 1000,
            email: 'agency_lead@example.com',
            url: 'http://agencyclient.com',
            source: 'audit_widget',
            user_id: 123,
            name: 'Client Business Name'
        };
        mockQuery.mockResolvedValueOnce({ rows: [mockLead] });

        await handler(mockReq, mockRes);

        expect(mockQuery).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO leads (email, url, source, user_id, name)'),
            ['agency_lead@example.com', 'http://agencyclient.com', 'audit_widget', 123, 'Client Business Name']
        );

        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'Email captured successfully.',
            data: mockLead
        });
    });

    it('should return 500 when database insertion fails', async () => {
        mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

        await handler(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({
            message: 'An error occurred while capturing the email.'
        });
    });
});
