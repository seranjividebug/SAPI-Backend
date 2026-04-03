const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Public routes
  fastify.post('/register', auth.register);
  fastify.post('/login', auth.login);
}

module.exports = routes;
