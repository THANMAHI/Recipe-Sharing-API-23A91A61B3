const crypto = require('crypto');
const { User } = require('../models');

async function registerUser({ username, email }) {
  if (!username || !email) {
    const error = new Error('Username and email are required.');
    error.status = 400;
    throw error;
  }

  // Generate a secure random 64-character API key
  const apiKey = crypto.randomBytes(32).toString('hex');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  // Create the user (Sequelize checks validations like email format)
  const user = await User.create({
    username,
    email,
    api_key_hash: apiKeyHash,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
    apiKey,
  };
}

module.exports = { registerUser };
