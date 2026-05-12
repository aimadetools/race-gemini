const { logInfo, logError } = require('../../lib/logger');

// 1x1 transparent GIF (base64 encoded)
const GIF = 'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==';

module.exports = async (req, res) => {
  try {
    const { id } = req.query;

    if (id) {
      await logInfo(`Email opened: ${id}`, 'track-email-open');
      // In a real application, you would store this `id` in a database
      // along with a timestamp and possibly IP address, user agent, etc.
    } else {
      await logInfo('Tracking pixel hit without an ID.', 'track-email-open');
    }

    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'image/gif');

    // Send the transparent GIF
    res.status(200).send(Buffer.from(GIF, 'base64'));

  } catch (error) {
    await logError(error, 'Error in track-email-open.js');
    res.setHeader('Content-Type', 'image/gif');
    res.status(500).send(Buffer.from(GIF, 'base64')); // Still send a GIF even on error
  }
};
