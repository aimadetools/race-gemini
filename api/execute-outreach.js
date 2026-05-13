
process.on('uncaughtException', (err) => {
  console.error('--- DEBUG: Uncaught Exception ---');
  console.error(err);

  console.error('--- DEBUG: Uncaught Exception ---');
  process.exit(1);
});

module.exports = async (req, res) => {
  console.log('execute-outreach.js received simplified request');
  res.status(200).json({ message: 'Simplified outreach function executed successfully.' });
  console.log('execute-outreach.js ending simplified');
};
