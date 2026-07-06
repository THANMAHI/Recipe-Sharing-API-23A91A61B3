const { Ingredient, Tag } = require('../models');

async function listIngredients(req, res, next) {
  try {
    const ingredients = await Ingredient.findAll({
      order: [['name', 'ASC']],
    });
    return res.status(200).json(ingredients);
  } catch (error) {
    next(error);
  }
}

async function listTags(req, res, next) {
  try {
    const tags = await Tag.findAll({
      order: [['name', 'ASC']],
    });
    return res.status(200).json(tags);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listIngredients,
  listTags,
};
