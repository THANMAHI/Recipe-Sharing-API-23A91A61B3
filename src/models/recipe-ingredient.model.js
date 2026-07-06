const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeIngredient = sequelize.define('RecipeIngredient', {
  recipeId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'recipe_id',
    references: {
      model: 'recipes',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  ingredientId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'ingredient_id',
    references: {
      model: 'ingredients',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    validate: {
      min: 0,
    },
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
}, {
  tableName: 'recipe_ingredients',
  underscored: true,
  timestamps: false,
});

module.exports = RecipeIngredient;
