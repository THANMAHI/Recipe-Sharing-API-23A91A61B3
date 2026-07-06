const express = require('express');
require('dotenv').config();

const { sequelize } = require('./models');
const { seedDatabase } = require('./utils/seeder');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Parsers
app.use(express.json());

// Register API Routes
app.use('/', routes);

// Handle unmatched routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

// Error handling middleware
app.use(errorHandler);

// Connect to DB and Start Server
async function startServer() {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // sync tables
    const forceSync = process.env.DB_FORCE_SYNC === 'true';
    await sequelize.sync({ force: forceSync });
    console.log(`Database tables synchronized (force: ${forceSync}).`);

    // Auto seed database
    await seedDatabase();

    // Start Express app
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error);
    process.exit(1);
  }
}

// Only start the server if not running inside a testing environment
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

module.exports = app;
