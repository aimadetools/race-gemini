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
    const existingUserId = await kv.get(`user:email:${email}`);

    if (existingUserId) {
        return res.status(409).send({ message: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    
    const userId = `user:${Date.now()}`;

    await kv.set(`user:email:${email}`, userId);
    await kv.hset(userId, { 
        email, 
        password_hash,
        credits: 10 // Starting credits
    });


    const token = jwt.sign({ userId: userId }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).send({ token });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Internal Server Error' });
  }
};
