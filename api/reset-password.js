import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';

export default async function (request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    const { token, newPassword } = request.body;

    if (!token || !newPassword) {
        return response.status(400).json({ message: 'Token and new password are required.' });
    }

    try {
        const tokenData = await kv.get(`password-reset:${token}`);

        if (!tokenData) {
            return response.status(400).json({ message: 'Invalid or expired token.' });
        }

        if (Date.now() > tokenData.expiry) {
            await kv.del(`password-reset:${token}`); // Clean up expired token
            return response.status(400).json({ message: 'Invalid or expired token.' });
        }

        const userKey = `user:${tokenData.email}`;
        const user = await kv.get(userKey);

        if (!user) {
            return response.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await kv.set(userKey, user);
        await kv.del(`password-reset:${token}`); // Invalidate token after use

        return response.status(200).json({ message: 'Password reset successfully.' });

    } catch (error) {
        console.error('Error during password reset:', error);
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
