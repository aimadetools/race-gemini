const { spawn } = require('child_process');

module.exports = (req, res) => {
  console.log('Executing outreach script...');
  const pythonProcess = spawn('python3', ['send_outreach_emails.py']);

  let stdout = '';
  let stderr = '';

  pythonProcess.stdout.on('data', (data) => {
    console.log(`stdout: ${data}`);
    stdout += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    stderr += data.toString();
  });

  pythonProcess.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
    res.status(200).json({
      message: `Python script finished with exit code ${code}`,
      stdout,
      stderr,
    });
  });
};
