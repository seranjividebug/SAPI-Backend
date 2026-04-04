const userProfile = require('../controllers/userProfile');
const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Create user profile (POST) - requires authentication
  fastify.post('/', { preHandler: auth.verifyToken }, userProfile.createProfile);
  
  // Get all profiles
  fastify.get('/', userProfile.getAllProfiles);
  
  // Get single profile by ID
  fastify.get('/:id', userProfile.getProfile);
}

module.exports = routes;
