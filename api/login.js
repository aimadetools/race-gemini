const { kv } = require('@vercel/kv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send({ message: 'Only POST requests allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    const userId = await kv.get(`user:email:${email}`);

    if (!userId) {
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const user = await kv.hgetall(userId);

    if (!user) {
        return res.status(401).send({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).send({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};
