const roadmap = require('../controllers/roadmap');

module.exports = async function (fastify, opts) {
  fastify.post('/generate', roadmap.generateRoadmap);
};
