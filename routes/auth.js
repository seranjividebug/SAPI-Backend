const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Public routes
  fastify.post('/register', auth.register);
  fastify.post('/login', auth.login);

  // Protected routes - require user (role 2 or admin)
  fastify.get('/me', {
    preHandler: [auth.verifyToken, auth.requireUser]
  }, auth.getCurrentUser);

  // Protected routes - require admin (role 1 only)
  fastify.get('/users', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, auth.getUsers);

  fastify.get('/users/:id', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, auth.getUserById);

  fastify.put('/users/:id', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, auth.updateUser);

  fastify.delete('/users/:id', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, auth.deleteUser);
}

module.exports = routes;
