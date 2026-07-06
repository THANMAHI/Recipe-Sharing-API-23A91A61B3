# Recipe Sharing REST API

A robust RESTful API for a recipe sharing platform built with **Node.js**, **Express**, and **Sequelize ORM**. It features secure hashed API Key authentication, many-to-many junction tables carrying custom attributes (quantity and unit), transaction-safe CRUD operations, optimized eager loading to resolve N+1 queries, and advanced intersection (AND) filtering for tags and ingredients.

---

## Features
- **Secure API Key Auth**: Cryptographically hashes client keys using SHA-256 for direct lookup. Raw keys are never stored.
- **Many-to-Many Relationships**: Normalizes ingredients and tags, utilizing custom junction tables (`recipe_ingredients` and `recipe_tags`) with transactional safety.
- **AND-Intersection Filtering**: Allows listing recipes that have *all* requested tags and ingredients simultaneously using SQL COUNT/HAVING aggregation.
- **O(1) Query Complexity (No N+1 Issues)**: Fetches nested relationships (author, ingredients with quantities/units, and tags) using a single optimized SQL join.
- **Automatic Database Seeding**: Detects empty database states and automatically seeds a default taxonomy of ingredients and tags on startup.

---

## Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ recipes : creates_and_owns
    recipes ||--|{ recipe_ingredients : requires
    ingredients ||--|{ recipe_ingredients : is_included_in
    recipes ||--|{ recipe_tags : is_categorized_by
    tags ||--|{ recipe_tags : is_applied_to

    users {
        int id PK
        string username UNIQUE
        string email UNIQUE
        string api_key_hash
        timestamp created_at
    }

    recipes {
        int id PK
        int user_id FK
        string title
        text description
        text instructions
        int prep_time
        int cook_time
        int servings
        timestamp created_at
    }

    ingredients {
        int id PK
        string name UNIQUE
        string category
    }

    tags {
        int id PK
        string name UNIQUE
    }

    recipe_ingredients {
        int recipe_id PK_FK
        int ingredient_id PK_FK
        float quantity
        string unit
    }

    recipe_tags {
        int recipe_id PK_FK
        int tag_id PK_FK
    }
```

---

## Setup & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (usually bundled with Node.js)

### Installation
1. Clone the repository and navigate to the directory:
   ```bash
   cd Recipe-API
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create the environment configuration. A `.env` file with working SQLite configurations is already created. For customization, you can modify it:
   ```bash
   cp .env.example .env
   ```

### Starting the Server
Start the development server (runs nodemon on port 3000):
```bash
npm run dev
```

Run in production mode:
```bash
npm start
```

### Running Automated Integration Tests
To run the 18-case automated integration suite (launches a temporary test server on port 3001 and runs fetch test assertions):
```bash
npm test
```

---

## Environment Variables Configuration
Modify the `.env` file to customize settings:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | The port the server listens on | `3000` |
| `NODE_ENV` | Running environment mode (`development`, `production`, `test`) | `development` |
| `DB_DIALECT` | SQL dialect to use (`sqlite`, `postgres`, `mysql`) | `sqlite` |
| `DB_STORAGE` | SQLite file location (only if dialect is `sqlite`) | `database.sqlite` |
| `DB_LOGGING` | Log raw SQL commands to console | `true` |
| `DB_FORCE_SYNC` | Drop tables and recreate them on server startup | `false` |
| `DB_NAME` | Database name (Postgres/MySQL) | `recipe_db` |
| `DB_USER` | Database username (Postgres/MySQL) | `root` |
| `DB_PASSWORD` | Database password (Postgres/MySQL) | `secret` |
| `DB_HOST` | Database host (Postgres/MySQL) | `127.0.0.1` |
| `DB_PORT` | Database port (Postgres/MySQL) | `5432` |

---

## API Documentation

### Authentication & Headers
For protected endpoints, you must include the following header:
```http
X-API-Key: YOUR_RAW_API_KEY
```

---

### 1. User Registration
Creates a new user profile and returns a raw API key exactly once.

- **URL**: `/auth/register`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "username": "chef_john",
  "email": "john@example.com"
}
```
- **Response (201 Created)**:
```json
{
  "user": {
    "id": 1,
    "username": "chef_john",
    "email": "john@example.com",
    "createdAt": "2026-07-06T09:22:00.000Z"
  },
  "apiKey": "e2a1cf8bc38a9d... (64-character raw key)"
}
```
- **Response (400 Bad Request)**:
```json
{
  "error": "Bad Request",
  "message": "Username or email already exists."
}
```

---

### 2. Create Recipe (Protected)
Atomically inserts a new recipe, creating junction entries.

- **URL**: `/recipes`
- **Method**: `POST`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-Key: YOUR_API_KEY`
- **Request Body**:
```json
{
  "title": "Spicy Chicken Curry",
  "description": "A quick, spicy Indian chicken curry.",
  "instructions": "1. Heat olive oil in pan. 2. Sauté onions and garlic. 3. Add chicken and cook.",
  "prep_time": 20,
  "cook_time": 40,
  "servings": 4,
  "ingredients": [
    { "id": 1, "quantity": 500, "unit": "grams" },
    { "id": 2, "quantity": 1, "unit": "teaspoon" }
  ],
  "tags": [1, 4]
}
```
- **Response (201 Created)**:
```json
{
  "id": 1,
  "title": "Spicy Chicken Curry",
  "description": "A quick, spicy Indian chicken curry.",
  "instructions": "1. Heat olive oil in pan. 2. Sauté onions and garlic. 3. Add chicken and cook.",
  "prep_time": 20,
  "cook_time": 40,
  "servings": 4,
  "created_at": "2026-07-06T09:22:30.000Z",
  "author": {
    "id": 1,
    "username": "chef_john"
  },
  "ingredients": [
    {
      "id": 1,
      "name": "Chicken Breast",
      "category": "Poultry",
      "quantity": 500,
      "unit": "grams"
    },
    {
      "id": 2,
      "name": "Salt",
      "category": "Seasoning",
      "quantity": 1,
      "unit": "teaspoon"
    }
  ],
  "tags": [
    { "id": 1, "name": "Spicy" },
    { "id": 4, "name": "Quick" }
  ]
}
```

---

### 3. List Recipes (Public)
Retrieve recipes. Supports optional query parameters.

- **URL**: `/recipes`
- **Method**: `GET`
- **Query Parameters**:
  - `tags`: Comma-separated list of tag names or IDs. (Performs `AND` intersection matching recipes containing ALL tags).
  - `ingredients`: Comma-separated list of ingredient names or IDs. (Performs `AND` intersection matching recipes containing ALL ingredients).
  - `max_cook_time`: Integer representing maximum minutes.
- **Example URL**: `/recipes?tags=Vegan,Quick&max_cook_time=15`
- **Response (200 OK)**:
```json
[
  {
    "id": 2,
    "title": "Quick Salt Water",
    "description": null,
    "instructions": "Mix and drink.",
    "prep_time": 2,
    "cook_time": 1,
    "servings": 1,
    "created_at": "2026-07-06T09:23:00.000Z",
    "author": {
      "id": 1,
      "username": "chef_john"
    },
    "ingredients": [
      {
        "id": 2,
        "name": "Salt",
        "category": "Seasoning",
        "quantity": 0.5,
        "unit": "teaspoon"
      }
    ],
    "tags": [
      { "id": 2, "name": "Vegan" },
      { "id": 3, "name": "Vegetarian" },
      { "id": 4, "name": "Quick" }
    ]
  }
]
```

---

### 4. Get Recipe Details (Public)
Retrieve detailed recipe by ID.

- **URL**: `/recipes/:id`
- **Method**: `GET`
- **Response (200 OK)**:
```json
{
  "id": 1,
  "title": "Spicy Chicken Curry",
  "prep_time": 20,
  "cook_time": 40,
  "author": {
    "id": 1,
    "username": "chef_john"
  },
  "ingredients": [
    {
      "id": 1,
      "name": "Chicken Breast",
      "category": "Poultry",
      "quantity": 500,
      "unit": "grams"
    }
  ],
  "tags": [
    { "id": 1, "name": "Spicy" }
  ]
}
```
- **Response (404 Not Found)**:
```json
{
  "error": "Not Found",
  "message": "Recipe with ID 9999 not found."
}
```

---

### 5. Update Recipe (Protected, Owner Only)
Updates general recipe details and syncs tags/ingredients.

- **URL**: `/recipes/:id`
- **Method**: `PUT`
- **Headers**:
  - `Content-Type: application/json`
  - `X-API-Key: YOUR_API_KEY`
- **Request Body**: (Sends partial attributes, or syncs arrays)
```json
{
  "title": "Mild Chicken Curry",
  "cook_time": 35,
  "tags": [4]
}
```
- **Response (200 OK)**: (Returns complete updated recipe representation)
- **Response (403 Forbidden)**: (If updated by someone other than the author)
```json
{
  "error": "Forbidden",
  "message": "You do not have permission to update this recipe."
}
```

---

### 6. Delete Recipe (Protected, Owner Only)
Deletes a recipe and cascades removal of junction rows.

- **URL**: `/recipes/:id`
- **Method**: `DELETE`
- **Headers**: `X-API-Key: YOUR_API_KEY`
- **Response (204 No Content)**: (Empty body on success)
- **Response (403 Forbidden)**: (If caller is not the author)

---

### 7. List Ingredients (Public)
Returns a list of all system ingredients.

- **URL**: `/ingredients`
- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  { "id": 1, "name": "Chicken Breast", "category": "Poultry" },
  { "id": 2, "name": "Salt", "category": "Seasoning" }
]
```

---

### 8. List Tags (Public)
Returns a list of all system tags.

- **URL**: `/tags`
- **Method**: `GET`
- **Response (200 OK)**:
```json
[
  { "id": 4, "name": "Quick" },
  { "id": 1, "name": "Spicy" }
]
```

---

## Security & API Key Flow

### Cryptographic Rationale
Storing client API keys in plaintext inside database tables is a severe security risk. If the database gets leaked or compromised, attackers gain immediate unauthorized access to all user accounts. 

To mitigate this:
1. **Generation**: The application generates a secure random 64-character hexadecimal string via `crypto.randomBytes(32).toString('hex')`.
2. **Hashing**: The key is immediately hashed using `crypto.createHash('sha256').update(key).digest('hex')`.
3. **Storage**: Only the **hash** is stored in the database (`api_key_hash`). The raw key is returned to the user *once* in the registration response.
4. **Validation**: When the client requests an endpoint with the header `X-API-Key: e2a1cf...`, the server hashes the provided value and does a direct index lookup:
   ```sql
   SELECT * FROM users WHERE api_key_hash = 'sha256_hash_of_provided_key' LIMIT 1;
   ```
   This is cryptographically secure, deterministic, avoids raw key exposure, and executes in $O(1)$ query lookup speed.
