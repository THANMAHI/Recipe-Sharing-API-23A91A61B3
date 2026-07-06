const express = require('express');
const recipeController = require('../controllers/recipe.controller');
const { requireApiKey } = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.get('/', recipeController.list);
router.get('/:id', recipeController.getById);

// Protected routes
router.post('/', requireApiKey, recipeController.create);
router.put('/:id', requireApiKey, recipeController.update);
router.delete('/:id', requireApiKey, recipeController.remove);

module.exports = router;
