const roadmapService = require('../services/roadmap');

async function generateRoadmap(request, reply) {
  try {
    const { dimensionScores, sapiScore } = request.body;

    if (!dimensionScores || sapiScore === undefined) {
      reply.code(400);
      return {
        success: false,
        error: 'Dimension scores and SAPI score are required'
      };
    }

    const roadmap = roadmapService.generateRoadmap(dimensionScores, sapiScore);

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
