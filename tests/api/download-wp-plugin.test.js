import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readFileSync: jest.fn(),
}));

import handler from '../../api/download-wp-plugin';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import fs from 'fs';
import { clearMockUsers, addMockUser, setQueryDelegate } from '../../db/mockDb.js';

describe('Download WP Plugin API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'GET',
            headers: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            writeHead: jest.fn(),
            end: jest.fn(),
        };

        jest.clearAllMocks();
        clearMockUsers();
        setQueryDelegate(null);

        process.env.JWT_SECRET = 'test_secret';
        fs.readFileSync.mockImplementation((filepath) => {
            if (filepath.includes('localleads-seo.php.template')) {
                return '<?php // Client ID: %%CLIENT_ID%%';
            }
            if (filepath.includes('readme.txt.template')) {
                return 'Readme Content';
            }
            throw new Error('File not found');
        });
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    test('should return 405 for non-GET methods', async () => {
        req.method = 'POST';
        await handler(req, res);

        expect(res.setHeader).toHaveBeenCalledWith('Allow', ['GET']);
        expect(res.status).toHaveBeenCalledWith(405);
    });

    test('should return 401 if no token is provided', async () => {
        parseCookie.mockReturnValue({});
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated. Please log in.' });
    });

    test('should return 401 if token is invalid', async () => {
        parseCookie.mockReturnValue({ authToken: 'invalid' });
        jwt.verify.mockImplementation(() => {
            throw new Error('Invalid token');
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('should return 404 if user is not found in database', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid' });
        jwt.verify.mockReturnValue({ userId: 'user-123' });
        setQueryDelegate(async (text, params) => {
            return { rows: [] }; // No user found
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'User profile not found. Please log in again.' });
    });

    test('should return 200 and zip file if user is authenticated and found', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid' });
        jwt.verify.mockReturnValue({ userId: 'user-123' });
        
        // Return user row in DB query
        setQueryDelegate(async (text, params) => {
            if (text.includes('SELECT id, email FROM users')) {
                return { rows: [{ id: 'user-123', email: 'test@example.com' }] };
            }
            return { rows: [] };
        });

        await handler(req, res);

        expect(res.writeHead).toHaveBeenCalledWith(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="localleads-seo.zip"'
        });
    });
});
