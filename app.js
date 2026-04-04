const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const postgres = require('@fastify/postgres');
require('dotenv').config();

// Register plugins
fastify.register(cors, {
  origin: [
    'http://localhost:3000',
    'https://sapi-livid.vercel.app/',
    /\.vercel\.app$/
  ],
  credentials: true
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
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
  ssl: {
    rejectUnauthorized: false
  }
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/userProfile'), { prefix: '/api/profile' });
fastify.register(require('./routes/questions'), { prefix: '/api/questions' });
fastify.register(require('./routes/assessment'), { prefix: '/api/assessment' });
fastify.register(require('./routes/roadmap'), { prefix: '/api/roadmap' });

// Health check endpoint
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

module.exports = fastify;
