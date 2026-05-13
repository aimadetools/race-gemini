
process.on('uncaughtException', (err) => {
  console.error('--- DEBUG: Uncaught Exception ---');
  console.error(err);

  console.error('--- DEBUG: Uncaught Exception ---');
  // In a serverless environment, re-throwing or exiting might lead to quicker restarts
  // or better error reporting by the platform.
  process.exit(1);
});

const { logError, logInfo } = require('../../lib/logger');

module.exports = async (req, res) => {
  await logInfo('execute-outreach.js received simplified request', 'Handler');
  res.status(200).json({ message: 'Simplified outreach function executed successfully.' });
  await logInfo('execute-outreach.js ending simplified', 'Handler');
};
