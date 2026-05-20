
const { spawn } = require('child_process');

const test = spawn('npm', ['exec', 'start-server-and-test', 'start-vercel', 'http://localhost:3000', 'test-e2e'], {
  stdio: 'inherit',
});

test.on('error', (err) => {
  console.error('Failed to start subprocess.', err);
});

test.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Subprocess exited with code ${code} and signal ${signal}`);
  }
});
