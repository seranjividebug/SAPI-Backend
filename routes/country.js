const countryController = require('../controllers/country');

async function countryRoutes(fastify, options) {
  // Get all countries with flags
  fastify.get('/api/countries', countryController.getCountries);

  // Get country by code with flag
  fastify.get('/api/countries/:code', countryController.getCountryByCode);
}

module.exports = countryRoutes;
