const dashboard = require('../controllers/dashboard');
const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // All dashboard routes require authentication and admin role
  fastify.addHook('onRequest', auth.verifyToken);
  fastify.addHook('onRequest', auth.requireAdmin);

  // Get dashboard stats (stats cards, tier distribution, top countries)
  fastify.get('/stats', dashboard.getDashboardStats);

  // Get paginated assessments list with filters
  fastify.get('/assessments', dashboard.getAssessments);

  // Get filter options (countries, tiers, score ranges)
  fastify.get('/filters', dashboard.getFilterOptions);

  // Export assessments
  fastify.get('/export/:format', dashboard.exportAssessments);
}

module.exports = routes;
