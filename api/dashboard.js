const { kv } = require('@vercel/kv');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).send({ message: 'Only GET requests allowed' });
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Authorization header missing or invalid' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await kv.hgetall(userId);

    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }

    const pageIds = await kv.lrange(`user:${userId}:pages`, 0, -1);

    const pages = [];
    for (const pageId of pageIds) {
        const page = await kv.hgetall(pageId);
        pages.push(page);
    }

    res.status(200).json({
        email: user.email,
        credits: user.credits,
        pages: pages
    });
  } catch (error) {
    console.error(error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return res.status(401).send({ message: 'Invalid or expired token' });
    }
    res.status(500).send({ message: 'Internal Server Error' });
  }
};
