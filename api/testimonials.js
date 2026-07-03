import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { logError } from '../lib/logger.js';

async function handler(req, res) {
    const cookies = cookie.parse(req.headers.cookie || '');
    let token = cookies.authToken || cookies.token || cookies.auth;

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded.agencyId;
        if (!userId) {
            return res.status(400).json({ message: 'Invalid token payload' });
        }
    } catch (error) {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (req.method === 'GET') {
        try {
            const result = await query(
                'SELECT id, author_name, author_avatar, rating, review_text, review_date, reply_text, reply_date, google_review_id FROM testimonials WHERE user_id = $1 ORDER BY created_at DESC',
                [userId]
            );
            return res.status(200).json({ testimonials: result.rows });
        } catch (error) {
            await logError(error, 'Get Testimonials Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    if (req.method === 'POST') {
        const { authorName, authorAvatar, rating, reviewText, reviewDate, googleReviewId } = req.body;

        if (!authorName || !rating || !reviewText) {
            return res.status(400).json({ message: 'Author name, rating, and review text are required.' });
        }

        const ratingNum = parseInt(rating, 10);
        if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
            return res.status(400).json({ message: 'Rating must be an integer between 1 and 5.' });
        }

        const rDate = reviewDate ? new Date(reviewDate) : new Date();

        try {
            const result = await query(
                'INSERT INTO testimonials (user_id, author_name, author_avatar, rating, review_text, review_date, google_review_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, author_name, author_avatar, rating, review_text, review_date, google_review_id',
                [userId, authorName, authorAvatar || null, ratingNum, reviewText, rDate, googleReviewId || null]
            );
            return res.status(201).json({
                message: 'Testimonial added successfully',
                testimonial: result.rows[0]
            });
        } catch (error) {
            await logError(error, 'Create Testimonial Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    if (req.method === 'DELETE') {
        const { id } = req.body;
        if (!id) {
            return res.status(400).json({ message: 'Testimonial ID is required.' });
        }

        try {
            await query(
                'DELETE FROM testimonials WHERE id = $1 AND user_id = $2',
                [id, userId]
            );
            return res.status(200).json({ message: 'Testimonial deleted successfully' });
        } catch (error) {
            await logError(error, 'Delete Testimonial Error');
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}

export default handler;
