const { spawn } = require('child_process');
const path = require('path');

const runPythonScript = (scriptName, url, pythonExecutable) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(process.cwd(), scriptName);
        const pythonProcess = spawn(pythonExecutable, [scriptPath, url]);

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

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { url } = req.body;

    // Basic URL validation
    if (!url) {
        return res.status(400).json({ message: 'URL is required.' });
    }
    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ message: 'Invalid URL format.' });
    }

    const pythonExecutable = path.resolve(process.cwd(), 'venv', 'bin', 'python');
    const auditResults = {};
    const errors = [];

    try {
        // Run all audit scripts concurrently
        const [brokenLinks, altAttributes, pageLoadTimes, h1Tags] = await Promise.allSettled([
            runPythonScript('check_broken_links.py', url, pythonExecutable),
            runPythonScript('audit_alt_attributes.py', url, pythonExecutable),
            runPythonScript('audit_page_load_times.py', url, pythonExecutable),
            runPythonScript('audit_h1_tags.py', url, pythonExecutable)
        ]);

        if (brokenLinks.status === 'fulfilled') {
            auditResults.broken_links = brokenLinks.value;
        } else {
            errors.push(brokenLinks.reason);
        }

        if (altAttributes.status === 'fulfilled') {
            auditResults.alt_attributes = altAttributes.value;
        } else {
            errors.push(altAttributes.reason);
        }

        if (pageLoadTimes.status === 'fulfilled') {
            auditResults.page_load_times = pageLoadTimes.value;
        } else {
            errors.push(pageLoadTimes.reason);
        }

        if (h1Tags.status === 'fulfilled') {
            auditResults.h1_tags = h1Tags.value;
        } else {
            errors.push(h1Tags.reason);
        }

        if (errors.length > 0) {
            return res.status(500).json({
                message: 'Some audit checks failed.',
                results: auditResults,
                errors: errors
            });
        }

        res.status(200).json(auditResults);

    } catch (error) {
        console.error('An unexpected error occurred during audit orchestration:', error);
        return res.status(500).json({
            message: 'An unexpected error occurred during the audit process.',
            error: error.message
        });
    }
};
