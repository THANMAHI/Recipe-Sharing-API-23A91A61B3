const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RecipeTag = sequelize.define('RecipeTag', {
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
  tagId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'tag_id',
    references: {
      model: 'tags',
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'recipe_tags',
  underscored: true,
  timestamps: false,
});

module.exports = RecipeTag;
