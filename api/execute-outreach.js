const { spawn } = require('child_process');

module.exports = (req, res) => {
  const pythonProcess = spawn('python3', ['send_outreach_emails.py']);

  let stdout = '';
  let stderr = '';

  pythonProcess.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  pythonProcess.on('close', (code) => {
    res.status(200).json({
      message: `Python script finished with exit code ${code}`,
      stdout,
      stderr,
    });
  });
};
