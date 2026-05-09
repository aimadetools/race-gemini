const fs = require('fs');
const path = require('path');

async function logError(error, context, logFileName = 'application_error.log') {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFilePath = path.join(logDir, logFileName);
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] Context: ${context}
Error: ${error.message}
Stack: ${error.stack}

`;
  fs.appendFileSync(logFilePath, errorMessage);
}

module.exports = {
  logError,
};
