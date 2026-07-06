const express = require('express');
const taxonomyController = require('../controllers/taxonomy.controller');

const router = express.Router();

router.get('/ingredients', taxonomyController.listIngredients);
router.get('/tags', taxonomyController.listTags);

module.exports = router;
