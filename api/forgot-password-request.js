import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';
import { logError } from '../lib/logger.js';
import { query } from '../db/index.js';
import { sendEmail } from '../lib/email.js';

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
        const userResult = await query('SELECT id FROM users WHERE email = $1', [email]);

        // Prevent user enumeration by always sending a generic success message
        if (userResult.rows.length === 0) {
            await logError(null, `Password reset requested for non-existent email: ${email}`, 'forgot_password_request_error.log');
            return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = nanoid();
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        await currentKv.set(`password-reset:${resetToken}`, { email, expiry: resetTokenExpiry }, { ex: 3600 }); // Store for 1 hour

        const resetLink = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/reset-password.html?token=${resetToken}`;
        
        // Send actual password reset email
        const emailSubject = `Reset Your LocalLeads Password`;
        const emailHtml = `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your LocalLeads account.</p>
            <p>Click the link below to reset your password. This link is valid for 1 hour:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <br/>
            <p>If you did not request this, you can ignore this email.</p>
            <p>Best regards,<br/>The LocalLeads Team</p>
        `;
        
        try {
            await sendEmail(email, emailSubject, emailHtml);
            await logError(null, `Password reset link generated for ${email}. Link: ${resetLink} (should be emailed)`, 'forgot_password_request_error.log');
        } catch (emailError) {
            await logError(emailError, `Failed to send password reset email to ${email}`, 'forgot_password_request_error.log');
        }

        return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        await logError(error, 'Forgot Password Request - General Error', 'forgot_password_request_error.log');
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
