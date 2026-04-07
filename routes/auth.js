const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Public routes
  fastify.post('/register', auth.register);
  fastify.post('/login', auth.login);
  
  // Protected routes - require admin
  fastify.get('/users', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, auth.getUsers);
}

module.exports = routes;
