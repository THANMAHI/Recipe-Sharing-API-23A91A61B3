// Set test environment before importing the app
process.env.NODE_ENV = 'test';

const app = require('../src/app');
const { sequelize } = require('../src/models');
const { seedDatabase } = require('../src/utils/seeder');

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

let server;

async function runTests() {
  console.log('--- Starting Integration Tests ---');
  
  // Set test environment
  process.env.NODE_ENV = 'test';
  
  // Sync database with force sync to clear anything from prior runs
  await sequelize.sync({ force: true });
  console.log('Test database tables synced.');
  
  // Seed database
  await seedDatabase();
  console.log('Test database seeded.');

  // Start the server
  server = app.listen(PORT, async () => {
    console.log(`Test server listening on port ${PORT}`);
    try {
      await executeTestCases();
      console.log('\n======================================');
      console.log('✅ ALL TEST CASES PASSED SUCCESSFULLY!');
      console.log('======================================');
      cleanup(0);
    } catch (error) {
      console.error('\n❌ TEST CASE FAILED:');
      console.error(error);
      cleanup(1);
    }
  });
}

function cleanup(exitCode) {
  if (server) {
    server.close(() => {
      console.log('Test server closed.');
      process.exit(exitCode);
    });
  } else {
    process.exit(exitCode);
  }
}

async function executeTestCases() {
  const post = async (path, body, headers = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const status = res.status;
    let json = {};
    try {
      json = await res.json();
    } catch (e) {}
    return { status, json };
  };

  const get = async (path, headers = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers,
    });
    const status = res.status;
    let json = {};
    try {
      json = await res.json();
    } catch (e) {}
    return { status, json };
  };

  const put = async (path, body, headers = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    const status = res.status;
    let json = {};
    try {
      json = await res.json();
    } catch (e) {}
    return { status, json };
  };

  const del = async (path, headers = {}) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    return { status: res.status };
  };

  // Test 1: Fetch ingredients and tags
  console.log('\nCase 1: Listing default tags and ingredients...');
  const { status: statusIngs, json: ings } = await get('/ingredients');
  const { status: statusTags, json: tags } = await get('/tags');
  
  if (statusIngs !== 200 || ings.length === 0) throw new Error('Failed to retrieve ingredients');
  if (statusTags !== 200 || tags.length === 0) throw new Error('Failed to retrieve tags');
  console.log(`- Retrieved ${ings.length} ingredients and ${tags.length} tags.`);

  const chickenIng = ings.find(i => i.name === 'Chicken Breast');
  const saltIng = ings.find(i => i.name === 'Salt');
  const spicyTag = tags.find(t => t.name === 'Spicy');
  const quickTag = tags.find(t => t.name === 'Quick');
  const vegetarianTag = tags.find(t => t.name === 'Vegetarian');
  const veganTag = tags.find(t => t.name === 'Vegan');

  if (!chickenIng || !saltIng || !spicyTag || !quickTag) {
    throw new Error('Default seeds are missing expected items.');
  }

  // Test 2: Register user 1
  console.log('\nCase 2: Registering User 1...');
  const { status: statusReg1, json: reg1 } = await post('/auth/register', {
    username: 'chef_john',
    email: 'john@example.com',
  });
  if (statusReg1 !== 201 || !reg1.apiKey) throw new Error('Failed to register User 1');
  const key1 = reg1.apiKey;
  const user1 = reg1.user;
  console.log(`- User 1 registered. ID: ${user1.id}. Key generated.`);

  // Test 3: Register user 2
  console.log('\nCase 3: Registering User 2...');
  const { status: statusReg2, json: reg2 } = await post('/auth/register', {
    username: 'chef_jane',
    email: 'jane@example.com',
  });
  if (statusReg2 !== 201 || !reg2.apiKey) throw new Error('Failed to register User 2');
  const key2 = reg2.apiKey;
  const user2 = reg2.user;
  console.log(`- User 2 registered. ID: ${user2.id}. Key generated.`);

  // Test 4: Register duplicate user (should fail)
  console.log('\nCase 4: Registering duplicate user...');
  const { status: statusRegDup, json: regDup } = await post('/auth/register', {
    username: 'chef_john',
    email: 'john@example.com',
  });
  if (statusRegDup !== 400) throw new Error('Expected 400 Bad Request for duplicate user registration, got ' + statusRegDup);
  console.log('- Duplicate registration blocked correctly.');

  // Test 5: Create recipe without API key (should fail)
  console.log('\nCase 5: Creating recipe without API key...');
  const { status: statusNoKey } = await post('/recipes', {
    title: 'Spicy Chicken Curry',
    instructions: 'Cook it all.',
    prep_time: 15,
    cook_time: 30,
    servings: 4,
    ingredients: [],
    tags: [],
  });
  if (statusNoKey !== 401) throw new Error('Expected 401 Unauthorized, got ' + statusNoKey);
  console.log('- Creation blocked correctly.');

  // Test 6: Create recipe with invalid API key (should fail)
  console.log('\nCase 6: Creating recipe with invalid API key...');
  const { status: statusBadKey } = await post('/recipes', {
    title: 'Spicy Chicken Curry',
    instructions: 'Cook it.',
    prep_time: 15,
    cook_time: 30,
    servings: 4,
  }, { 'X-API-Key': 'invalid_key_value' });
  if (statusBadKey !== 401) throw new Error('Expected 401 Unauthorized for invalid key, got ' + statusBadKey);
  console.log('- Creation blocked correctly.');

  // Test 7: Create recipe with valid API key
  console.log('\nCase 7: Creating recipe with valid API key (User 1)...');
  const { status: statusCreate, json: recipe1 } = await post('/recipes', {
    title: 'Spicy Chicken Curry',
    description: 'A delicious spicy curry.',
    instructions: '1. Heat oil. 2. Cook chicken. 3. Serve.',
    prep_time: 20,
    cook_time: 40,
    servings: 4,
    ingredients: [
      { id: chickenIng.id, quantity: 500, unit: 'grams' },
      { id: saltIng.id, quantity: 1, unit: 'teaspoon' },
    ],
    tags: [spicyTag.id, quickTag.id],
  }, { 'X-API-Key': key1 });

  if (statusCreate !== 201) throw new Error('Expected 201 Created, got ' + statusCreate);
  if (recipe1.title !== 'Spicy Chicken Curry') throw new Error('Recipe title mismatch');
  if (recipe1.ingredients.length !== 2) throw new Error('Ingredients length mismatch');
  if (recipe1.tags.length !== 2) throw new Error('Tags length mismatch');
  if (recipe1.author.id !== user1.id) throw new Error('Author ID mismatch');
  console.log(`- Recipe created successfully. ID: ${recipe1.id}`);

  // Test 8: Get recipe details by ID
  console.log('\nCase 8: Fetching recipe by ID...');
  const { status: statusGet, json: getRec } = await get(`/recipes/${recipe1.id}`);
  if (statusGet !== 200) throw new Error('Expected 200 OK, got ' + statusGet);
  
  // Verify junction details are flattened
  const chickenItem = getRec.ingredients.find(i => i.id === chickenIng.id);
  if (!chickenItem || chickenItem.quantity !== 500 || chickenItem.unit !== 'grams') {
    throw new Error('Junction attributes (quantity/unit) are missing or incorrect');
  }
  console.log('- Recipe retrieved. Ingredients contain flattened quantity and unit details.');

  // Test 9: Get non-existent recipe by ID (should fail)
  console.log('\nCase 9: Fetching non-existent recipe...');
  const { status: statusGetMissing } = await get('/recipes/9999');
  if (statusGetMissing !== 404) throw new Error('Expected 404 Not Found, got ' + statusGetMissing);
  console.log('- Returned 404 Not Found correctly.');

  // Test 10: Update recipe with unauthorized user (User 2)
  console.log('\nCase 10: Updating recipe with unauthorized user (User 2)...');
  const { status: statusUpdateUnauth } = await put(`/recipes/${recipe1.id}`, {
    title: 'Hacked Title',
  }, { 'X-API-Key': key2 });
  if (statusUpdateUnauth !== 403) throw new Error('Expected 403 Forbidden, got ' + statusUpdateUnauth);
  console.log('- Update blocked with 403 Forbidden correctly.');

  // Test 11: Update recipe with authorized user (User 1)
  console.log('\nCase 11: Updating recipe with owner (User 1)...');
  const { status: statusUpdate, json: updatedRec } = await put(`/recipes/${recipe1.id}`, {
    title: 'Mild Chicken Curry',
    prep_time: 15,
    cook_time: 35,
    ingredients: [
      { id: chickenIng.id, quantity: 600, unit: 'grams' }, // updated quantity
    ],
    tags: [quickTag.id], // removed spicy tag
  }, { 'X-API-Key': key1 });

  if (statusUpdate !== 200) throw new Error('Expected 200 OK, got ' + statusUpdate);
  if (updatedRec.title !== 'Mild Chicken Curry') throw new Error('Title update failed');
  if (updatedRec.ingredients.length !== 1) throw new Error('Ingredients update sync failed');
  if (updatedRec.tags.length !== 1) throw new Error('Tags update sync failed');
  console.log('- Recipe updated and relationships synchronized successfully.');

  // Let's create another recipe to test list filters
  // Recipe 2: Quick Salt Water (quick, vegetarian, vegan)
  console.log('\nCase 12: Creating Recipe 2 (Quick Salt Water, Vegan)...');
  const { status: statusCreate2, json: recipe2 } = await post('/recipes', {
    title: 'Quick Salt Water',
    instructions: 'Mix and drink.',
    prep_time: 2,
    cook_time: 1,
    servings: 1,
    ingredients: [
      { id: saltIng.id, quantity: 0.5, unit: 'teaspoon' },
    ],
    tags: [quickTag.id, veganTag.id, vegetarianTag.id],
  }, { 'X-API-Key': key1 });
  if (statusCreate2 !== 201) throw new Error('Failed to create recipe 2');
  console.log(`- Recipe 2 created. ID: ${recipe2.id}`);

  // Test 12: List recipes and test filter: max_cook_time
  console.log('\nCase 13: Listing recipes with max_cook_time=5...');
  const { status: statusListCook, json: listCook } = await get('/recipes?max_cook_time=5');
  if (statusListCook !== 200) throw new Error('Expected 200 OK');
  if (listCook.length !== 1 || listCook[0].id !== recipe2.id) {
    throw new Error('max_cook_time filter failed. Returned: ' + JSON.stringify(listCook));
  }
  console.log('- cook_time filtering validated.');

  // Test 13: List recipes and test filter: tags=Vegan,Quick (AND intersection)
  console.log('\nCase 14: Filtering by tags (AND intersection: Vegan AND Quick)...');
  const { status: statusListTag, json: listTagsFiltered } = await get(`/recipes?tags=Vegan,Quick`);
  if (statusListTag !== 200) throw new Error('Expected 200');
  if (listTagsFiltered.length !== 1 || listTagsFiltered[0].id !== recipe2.id) {
    throw new Error('Tag AND filtering failed. Recipe 1 is NOT vegan, but Recipe 2 is.');
  }
  console.log('- Tag AND-intersection filtering validated.');

  // Test 14: Filter by multiple tags that no recipe has together
  console.log('\nCase 15: Filtering by tags that don\'t match (Spicy AND Vegan)...');
  const { status: statusListTagEmpty, json: listTagsEmpty } = await get(`/recipes?tags=Spicy,Vegan`);
  if (statusListTagEmpty !== 200) throw new Error('Expected 200');
  if (listTagsEmpty.length !== 0) {
    throw new Error('Expected empty array for Spicy AND Vegan');
  }
  console.log('- Tag mismatch returned empty array correctly.');

  // Test 15: Delete recipe with unauthorized user (User 2)
  console.log('\nCase 16: Deleting recipe with unauthorized user...');
  const { status: statusDelUnauth } = await del(`/recipes/${recipe1.id}`, { 'X-API-Key': key2 });
  if (statusDelUnauth !== 403) throw new Error('Expected 403, got ' + statusDelUnauth);
  console.log('- Deletion unauthorized check verified.');

  // Test 16: Delete recipe with owner (User 1)
  console.log('\nCase 17: Deleting recipe with owner...');
  const { status: statusDel } = await del(`/recipes/${recipe1.id}`, { 'X-API-Key': key1 });
  if (statusDel !== 204) throw new Error('Expected 204 No Content, got ' + statusDel);
  console.log('- Recipe 1 deleted.');

  // Test 17: Verify Recipe 1 is gone
  console.log('\nCase 18: Verifying Recipe 1 is gone...');
  const { status: statusVerifyGone } = await get(`/recipes/${recipe1.id}`);
  if (statusVerifyGone !== 404) throw new Error('Expected 404 for deleted recipe');
  console.log('- Recipe deletion confirmed.');
}

runTests();
