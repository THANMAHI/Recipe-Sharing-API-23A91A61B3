const sequelize = require('../config/database');
const User = require('./user.model');
const Recipe = require('./recipe.model');
const Ingredient = require('./ingredient.model');
const Tag = require('./tag.model');
const RecipeIngredient = require('./recipe-ingredient.model');
const RecipeTag = require('./recipe-tag.model');

// User <-> Recipe (1:M)
User.hasMany(Recipe, { foreignKey: 'userId', as: 'recipes', onDelete: 'CASCADE' });
Recipe.belongsTo(User, { foreignKey: 'userId', as: 'author' });

// Recipe <-> Ingredient (M:N)
Recipe.belongsToMany(Ingredient, {
  through: RecipeIngredient,
  foreignKey: 'recipeId',
  otherKey: 'ingredientId',
  as: 'ingredients',
});
Ingredient.belongsToMany(Recipe, {
  through: RecipeIngredient,
  foreignKey: 'ingredientId',
  otherKey: 'recipeId',
  as: 'recipes',
});

// Recipe <-> Tag (M:N)
Recipe.belongsToMany(Tag, {
  through: RecipeTag,
  foreignKey: 'recipeId',
  otherKey: 'tagId',
  as: 'tags',
});
Tag.belongsToMany(Recipe, {
  through: RecipeTag,
  foreignKey: 'tagId',
  otherKey: 'recipeId',
  as: 'recipes',
});

module.exports = {
  sequelize,
  User,
  Recipe,
  Ingredient,
  Tag,
  RecipeIngredient,
  RecipeTag,
};
