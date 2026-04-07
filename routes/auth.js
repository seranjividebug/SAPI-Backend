const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Public routes
  fastify.post('/register', auth.register);
  fastify.post('/login', auth.login);
  
  // Protected routes - require admin
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
