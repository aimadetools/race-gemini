import { kv } from '@vercel/kv';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';

export default async function (request, response, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { token, newPassword } = request.body;

    if (!token || !newPassword) {
        return response.status(400).json({ message: 'Token and new password are required.' });
    }

    try {
        let tokenData = await currentKv.get(`password-reset:${token}`);

        if (!tokenData) { // Check if tokenData string itself is null/undefined
            return response.status(400).json({ message: 'Invalid or expired token.' });
        }
        tokenData = JSON.parse(tokenData);

        if (Date.now() > tokenData.expiry) {
            await currentKv.del(`password-reset:${token}`); // Clean up expired token
            return response.status(400).json({ message: 'Invalid or expired token.' });
        }

        const userResult = await query('SELECT id FROM users WHERE email = $1', [tokenData.email]);

        if (userResult.rows.length === 0) {
            await currentKv.del(`password-reset:${token}`); // Invalidate token even if user not found
            return response.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await query('UPDATE users SET password_hash = $1 WHERE email = $2', [hashedPassword, tokenData.email]);
        await currentKv.del(`password-reset:${token}`); // Invalidate token after use

        return response.status(200).json({ message: 'Password reset successfully.' });

    } catch (error) {
        console.error('Error during password reset:', error);
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
