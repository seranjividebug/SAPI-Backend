const roadmapService = require('../services/roadmap');

async function generateRoadmap(request, reply) {
  try {
    const { dimensionScores } = request.body;

    if (!dimensionScores) {
      reply.code(400);
      return {
        success: false,
        error: 'Dimension scores are required'
      };
    }

    const roadmap = roadmapService.generateRoadmap(dimensionScores);

    return {
      success: true,
      data: roadmap
    };
  } catch (error) {
    request.log.error(error);
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateRoadmap
};
