const { spawn } = require('child_process');
const path = require('path');
const { logError } = require('../../lib/logger');
const { parseAddress } = require('../../lib/html-parser');
const fetch = global.fetch;

async function runGbpCategoryCheck(url) {
    const openCageApiKey = process.env.OPENCAGE_API_KEY;
    if (!openCageApiKey || openCageApiKey === 'your_opencage_api_key') {
        const errorMsg = 'OpenCage API key is not configured.';
        logError(new Error(errorMsg), 'runGbpCategoryCheck - API Key Error', 'audit_error.log');
        return { error: errorMsg };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            const responseBody = await response.text().catch(() => 'N/A'); // Attempt to read body, catch if not readable
            const errorMsg = `Failed to fetch URL: ${url}. Status: ${response.status} ${response.statusText}. Body: ${responseBody.substring(0, 200)}...`; // Limit body to 200 chars
            logError(new Error(errorMsg), 'runGbpCategoryCheck - Fetch URL Error', 'audit_error.log');
            return { error: errorMsg };
        }
        const html = await response.text();
        const address = parseAddress(html);

        if (!address) {
            const errorMsg = 'Address not found on page for GBP category check.';
            logError(new Error(errorMsg), 'runGbpCategoryCheck - Address Not Found', 'audit_error.log');
            return { businessCategory: errorMsg };
        }

        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${openCageApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        if (!geocodingResponse.ok) {
            const responseBody = await geocodingResponse.text().catch(() => 'N/A');
            const errorMsg = `Geocoding request failed for ${address}. Status: ${geocodingResponse.status} ${geocodingResponse.statusText}. Body: ${responseBody.substring(0, 200)}...`;
            logError(new Error(errorMsg), 'runGbpCategoryCheck - Geocoding Error', 'audit_error.log');
            return { error: errorMsg };
        }
        const geocodingData = await geocodingResponse.json();

        if (!geocodingData.results || geocodingData.results.length === 0) {
            const errorMsg = `Geocoding API returned no results for address: ${address}.`;
            logError(new Error(errorMsg), 'runGbpCategoryCheck - Geocoding No Results', 'audit_error.log');
            return { error: errorMsg };
        const { lat, lng } = geocodingData.results[0].geometry;
            const reverseGeocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${openCageApiKey}`;
            const reverseGeocodingResponse = await fetch(reverseGeocodingUrl);
            if (!reverseGeocodingResponse.ok) {
                const responseBody = await reverseGeocodingResponse.text().catch(() => 'N/A');
                const errorMsg = `Reverse geocoding request failed for coordinates ${lat}, ${lng}. Status: ${reverseGeocodingResponse.status} ${reverseGeocodingResponse.statusText}. Body: ${responseBody.substring(0, 200)}...`;
                logError(new Error(errorMsg), 'runGbpCategoryCheck - Reverse Geocoding Error', 'audit_error.log');
                return { error: errorMsg };
            }
            const reverseGeocodingData = await reverseGeocodingResponse.json();
            
            if (!reverseGeocodingData.results || reverseGeocodingData.results.length === 0) {
                const errorMsg = `Reverse geocoding API returned no results for coordinates: ${lat}, ${lng}.`;
                logError(new Error(errorMsg), 'runGbpCategoryCheck - Reverse Geocoding No Results', 'audit_error.log');
                return { error: errorMsg };
            }

            const components = reverseGeocodingData.results[0].components;
                const businessCategory = components._type || components.shop || components.amenity || components.craft || 'Not specified';
                const confidence = geocodingData.results[0].confidence;
                return { businessCategory, confidence };        const errorMsg = 'Could not determine category from address.';
        logError(new Error(errorMsg), 'runGbpCategoryCheck - Category Not Found', 'audit_error.log');
        return { error: errorMsg };
    } catch (error) {
        logError(error, 'runGbpCategoryCheck - General Error', 'audit_error.log');
        return { error: error.message };
    }
}

const runAudit = (auditCommand, args) => {
    return new Promise((resolve, reject) => {
        const pythonExecutable = path.resolve(process.cwd(), 'venv', 'bin', 'python');
        const auditorCliPath = path.resolve(process.cwd(), 'scripts', 'auditor_cli.py');
        
        const processArgs = [auditorCliPath, ...auditCommand.split(' '), ...args];

        const pythonProcess = spawn(pythonExecutable, processArgs);

        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                logError(new Error(`Auditor CLI exited with code ${code} for command '${auditCommand}'. Stderr: ${stderr}`), `Audit API - Auditor CLI Exit Code ${code}`, 'audit_error.log');
                return reject({
                    audit: auditCommand,
                    message: `Error executing audit: ${auditCommand}`,
                    error: stderr
                });
            }

            try {
                const results = JSON.parse(stdout);
                resolve(results);
            } catch (error) {
                logError(new Error(`Error parsing JSON from auditor_cli.py for command '${auditCommand}'. Stdout: ${stdout}. Error: ${error.message}`), `Audit API - Auditor CLI JSON Parse Error`, 'audit_error.log');
                reject({
                    audit: auditCommand,
                    message: `Error parsing results from audit: ${auditCommand}`,
                    error: stdout
                });
            }
        });

        pythonProcess.on('error', (err) => {
            logError(err, `Audit API - Auditor CLI Process Start Failed for ${auditCommand}`, 'audit_error.log');
            reject({
                audit: auditCommand,
                message: `Failed to start process for audit: ${auditCommand}`,
                error: err.message
            });
        });
    });
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { url, locations } = req.body;

    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }

    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    const auditsToRun = [];
    const auditResults = {};

    // Check for GOOGLE_PAGE_SPEED_API_KEY before running mobile-friendliness audit
    const googlePageSpeedApiKey = process.env.GOOGLE_PAGE_SPEED_API_KEY;
    if (!googlePageSpeedApiKey || googlePageSpeedApiKey === 'your_google_page_speed_api_key') {
        auditResults['mobile-friendliness'] = { 
            error: 'GOOGLE_PAGE_SPEED_API_KEY environment variable is not set. Cannot perform mobile-friendliness audit.' 
        };
        logError(new Error('GOOGLE_PAGE_SPEED_API_KEY is missing.'), 'Audit API - Missing Google Page Speed API Key', 'audit_error.log');
    } else {
        auditsToRun.push({ name: 'mobile-friendliness', command: 'html mobile-friendliness', args: [url] });
    }

    auditsToRun.push(
        { name: 'alt-attributes', command: 'html alt-attributes', args: [url] },
        { name: 'h1-tags', command: 'html h1-tags', args: [url] },
        { name: 'broken-links', command: 'html broken-links', args: [url] },
        { name: 'h2-h3-tags', command: 'html h2-h3-tags', args: [url] },
        { name: 'structured-data', command: 'html structured-data', args: [url] },
        { name: 'readability', command: 'html readability', args: [url] },
        { name: 'page-load-times', command: 'html page-load-times', args: [url] },
        { name: 'robots-txt', command: 'robots', args: [url] },
        { name: 'canonical-tags', command: 'html canonical-tags', args: [url] },
        { name: 'sitemap-xml', command: 'xml sitemap-xml', args: [url] },
        { name: 'schema-markup', command: 'html schema-markup', args: [url] },
        { name: 'meta-tags', command: 'html meta-tags', args: [url] },
        { name: 'header-response-codes', command: 'http header-response-codes', args: [url] },
    );
    
    if (locations && Array.isArray(locations) && locations.length > 0) {
        auditsToRun.push({ name: 'locations', command: 'locations', args: [url, '--locations-db', locations.join(',')] });
    }

    try {
        const auditPromises = auditsToRun.map(audit => runAudit(audit.command, audit.args));
        const gbpPromise = runGbpCategoryCheck(url);
        
        const results = await Promise.allSettled([...auditPromises, gbpPromise]);

        let promiseIndex = 0;
        auditsToRun.forEach(audit => {
            const result = results[promiseIndex];
            if (result.status === 'fulfilled') {
                auditResults[audit.name] = result.value;
            } else {
                auditResults[audit.name] = { error: result.reason };
                logError(new Error(`Audit '${audit.name}' failed. Reason: ${JSON.stringify(result.reason)}`), `Audit API - Audit Failure`, 'audit_error.log');
            }
            promiseIndex++;
        });

        const gbpResult = results[results.length - 1];
        if (gbpResult.status === 'fulfilled') {
            auditResults['gbp_category_check'] = gbpResult.value;
        } else {
            auditResults['gbp_category_check'] = { error: gbpResult.reason };
            logError(new Error(`Audit 'gbp_category_check' failed. Reason: ${JSON.stringify(gbpResult.reason)}`), `Audit API - Audit Failure`, 'audit_error.log');
        }

        res.status(200).json(auditResults);

    } catch (error) {
        logError(error, 'Audit API - General Error', 'audit_error.log');
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
