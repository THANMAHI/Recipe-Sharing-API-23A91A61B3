const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recipe = sequelize.define('Recipe', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  prepTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'prep_time',
    validate: {
      min: 0,
    },
  },
  cookTime: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'cook_time',
    validate: {
      min: 0,
    },
  },
  servings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
    },
  },
}, {
  tableName: 'recipes',
  underscored: true,
  timestamps: true,
});

module.exports = Recipe;
