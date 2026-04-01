const assessment = require('../controllers/assessment');

module.exports = async function (fastify, opts) {
  fastify.post('/submit', assessment.submitAssessment);
  fastify.get('/:id/results', assessment.getResults);
};
