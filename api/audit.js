const { spawn } = require('child_process');
const path = require('path');

module.exports = (req, res) => {
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
    const scriptPath = path.resolve(process.cwd(), 'check_broken_links.py');

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
            console.error(`Python script exited with code ${code}`);
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ 
                message: 'Error executing audit script.',
                error: stderr 
            });
        }

        try {
            const results = JSON.parse(stdout);
            res.status(200).json(results);
        } catch (error) {
            console.error('Error parsing JSON from python script:', error);
            console.error(`stdout: ${stdout}`);
            return res.status(500).json({ 
                message: 'Error parsing audit script results.',
                error: stdout
            });
        }
    });

    pythonProcess.on('error', (err) => {
        console.error('Failed to start python process.', err);
        return res.status(500).json({ message: 'Failed to start audit process.' });
    });
};
