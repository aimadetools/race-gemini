import { query } from '../db/index.js';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';
import archiver from 'archiver';
import fs from 'fs';
import path from 'path';
import { logError } from '../lib/logger.js';

export default async (req, res) => {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const cookies = parse(req.headers.cookie || '');
        const token = cookies.authToken;

        if (!token) {
            return res.status(401).json({ message: 'Not authenticated. Please log in.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            await logError(error, 'JWT Verification Error in WP Plugin download', 'wp_download_error.log');
            return res.status(401).json({ message: 'Invalid or expired token. Please log in again.' });
        }

        const userId = decoded.userId;

        // Verify the user exists in PostgreSQL
        const userResult = await query('SELECT id, email FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User profile not found. Please log in again.' });
        }

        const phpTemplatePath = path.join(process.cwd(), 'templates', 'localleads-seo.php.template');
        const readmeTemplatePath = path.join(process.cwd(), 'templates', 'readme.txt.template');

        let phpContent;
        let readmeContent;

        try {
            phpContent = fs.readFileSync(phpTemplatePath, 'utf8');
            readmeContent = fs.readFileSync(readmeTemplatePath, 'utf8');
        } catch (error) {
            await logError(error, 'Error reading WordPress template files', 'wp_download_error.log');
            return res.status(500).json({ message: 'Error loading WordPress plugin templates.' });
        }

        // Replace the Client ID in the template
        const customPhpContent = phpContent.replace(/%%CLIENT_ID%%/g, userId);

        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename="localleads-seo.zip"'
        });

        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        archive.pipe(res);

        // Append the plugin files inside a directory named 'localleads-seo'
        archive.append(customPhpContent, { name: 'localleads-seo/localleads-seo.php' });
        archive.append(readmeContent, { name: 'localleads-seo/readme.txt' });

        await archive.finalize();

    } catch (error) {
        await logError(error, 'General error in WP Plugin download endpoint', 'wp_download_error.log');
        if (!res.headersSent) {
            return res.status(500).json({ message: 'Internal Server Error' });
        }
    }
};
