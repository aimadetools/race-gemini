const { spawn } = require('child_process');
const path = require('path');
const { logError } = require('../../lib/logger');

const runPythonScript = (scriptName, args, pythonExecutable) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(process.cwd(), scriptName);
        const pythonProcess = spawn(pythonExecutable, [scriptPath, ...args]);

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
                await logError(new Error(`Python script ${scriptName} exited with code ${code}. Stderr: ${stderr}`), `Audit API - Python Script Exit Code ${code}`, 'audit_error.log');
                return reject({
                    script: scriptName,
                    message: `Error executing script: ${scriptName}`,
                    error: stderr
                });
            }

            try {
                const results = JSON.parse(stdout);
                resolve(results);
            } catch (error) {
                await logError(new Error(`Error parsing JSON from ${scriptName}. Stdout: ${stdout}. Error: ${error.message}`), `Audit API - Python JSON Parse Error`, 'audit_error.log');
                reject({
                    script: scriptName,
                    message: `Error parsing results from ${scriptName}`,
                    error: stdout
                });
            }
        });

        pythonProcess.on('error', async (err) => {
            await logError(err, `Audit API - Python Process Start Failed for ${scriptName}`, 'audit_error.log');
            reject({
                script: scriptName,
                message: `Failed to start process for ${scriptName}`,
                error: err.message
            });
        });
    });
};

const audits = require('../lib/audits');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { url, locations } = req.body;

    if (!url || !locations || !Array.isArray(locations) || locations.length === 0) {
        await logError(new Error('URL and a list of locations are required.'), 'Audit API - Validation Error', 'audit_error.log');
        return res.status(400).json({ message: 'URL and a list of locations are required.' });
    }

    try {
        new URL(url);
    } catch (error) {
        await logError(new Error(`Invalid URL format: ${url}`), 'Audit API - Invalid URL Format', 'audit_error.log');
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    const pythonExecutable = path.resolve(process.cwd(), 'venv', 'bin', 'python');

    try {
        const auditPromises = audits.map(audit => {
            const args = audit.args(url, locations);
            return runPythonScript(audit.script, args, pythonExecutable);
        });

        const results = await Promise.allSettled(auditPromises);

        const auditResults = results.reduce((acc, result, index) => {
            const auditName = audits[index].name;
            acc[auditName] = result.status === 'fulfilled' ? result.value : { error: result.reason };
            return acc;
        }, {});

        res.status(200).json(auditResults);

    } catch (error) {
        await logError(error, 'Audit API - General Error', 'audit_error.log');
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
