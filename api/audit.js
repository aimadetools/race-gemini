const { spawn } = require('child_process');
const path = require('path');
const { logError } = require('../../lib/logger');
const { parseAddress } = require('../../lib/html-parser');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function runGbpCategoryCheck(url) {
    const openCageApiKey = process.env.OPENCAGE_API_KEY;
    if (!openCageApiKey || openCageApiKey === 'your_opencage_api_key') {
        return { error: 'OpenCage API key is not configured.' };
    }

    try {
        const response = await fetch(url);
        const html = await response.text();
        const address = parseAddress(html);

        if (!address) {
            return { businessCategory: 'Address not found on page.' };
        }

        const geocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${openCageApiKey}`;
        const geocodingResponse = await fetch(geocodingUrl);
        const geocodingData = await geocodingResponse.json();

        if (geocodingData.results && geocodingData.results.length > 0) {
            const { lat, lng } = geocodingData.results[0].geometry;

            const reverseGeocodingUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${openCageApiKey}`;
            const reverseGeocodingResponse = await fetch(reverseGeocodingUrl);
            const reverseGeocodingData = await reverseGeocodingResponse.json();
            
            if (reverseGeocodingData.results && reverseGeocodingData.results.length > 0) {
                const components = reverseGeocodingData.results[0].components;
                const businessCategory = components._type || components.shop || components.amenity || components.craft || 'Not specified';
                return { businessCategory };
            }
        }
        return { businessCategory: 'Could not determine category.' };
    } catch (error) {
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

    const auditsToRun = [
        { name: 'alt-attributes', command: 'html alt-attributes', args: [url] },
        { name: 'h1-tags', command: 'html h1-tags', args: [url] },
        { name: 'broken-links', command: 'html broken-links', args: [url] },
        { name: 'h2-h3-tags', command: 'html h2-h3-tags', args: [url] },
        { name: 'mobile-friendliness', command: 'html mobile-friendliness', args: [url] },
        { name: 'structured-data', command: 'html structured-data', args: [url] },
        { name: 'readability', command: 'html readability', args: [url] },
        { name: 'page-load-times', command: 'html page-load-times', args: [url] },
        { name: 'gmb', command: 'gmb', args: [url] },
    ];
    
    if (locations && Array.isArray(locations) && locations.length > 0) {
        auditsToRun.push({ name: 'locations', command: 'locations', args: [url, '--locations-db', locations.join(',')] });
    }

    try {
        const auditPromises = auditsToRun.map(audit => runAudit(audit.command, audit.args));
        const results = await Promise.allSettled(auditPromises);

        const auditResults = results.reduce((acc, result, index) => {
            const auditName = auditsToRun[index].name;
            if (result.status === 'fulfilled') {
                acc[auditName] = result.value;
            } else {
                acc[auditName] = { error: result.reason };
                logError(new Error(`Audit '${auditName}' failed. Reason: ${JSON.stringify(result.reason)}`), `Audit API - Audit Failure`, 'audit_error.log');
            }
            return acc;
        }, {});

        res.status(200).json(auditResults);

    } catch (error) {
        logError(error, 'Audit API - General Error', 'audit_error.log');
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
