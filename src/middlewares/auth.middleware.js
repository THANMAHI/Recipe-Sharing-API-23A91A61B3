const crypto = require('crypto');
const { User } = require('../models');

async function requireApiKey(req, res, next) {
  try {
    const providedKey = req.headers['x-api-key'];

    if (!providedKey || providedKey.trim() === '') {
      return res.status(401).json({ error: 'Missing API Key' });
    }

    const hashedKey = crypto.createHash('sha256').update(providedKey).digest('hex');
    const user = await User.findOne({ where: { api_key_hash: hashedKey } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireApiKey };
