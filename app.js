const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const postgres = require('@fastify/postgres');
require('dotenv').config();

// Register plugins
fastify.register(cors, {
  origin: true,
  credentials: true
});

// Set default content type to UTF-8
fastify.addHook('onSend', async (request, reply, payload) => {
  reply.header('Content-Type', 'application/json; charset=utf-8');
  return payload;
});

// Parse text/plain as JSON (for Postman/other clients sending wrong content-type)
fastify.addContentTypeParser('text/plain', { parseAs: 'string' }, function (req, body, done) {
  try {
    const json = JSON.parse(body);
    done(null, json);
  } catch (err) {
    done(err, undefined);
  }
});

fastify.register(postgres, {
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require&connect_timeout=10`,
  ssl: {
    rejectUnauthorized: false
  },
  afterConnect: async (client) => {
    await client.query('SET search_path TO sapi,public');
  }
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/userProfile'), { prefix: '/api/profile' });
fastify.register(require('./routes/questions'), { prefix: '/api/questions' });
fastify.register(require('./routes/assessment'), { prefix: '/api/assessment' });
fastify.register(require('./routes/roadmap'), { prefix: '/api/roadmap' });
fastify.register(require('./routes/dashboard'), { prefix: '/api/dashboard' });
fastify.register(require('./routes/pdf'), { prefix: '/api/pdf' });
fastify.register(require('./routes/country'));

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

module.exports = fastify;
