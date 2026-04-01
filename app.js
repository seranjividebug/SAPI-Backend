const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const postgres = require('@fastify/postgres');
require('dotenv').config();

// Register plugins
fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || '*'
});

fastify.register(postgres, {
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false
  }
});

// Register routes
fastify.register(require('./routes/questions'), { prefix: '/api/questions' });
fastify.register(require('./routes/assessment'), { prefix: '/api/assessment' });
fastify.register(require('./routes/roadmap'), { prefix: '/api/roadmap' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

module.exports = fastify;
