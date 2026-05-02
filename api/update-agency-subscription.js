import { kv } from '@vercel/kv';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';

export default async function handler(request, response, currentKvClient) {
    const currentKv = currentKvClient || kv;
    if (request.method === 'POST') {
        const { newPriceId } = request.body;

        if (!newPriceId) {
            return response.status(400).json({ message: 'New price ID is required.' });
        }

        try {
            const cookies = cookie.parse(request.headers.cookie || '');
            const token = cookies.token;

            if (!token) {
                return response.status(401).json({ message: 'Not authenticated.' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const agencyId = decoded.agencyId;

            if (!agencyId) {
                return response.status(403).json({ message: 'Not an agency account.' });
            }

            const agency = await currentKv.get(`agency:${agencyId}`);
            if (!agency) {
                return response.status(404).json({ message: 'Agency not found.' });
            }

            // --- Payment Provider Integration Placeholder ---
            // In a real application, you would interact with your payment provider (e.g., Stripe) here
            // to update the subscription. This would involve:
            // 1. Retrieving the current subscription ID from agency.subscriptionId
            // 2. Calling Stripe.subscriptions.update(agency.subscriptionId, { items: [{ id: currentItemId, price: newPriceId }] })
            // 3. Handling success/failure from Stripe
            // For this task, we'll simulate the update in KV.

            // Determine new plan details based on newPriceId
            let newPlanName, newMonthlyCredits, newPrice;
            if (newPriceId === 'price_BASIC_AGENCY_PLAN') {
                newPlanName = 'Basic Agency';
                newMonthlyCredits = 100;
                newPrice = 49;
            } else if (newPriceId === 'price_PRO_AGENCY_PLAN') {
                newPlanName = 'Pro Agency';
                newMonthlyCredits = 250;
                newPrice = 99;
            } else {
                return response.status(400).json({ message: 'Invalid plan selected.' });
            }

            // Update agency subscription details in KV
            agency.planName = newPlanName;
            agency.monthlyCredits = newMonthlyCredits;
            agency.subscriptionStatus = 'active'; // Assume successful update
            // For renewalDate and nextInvoiceAmount, a real integration would get these from the payment provider
            // For now, we'll keep existing or set a placeholder.
            // agency.renewalDate = new Date().setMonth(new Date().getMonth() + 1).toISOString(); // Example: next month
            // agency.nextInvoiceAmount = newPrice;

            await currentKv.set(`agency:${agencyId}`, agency);

            return response.status(200).json({ message: `Successfully updated to ${newPlanName} plan.` });

        } catch (error) {
            console.error('Error updating agency subscription:', error);
            if (error instanceof jwt.JsonWebTokenError) {
                return response.status(401).json({ message: 'Invalid token.' });
            }
            return response.status(500).json({ message: 'Internal server error.' });
        }
    } else {
        response.setHeader('Allow', ['POST']);
        return response.status(405).end(`Method ${request.method} Not Allowed`);
    }
}
