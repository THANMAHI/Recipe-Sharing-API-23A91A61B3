const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { username, email } = req.body;
    const result = await authService.registerUser({ username, email });
    return res.status(201).json(result);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Username or email already exists.',
      });
    }
    next(error);
  }
}

module.exports = { register };
