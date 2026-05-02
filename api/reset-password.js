import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';

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

        const userKey = `user:${tokenData.email}`;
        const userString = await currentKv.get(userKey);


        if (!userString) {
            await currentKv.del(`password-reset:${token}`); // Invalidate token even if user not found
            return response.status(404).json({ message: 'User not found.' });
        }
        const user = JSON.parse(userString);

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;

        await currentKv.set(userKey, JSON.stringify(user));
        await currentKv.del(`password-reset:${token}`); // Invalidate token after use

        return response.status(200).json({ message: 'Password reset successfully.' });

    } catch (error) {
        console.error('Error during password reset:', error);
        return response.status(500).json({ message: 'Internal Server Error' });
    }
}
