const { Op } = require('sequelize');
const { sequelize, Recipe, Ingredient, Tag, RecipeIngredient, RecipeTag, User } = require('../models');

/**
 * Format a Sequelize recipe instance into the required JSON structure
 */
const formatRecipe = (recipe) => {
  const plain = recipe.get({ plain: true });
  return {
    id: plain.id,
    title: plain.title,
    description: plain.description,
    instructions: plain.instructions,
    prep_time: plain.prepTime,
    cook_time: plain.cookTime,
    servings: plain.servings,
    created_at: plain.createdAt,
    author: plain.author ? {
      id: plain.author.id,
      username: plain.author.username,
    } : null,
    ingredients: (plain.ingredients || []).map(ing => ({
      id: ing.id,
      name: ing.name,
      category: ing.category,
      quantity: ing.RecipeIngredient ? ing.RecipeIngredient.quantity : null,
      unit: ing.RecipeIngredient ? ing.RecipeIngredient.unit : null,
    })),
    tags: (plain.tags || []).map(tag => ({
      id: tag.id,
      name: tag.name,
    })),
  };
};

/**
 * Create a new recipe with tags and ingredients atomically in a transaction
 */
async function createRecipe(recipeData, authorId) {
  const { title, description, instructions, prepTime, cookTime, servings, ingredients, tags } = recipeData;

  // Basic validation of metadata
  if (!title || !instructions || prepTime === undefined || cookTime === undefined || !servings) {
    const error = new Error('Missing required recipe metadata: title, instructions, prepTime, cookTime, servings are required.');
    error.status = 400;
    throw error;
  }

  const transaction = await sequelize.transaction();
  try {
    // 1. Create Recipe
    const recipe = await Recipe.create({
      title,
      description,
      instructions,
      prepTime,
      cookTime,
      servings,
      userId: authorId,
    }, { transaction });

    // 2. Add Ingredients
    if (ingredients && ingredients.length > 0) {
      const ingredientIds = ingredients.map(i => i.id);
      const dbIngredients = await Ingredient.findAll({
        where: { id: { [Op.in]: ingredientIds } },
        transaction,
      });

      if (dbIngredients.length !== ingredientIds.length) {
        const foundIds = dbIngredients.map(i => i.id);
        const missingIds = ingredientIds.filter(id => !foundIds.includes(id));
        const error = new Error(`Ingredients with IDs: ${missingIds.join(', ')} do not exist.`);
        error.status = 400;
        throw error;
      }

      // Check fields for each recipe ingredient
      for (const ing of ingredients) {
        if (ing.quantity === undefined || !ing.unit) {
          const error = new Error('Each ingredient must have quantity and unit.');
          error.status = 400;
          throw error;
        }
      }

      const recipeIngredientsData = ingredients.map(ing => ({
        recipeId: recipe.id,
        ingredientId: ing.id,
        quantity: parseFloat(ing.quantity),
        unit: ing.unit,
      }));

      await RecipeIngredient.bulkCreate(recipeIngredientsData, { transaction });
    }

    // 3. Add Tags
    if (tags && tags.length > 0) {
      const dbTags = await Tag.findAll({
        where: { id: { [Op.in]: tags } },
        transaction,
      });

      if (dbTags.length !== tags.length) {
        const foundIds = dbTags.map(t => t.id);
        const missingIds = tags.filter(id => !foundIds.includes(id));
        const error = new Error(`Tags with IDs: ${missingIds.join(', ')} do not exist.`);
        error.status = 400;
        throw error;
      }

      const recipeTagsData = tags.map(tagId => ({
        recipeId: recipe.id,
        tagId: tagId,
      }));

      await RecipeTag.bulkCreate(recipeTagsData, { transaction });
    }

    await transaction.commit();

    // Re-fetch with associations and formatting
    return await getRecipeById(recipe.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Retrieve details of a specific recipe
 */
async function getRecipeById(id) {
  const recipe = await Recipe.findByPk(id, {
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username'],
      },
      {
        model: Ingredient,
        as: 'ingredients',
        through: {
          attributes: ['quantity', 'unit'],
        },
      },
      {
        model: Tag,
        as: 'tags',
        through: {
          attributes: [],
        },
      },
    ],
  });

  if (!recipe) {
    const error = new Error(`Recipe with ID ${id} not found.`);
    error.status = 404;
    throw error;
  }

  return formatRecipe(recipe);
}

/**
 * List all recipes with optional filters (tags AND intersection, ingredients AND intersection, max_cook_time)
 */
async function listRecipes(filters = {}) {
  const { tags, ingredients, max_cook_time } = filters;
  let recipeIds = null;

  // 1. Tag Filtering (AND operation)
  if (tags) {
    const tagItems = tags.split(',').map(t => t.trim()).filter(Boolean);
    if (tagItems.length > 0) {
      const tagIdsQuery = [];
      const tagNamesQuery = [];
      tagItems.forEach(item => {
        if (/^\d+$/.test(item)) {
          tagIdsQuery.push(parseInt(item, 10));
        } else {
          tagNamesQuery.push(item);
        }
      });

      const foundTags = await Tag.findAll({
        where: {
          [Op.or]: [
            tagIdsQuery.length ? { id: { [Op.in]: tagIdsQuery } } : null,
            tagNamesQuery.length ? { name: { [Op.in]: tagNamesQuery } } : null,
          ].filter(Boolean),
        },
        attributes: ['id'],
      });

      const resolvedTagIds = foundTags.map(t => t.id);

      if (resolvedTagIds.length < tagItems.length) {
        return []; // An input tag was not found, so no recipe can match all requested tags
      }

      const matchingTagRecipes = await RecipeTag.findAll({
        where: { tagId: { [Op.in]: resolvedTagIds } },
        attributes: ['recipeId'],
        group: ['recipe_id'],
        having: sequelize.literal(`COUNT(DISTINCT tag_id) = ${resolvedTagIds.length}`),
      });

      recipeIds = matchingTagRecipes.map(r => r.recipeId);

      if (recipeIds.length === 0) {
        return [];
      }
    }
  }

  // 2. Ingredient Filtering (AND operation)
  if (ingredients) {
    const ingredientItems = ingredients.split(',').map(i => i.trim()).filter(Boolean);
    if (ingredientItems.length > 0) {
      const ingIdsQuery = [];
      const ingNamesQuery = [];
      ingredientItems.forEach(item => {
        if (/^\d+$/.test(item)) {
          ingIdsQuery.push(parseInt(item, 10));
        } else {
          ingNamesQuery.push(item);
        }
      });

      const foundIngs = await Ingredient.findAll({
        where: {
          [Op.or]: [
            ingIdsQuery.length ? { id: { [Op.in]: ingIdsQuery } } : null,
            ingNamesQuery.length ? { name: { [Op.in]: ingNamesQuery } } : null,
          ].filter(Boolean),
        },
        attributes: ['id'],
      });

      const resolvedIngIds = foundIngs.map(i => i.id);

      if (resolvedIngIds.length < ingredientItems.length) {
        return []; // An input ingredient was not found
      }

      const matchingIngRecipes = await RecipeIngredient.findAll({
        where: { ingredientId: { [Op.in]: resolvedIngIds } },
        attributes: ['recipeId'],
        group: ['recipe_id'],
        having: sequelize.literal(`COUNT(DISTINCT ingredient_id) = ${resolvedIngIds.length}`),
      });

      const ingRecipeIds = matchingIngRecipes.map(r => r.recipeId);

      if (recipeIds === null) {
        recipeIds = ingRecipeIds;
      } else {
        // Intersect tag filters and ingredient filters
        recipeIds = recipeIds.filter(id => ingRecipeIds.includes(id));
      }

      if (recipeIds.length === 0) {
        return [];
      }
    }
  }

  // 3. Final Querying of Recipe Table
  const whereClause = {};

  if (recipeIds !== null) {
    whereClause.id = { [Op.in]: recipeIds };
  }

  if (max_cook_time) {
    const maxCookVal = parseInt(max_cook_time, 10);
    if (isNaN(maxCookVal)) {
      const error = new Error('max_cook_time must be an integer.');
      error.status = 400;
      throw error;
    }
    whereClause.cookTime = { [Op.lte]: maxCookVal };
  }

  const recipes = await Recipe.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'author',
        attributes: ['id', 'username'],
      },
      {
        model: Ingredient,
        as: 'ingredients',
        through: {
          attributes: ['quantity', 'unit'],
        },
      },
      {
        model: Tag,
        as: 'tags',
        through: {
          attributes: [],
        },
      },
    ],
    order: [['createdAt', 'DESC']],
  });

  return recipes.map(formatRecipe);
}

/**
 * Update a recipe and synchronize its relationships
 */
async function updateRecipe(id, recipeData, userId) {
  const { title, description, instructions, prepTime, cookTime, servings, ingredients, tags } = recipeData;

  const recipe = await Recipe.findByPk(id);
  if (!recipe) {
    const error = new Error(`Recipe with ID ${id} not found.`);
    error.status = 404;
    throw error;
  }

  if (recipe.userId !== userId) {
    const error = new Error('You do not have permission to update this recipe.');
    error.status = 403;
    throw error;
  }

  const transaction = await sequelize.transaction();
  try {
    // Update properties if provided
    await recipe.update({
      title: title !== undefined ? title : recipe.title,
      description: description !== undefined ? description : recipe.description,
      instructions: instructions !== undefined ? instructions : recipe.instructions,
      prepTime: prepTime !== undefined ? prepTime : recipe.prepTime,
      cookTime: cookTime !== undefined ? cookTime : recipe.cookTime,
      servings: servings !== undefined ? servings : recipe.servings,
    }, { transaction });

    // Sync ingredients if provided
    if (ingredients !== undefined) {
      await RecipeIngredient.destroy({ where: { recipeId: recipe.id }, transaction });

      if (ingredients.length > 0) {
        const ingredientIds = ingredients.map(i => i.id);
        const dbIngredients = await Ingredient.findAll({
          where: { id: { [Op.in]: ingredientIds } },
          transaction,
        });

        if (dbIngredients.length !== ingredientIds.length) {
          const foundIds = dbIngredients.map(i => i.id);
          const missingIds = ingredientIds.filter(id => !foundIds.includes(id));
          const error = new Error(`Ingredients with IDs: ${missingIds.join(', ')} do not exist.`);
          error.status = 400;
          throw error;
        }

        for (const ing of ingredients) {
          if (ing.quantity === undefined || !ing.unit) {
            const error = new Error('Each ingredient must have quantity and unit.');
            error.status = 400;
            throw error;
          }
        }

        const recipeIngredientsData = ingredients.map(ing => ({
          recipeId: recipe.id,
          ingredientId: ing.id,
          quantity: parseFloat(ing.quantity),
          unit: ing.unit,
        }));
        await RecipeIngredient.bulkCreate(recipeIngredientsData, { transaction });
      }
    }

    // Sync tags if provided
    if (tags !== undefined) {
      await RecipeTag.destroy({ where: { recipeId: recipe.id }, transaction });

      if (tags.length > 0) {
        const dbTags = await Tag.findAll({
          where: { id: { [Op.in]: tags } },
          transaction,
        });

        if (dbTags.length !== tags.length) {
          const foundIds = dbTags.map(t => t.id);
          const missingIds = tags.filter(id => !foundIds.includes(id));
          const error = new Error(`Tags with IDs: ${missingIds.join(', ')} do not exist.`);
          error.status = 400;
          throw error;
        }

        const recipeTagsData = tags.map(tagId => ({
          recipeId: recipe.id,
          tagId: tagId,
        }));
        await RecipeTag.bulkCreate(recipeTagsData, { transaction });
      }
    }

    await transaction.commit();

    return await getRecipeById(recipe.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * Delete a recipe
 */
async function deleteRecipe(id, userId) {
  const recipe = await Recipe.findByPk(id);
  if (!recipe) {
    const error = new Error(`Recipe with ID ${id} not found.`);
    error.status = 404;
    throw error;
  }

  if (recipe.userId !== userId) {
    const error = new Error('You do not have permission to delete this recipe.');
    error.status = 403;
    throw error;
  }

  await recipe.destroy();
  return true;
}

module.exports = {
  createRecipe,
  getRecipeById,
  listRecipes,
  updateRecipe,
  deleteRecipe,
};
