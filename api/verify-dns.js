import dns from 'dns';
import tls from 'tls';
import * as cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { logError } from '../lib/logger.js';

const dnsPromises = dns.promises;

async function verifySsl(domain) {
    return new Promise((resolve) => {
        const socket = tls.connect({
            host: domain,
            port: 443,
            servername: domain,
            timeout: 5000 // 5 seconds timeout
        }, () => {
            const authorized = socket.authorized;
            const authError = socket.authorizationError;
            socket.end();
            resolve({
                verified: !!authorized,
                error: authError ? String(authError) : null
            });
        });

        socket.on('error', (err) => {
            socket.destroy();
            resolve({
                verified: false,
                error: err.message
            });
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve({
                verified: false,
                error: 'Connection timeout'
            });
        });
    });
}

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

        // 2. Check IP mapping (A record / CNAME flattening)
        let ipsMatch = false;
        let domainIps = [];
        try {
            const platformIps = await dnsPromises.resolve4('localseogen.com').catch(() => []);
            domainIps = await dnsPromises.resolve4(cleanedDomain).catch(() => []);

            if (platformIps.length > 0 && domainIps.length > 0) {
                ipsMatch = domainIps.some(ip => platformIps.includes(ip));
            }
        } catch (ipErr) {
            // resolve4 throws if no records found
        }

        // 3. General resolution status (can it resolve to any IP?)
        let dnsResolved = false;
        try {
            await dnsPromises.lookup(cleanedDomain);
            dnsResolved = true;
        } catch (lookupErr) {
            dnsResolved = false;
        }

        const verified = cnameResolved || ipsMatch;

        // 4. SSL certificate check
        let sslVerified = false;
        let sslError = null;
        let sslMessage = 'Checking...';

        if (dnsResolved) {
            const sslResult = await verifySsl(cleanedDomain);
            sslVerified = sslResult.verified;
            sslError = sslResult.error;
            sslMessage = sslVerified
                ? 'SSL certificate is active and valid.'
                : `SSL certificate is not active/valid: ${sslError || 'Verification failed.'}`;
        } else {
            sslMessage = 'SSL check skipped because domain DNS is not resolving.';
        }

        // 5. Resolution warning details
        let resolutionWarning = null;
        if (!dnsResolved) {
            resolutionWarning = `Warning: Subdomain '${cleanedDomain}' is not resolving correctly. Please check that you entered the correct subdomain and that your DNS record has propagation time.`;
        } else if (!verified) {
            resolutionWarning = `Warning: Subdomain '${cleanedDomain}' resolves but does not point to 'localseogen.com'. Current records point elsewhere.`;
        }

        return res.status(200).json({
            verified,
            method: cnameResolved ? 'CNAME' : (ipsMatch ? 'A/IP' : null),
            dnsResolved,
            sslVerified,
            sslError,
            resolutionWarning,
            message: verified
                ? `DNS configuration verified successfully! ${cnameResolved ? 'CNAME points to localseogen.com.' : 'IP mapped to platform.'}`
                : `Verification failed. CNAME/A record for '${cleanedDomain}' is not pointing to 'localseogen.com'. DNS propagation can take up to 24 hours.`,
            sslMessage
        });

    } catch (error) {
        await logError(error, 'Verify DNS - General Error');
        return res.status(500).json({ message: 'Internal server error' });
    }
}

export default handler;
