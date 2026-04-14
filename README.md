# SAPI Backend

Sovereign AI Power Index Backend API built with Node.js, Fastify, and PostgreSQL.

## Project Structure

```
/server
  /routes          # API route definitions
  /controllers     # Request handlers
  /services        # Business logic
  /models          # Database schema and seed data
  /plugins         # Fastify plugins
  /utils           # Utility functions
  app.js           # Fastify app configuration
  server.js        # Server entry point
  .env             # Environment variables
```

## Installation

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables in `.env`:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sapi_db
DB_USER=postgres
DB_PASSWORD=your_password
```

3. Set up PostgreSQL database:
```bash
psql -U postgres -f models/schema.sql
psql -U postgres -f models/seed.sql
```

4. Start the server:
```bash
npm start
# or for development
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `POST /api/auth/register` - Register a new user
  - Request body: `{ full_name, email, role }`
  - Required fields: `full_name`, `email`
  - Optional: `role` (1 = admin, 2 = user, defaults to 2)
  - Password is auto-generated as "Sapi@123" and returned in response
- `POST /api/auth/login` - Login with email and password
  - Request body: `{ email, password }`
- `GET /api/auth/me` - Get current authenticated user (requires token)
- `GET /api/auth/users` - Get all users (admin only, requires token)
- `GET /api/auth/users/:id` - Get user by ID (admin only, requires token)
- `PUT /api/auth/users/:id` - Update user (admin only, requires token)
- `DELETE /api/auth/users/:id` - Delete user (admin only, requires token)

### Questions
- `GET /api/questions` - Get all 30 questions grouped by dimension

### Assessment
- `POST /api/assessment/submit` - Submit answers and get scores
- `GET /api/assessment/:id/results` - Get assessment results

### Roadmap
- `POST /api/roadmap/generate` - Generate improvement roadmap

### Contact (Start the Conversation)
- `POST /api/contact/submit` - Submit contact request form (public)
  - Request body: `{ name, email, organization, role, area_of_interest, message }`
  - Required fields: `name`, `email`, `message`
- `GET /api/contact/` - Get all contact requests (admin only, requires authentication)

## SAPI Score Formula

SAPI Score = D1^0.175 × D2^0.225 × D3^0.175 × D4^0.125 × D5^0.275

## Tier Classification

- 80-100: Sovereign AI Leader
- 60-79: Advanced
- 40-59: Developing
- 20-39: Nascent
- 1-19: Pre-conditions Unmet
