import { jest } from '@jest/globals';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('cookie', () => ({
  parse: jest.fn(),
}));

import handler from '../../api/testimonials.js';
import jwt from 'jsonwebtoken';
import { parse as parseCookie } from 'cookie';
import { clearMockUsers, getMockTestimonials, addMockTestimonial } from '../../db/mockDb.js';

describe('Testimonials API', () => {
    let req;
    let res;

    beforeEach(() => {
        req = {
            method: 'GET',
            headers: {},
            body: {}
        };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn(),
        };

        jest.clearAllMocks();
        clearMockUsers();
        process.env.JWT_SECRET = 'test_secret';
    });

    afterEach(() => {
        delete process.env.JWT_SECRET;
    });

    test('should return 401 if no token is provided', async () => {
        parseCookie.mockReturnValue({});
        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Not authenticated' });
    });

    test('should return 401 if token is invalid or expired', async () => {
        parseCookie.mockReturnValue({ authToken: 'invalid_token' });
        jwt.verify.mockImplementation(() => { throw new Error('invalid token'); });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    });

    test('should return 200 and list testimonials on GET', async () => {
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        
        addMockTestimonial({
            id: 't_1',
            user_id: 1,
            author_name: 'John Doe',
            author_avatar: null,
            rating: 5,
            review_text: 'Excellent plumbing service!',
            review_date: new Date()
        });

        addMockTestimonial({
            id: 't_2',
            user_id: 2, // different user
            author_name: 'Jane Smith',
            author_avatar: null,
            rating: 4,
            review_text: 'Pretty good!',
            review_date: new Date()
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.testimonials).toHaveLength(1);
        expect(responseData.testimonials[0].author_name).toBe('John Doe');
    });

    test('should return 400 on POST if required fields are missing', async () => {
        req.method = 'POST';
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = { authorName: 'John Doe' }; // missing rating and reviewText

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Author name, rating, and review text are required.' });
    });

    test('should return 400 on POST if rating is invalid', async () => {
        req.method = 'POST';
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = { authorName: 'John Doe', rating: 6, reviewText: 'Great!' }; // invalid rating

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Rating must be an integer between 1 and 5.' });
    });

    test('should return 201 and create testimonial on POST', async () => {
        req.method = 'POST';
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = {
            authorName: 'John Doe',
            rating: 5,
            reviewText: 'Super friendly team!',
            authorAvatar: 'base64_data_here'
        };

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        const responseData = res.json.mock.calls[0][0];
        expect(responseData.message).toBe('Testimonial added successfully');
        expect(responseData.testimonial.author_name).toBe('John Doe');
        expect(responseData.testimonial.rating).toBe(5);
        expect(responseData.testimonial.review_text).toBe('Super friendly team!');
        expect(responseData.testimonial.author_avatar).toBe('base64_data_here');
        
        expect(getMockTestimonials()).toHaveLength(1);
    });

    test('should return 400 on DELETE if no id is provided', async () => {
        req.method = 'DELETE';
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = {};

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Testimonial ID is required.' });
    });

    test('should return 200 on DELETE if testimonial is successfully deleted', async () => {
        req.method = 'DELETE';
        parseCookie.mockReturnValue({ authToken: 'valid_token' });
        jwt.verify.mockReturnValue({ userId: 1 });
        req.body = { id: 't_1' };

        addMockTestimonial({
            id: 't_1',
            user_id: 1,
            author_name: 'John Doe',
            rating: 5,
            review_text: 'Excellent!'
        });

        await handler(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ message: 'Testimonial deleted successfully' });
        expect(getMockTestimonials()).toHaveLength(0);
    });
});
