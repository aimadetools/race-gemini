import { kv } from '@vercel/kv';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 32);

export default async function (request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { email } = request.body;

    if (!email) {
        return response.status(400).json({ message: 'Email is required.' });
    }

    try {
        const user = await kv.get(`user:${email}`);

        // Prevent user enumeration by always sending a generic success message
        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        }

        const resetToken = nanoid();
        const resetTokenExpiry = Date.now() + 3600000; // 1 hour from now

        await kv.set(`password-reset:${resetToken}`, { email, expiry: resetTokenExpiry }, { ex: 3600 }); // Store for 1 hour

        // In a real application, you would send an email with this link
        // For now, we'll log it to the console
        const resetLink = `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}/reset-password.html?token=${resetToken}`;
        console.log(`Password reset link for ${email}: ${resetLink}`);

        return response.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });

    } catch (error) {
        console.error('Error during forgot password request:', error);
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
