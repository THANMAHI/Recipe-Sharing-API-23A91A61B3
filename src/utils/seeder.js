const { Ingredient, Tag } = require('../models');

const defaultIngredients = [
  { name: 'Chicken Breast', category: 'Poultry' },
  { name: 'Salt', category: 'Seasoning' },
  { name: 'Black Pepper', category: 'Seasoning' },
  { name: 'Olive Oil', category: 'Fats & Oils' },
  { name: 'Garlic', category: 'Vegetables' },
  { name: 'Onion', category: 'Vegetables' },
  { name: 'Tomato', category: 'Vegetables' },
  { name: 'Rice', category: 'Grains' },
  { name: 'Flour', category: 'Baking' },
  { name: 'Butter', category: 'Dairy' },
  { name: 'Milk', category: 'Dairy' },
  { name: 'Egg', category: 'Dairy' },
  { name: 'Sugar', category: 'Baking' },
];

const defaultTags = [
  { name: 'Spicy' },
  { name: 'Vegan' },
  { name: 'Vegetarian' },
  { name: 'Quick' },
  { name: 'Gluten-Free' },
  { name: 'Dessert' },
  { name: 'Dinner' },
  { name: 'Healthy' },
];

async function seedDatabase() {
  try {
    const ingredientCount = await Ingredient.count();
    if (ingredientCount === 0) {
      await Ingredient.bulkCreate(defaultIngredients);
      console.log('Successfully seeded default ingredients.');
    }

    const tagCount = await Tag.count();
    if (tagCount === 0) {
      await Tag.bulkCreate(defaultTags);
      console.log('Successfully seeded default tags.');
    }
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

module.exports = { seedDatabase };
