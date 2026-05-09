import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';
const { logError } = require('../../lib/logger');

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32);

export default async function (request, response, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email } = request.body;

    if (!email) {
        await logError(new Error('Email is required.'), 'Forgot Password Request - Validation Error', 'forgot_password_request_error.log');
        return response.status(400).json({ message: 'Email is required.' });
    }

    try {
        const user = await currentKv.get(`user:${email}`);

        // Prevent user enumeration by always sending a generic success message
        if (!user) {
            await logError(null, `Password reset requested for non-existent email: ${email}`, 'forgot_password_request_error.log');
            return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = nanoid();
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        await currentKv.set(`password-reset:${resetToken}`, { email, expiry: resetTokenExpiry }, { ex: 3600 }); // Store for 1 hour

        // In a real application, you would send an email with this link
        // CRITICAL SECURITY FIX: Do not log reset link to console.
        const resetLink = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/reset-password.html?token=${resetToken}`;
        await logError(null, `Password reset link generated for ${email}. Link: ${resetLink} (should be emailed)`, 'forgot_password_request_error.log');

        return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        await logError(error, 'Forgot Password Request - General Error', 'forgot_password_request_error.log');
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
