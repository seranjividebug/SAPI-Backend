const userProfile = require('../controllers/userProfile');
const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Create user profile (POST) - public, no authentication required
  fastify.post('/', userProfile.createProfile);
  
  // Update user profile (PUT) - requires authentication
  fastify.put('/:id', { preHandler: auth.verifyToken }, userProfile.updateProfile);
  
  // Get all profiles
  fastify.get('/', userProfile.getAllProfiles);
  
  // Get single profile by ID
  fastify.get('/:id', userProfile.getProfile);
}

module.exports = routes;
