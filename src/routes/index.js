const express = require('express');
const path = require('path');
const authRoutes = require('./auth.routes');
const recipeRoutes = require('./recipe.routes');
const taxonomyRoutes = require('./taxonomy.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/recipes', recipeRoutes);
router.use('/', taxonomyRoutes);

// Serves the beautiful interactive testing playground dashboard
router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Redirect root to dashboard for easy access
router.get('/', (req, res) => {
  res.redirect('/dashboard');
});

module.exports = router;
