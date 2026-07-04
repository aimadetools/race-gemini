import { describe, it, expect } from '@jest/globals';

// The mathematical calculation logic used in js/review-calculator.js
function calculateReviews(currentRating, currentReviews, targetRating) {
    if (targetRating <= currentRating) return 0;
    
    let rawNeeded;
    if (targetRating >= 5.0) {
        // Google rounds ratings to nearest 0.1, so a 4.95 rounds up to 5.0
        const tCalc = 4.95;
        if (currentRating >= tCalc) return 0;
        rawNeeded = currentReviews * (tCalc - currentRating) / (5.0 - tCalc);
    } else {
        rawNeeded = currentReviews * (targetRating - currentRating) / (5.0 - targetRating);
    }
    return Math.ceil(Math.round(rawNeeded * 1e9) / 1e9);
}

describe('Google Review Calculator Logic', () => {
    it('should return 0 if target rating is less than or equal to current rating', () => {
        expect(calculateReviews(4.5, 10, 4.5)).toBe(0);
        expect(calculateReviews(4.5, 10, 4.0)).toBe(0);
    });

    it('should correctly calculate reviews needed for normal targets (under 5.0)', () => {
        // R=20, A=4.5, T=4.8. Needed: 20 * (4.8 - 4.5) / (5 - 4.8) = 20 * 0.3 / 0.2 = 30 reviews
        expect(calculateReviews(4.5, 20, 4.8)).toBe(30);

        // R=15, A=3.5, T=4.5. Needed: 15 * (4.5 - 3.5) / (5 - 4.5) = 15 * 1.0 / 0.5 = 30 reviews
        expect(calculateReviews(3.5, 15, 4.5)).toBe(30);

        // R=10, A=4.8, T=4.9. Needed: 10 * (4.9 - 4.8) / (5 - 4.9) = 10 * 0.1 / 0.1 = 10 reviews
        expect(calculateReviews(4.8, 10, 4.9)).toBe(10);
    });

    it('should correctly calculate reviews needed to display a 5.0 rating using Google rounding threshold (4.95)', () => {
        // R=10, A=4.0, T=5.0. Needed: 10 * (4.95 - 4.0) / (5 - 4.95) = 10 * 0.95 / 0.05 = 190 reviews
        expect(calculateReviews(4.0, 10, 5.0)).toBe(190);

        // R=1, A=1.0, T=5.0. Needed: 1 * (4.95 - 1) / 0.05 = 79 reviews
        expect(calculateReviews(1.0, 1, 5.0)).toBe(79);
    });
});
