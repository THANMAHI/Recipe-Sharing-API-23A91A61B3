function errorHandler(err, req, res, next) {
  // Log error for debugging internally
  if (process.env.NODE_ENV !== 'test') {
    console.error('API Error:', err);
  }

  // Handle Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map(e => `${e.path}: ${e.message}`);
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Database validation failed.',
      details: messages,
    });
  }

  // Handle custom BadRequest errors
  if (err.statusCode === 400 || err.status === 400) {
    return res.status(400).json({
      error: 'Bad Request',
      message: err.message,
    });
  }

  // Handle custom Forbidden errors
  if (err.statusCode === 403 || err.status === 403) {
    return res.status(403).json({
      error: 'Forbidden',
      message: err.message,
    });
  }

  // Handle custom NotFound errors
  if (err.statusCode === 404 || err.status === 404) {
    return res.status(404).json({
      error: 'Not Found',
      message: err.message,
    });
  }

  // Default server error
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred on the server.',
  });
}

module.exports = { errorHandler };
