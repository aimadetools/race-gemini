const { spawn } = require('child_process');
const path = require('path');

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
                console.error(`Python script ${scriptName} exited with code ${code}`);
                console.error(`stderr: ${stderr}`);
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
                console.error(`Error parsing JSON from ${scriptName}:`, error);
                console.error(`stdout: ${stdout}`);
                reject({
                    script: scriptName,
                    message: `Error parsing results from ${scriptName}`,
                    error: stdout
                });
            }
        });

        pythonProcess.on('error', (err) => {
            console.error(`Failed to start python process for ${scriptName}.`, err);
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
        return res.status(400).json({ message: 'URL and a list of locations are required.' });
    }

    try {
        new URL(url);
    } catch (error) {
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
        console.error('An unexpected error occurred during audit orchestration:', error);
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
