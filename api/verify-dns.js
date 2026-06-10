import dns from 'dns';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../lib/logger.js';

const dnsPromises = dns.promises;

async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Only POST requests are allowed' });
    }

    const { domain } = req.body;
    if (!domain) {
        return res.status(400).json({ message: 'Domain name is required' });
    }

    const cleanedDomain = domain.trim().toLowerCase();
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(cleanedDomain)) {
        return res.status(400).json({ message: 'Invalid domain format. e.g., seo.yourdomain.com' });
    }

    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies.authToken || cookies.token || cookies.auth;

    if (!token) {
        return res.status(401).json({ message: 'Not authenticated' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId || decoded.agencyId;
        if (!userId) {
            return res.status(400).json({ message: 'Invalid token payload' });
        }

        // 1. Check CNAME record
        let cnameResolved = false;
        let cnameTargets = [];
        try {
            cnameTargets = await dnsPromises.resolveCname(cleanedDomain);
            cnameResolved = cnameTargets.some(target => {
                const normalized = target.toLowerCase().replace(/\.$/, '');
                return normalized === 'localseogen.com' || normalized.endsWith('.localseogen.com');
            });
        } catch (dnsErr) {
            // resolveCname throws if no CNAME is present
        }

        if (cnameResolved) {
            return res.status(200).json({
                verified: true,
                method: 'CNAME',
                message: `DNS configuration verified successfully! CNAME points to localseogen.com.`
            });
        }

        // 2. Check IP mapping (A record / CNAME flattening)
        let ipsMatch = false;
        try {
            const platformIps = await dnsPromises.resolve4('localseogen.com').catch(() => []);
            const domainIps = await dnsPromises.resolve4(cleanedDomain).catch(() => []);

            if (platformIps.length > 0 && domainIps.length > 0) {
                ipsMatch = domainIps.some(ip => platformIps.includes(ip));
            }
        } catch (ipErr) {
            // resolve4 throws if no records found
        }

        if (ipsMatch) {
            return res.status(200).json({
                verified: true,
                method: 'A/IP',
                message: `DNS configuration verified successfully via IP mapping!`
            });
        }

        return res.status(200).json({
            verified: false,
            message: `Verification failed. CNAME/A record for '${cleanedDomain}' is not pointing to 'localseogen.com'. DNS propagation can take up to 24 hours.`
        });

    } catch (error) {
        await logError(error, 'Verify DNS - General Error');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
