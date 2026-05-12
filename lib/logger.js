async function logError(error, context) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'ERROR',
    context: String(context), // Ensure context is a string
  };

  if (error) {
    logEntry.errorName = error.name;
    logEntry.errorMessage = error.message;
    logEntry.stack = error.stack;
  }
  console.error(JSON.stringify(logEntry));
}

async function logInfo(message, context) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: 'INFO',
    context: String(context || 'N/A'), // Ensure context is a string, default to N/A
    message: String(message), // Ensure message is a string
  };
  console.log(JSON.stringify(logEntry));
}

module.exports = {
  logError,
  logInfo,
};
