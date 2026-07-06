const recipeService = require('../services/recipe.service');

async function create(req, res, next) {
  try {
    const authorId = req.user.id;
    const recipeData = {
      title: req.body.title,
      description: req.body.description,
      instructions: req.body.instructions,
      prepTime: req.body.prep_time !== undefined ? req.body.prep_time : req.body.prepTime,
      cookTime: req.body.cook_time !== undefined ? req.body.cook_time : req.body.cookTime,
      servings: req.body.servings,
      ingredients: req.body.ingredients,
      tags: req.body.tags,
    };

    const recipe = await recipeService.createRecipe(recipeData, authorId);
    return res.status(201).json(recipe);
  } catch (error) {
    next(error);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    const recipe = await recipeService.getRecipeById(parseInt(id, 10));
    return res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
}

async function list(req, res, next) {
  try {
    const { tags, ingredients, max_cook_time } = req.query;
    const recipes = await recipeService.listRecipes({ tags, ingredients, max_cook_time });
    return res.status(200).json(recipes);
  } catch (error) {
    next(error);
  }
}

async function update(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const recipeData = {
      title: req.body.title,
      description: req.body.description,
      instructions: req.body.instructions,
      prepTime: req.body.prep_time !== undefined ? req.body.prep_time : req.body.prepTime,
      cookTime: req.body.cook_time !== undefined ? req.body.cook_time : req.body.cookTime,
      servings: req.body.servings,
      ingredients: req.body.ingredients,
      tags: req.body.tags,
    };

    const recipe = await recipeService.updateRecipe(parseInt(id, 10), recipeData, userId);
    return res.status(200).json(recipe);
  } catch (error) {
    next(error);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    await recipeService.deleteRecipe(parseInt(id, 10), userId);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  create,
  getById,
  list,
  update,
  remove,
};
