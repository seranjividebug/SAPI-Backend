const assessmentService = require('../services/assessment');
const scoringService = require('../services/scoring');

async function submitAssessment(request, reply) {
  try {
    const { answers, profile_id } = request.body || {};

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      reply.code(400);
      return {
        success: false,
        error: 'Answers array is required'
      };
    }

    if (!profile_id) {
      reply.code(400);
      return {
        success: false,
        error: 'profile_id is required. Create a profile first using POST /api/profile'
      };
    }

    // Save assessment with existing profile_id and calculate scores
    const result = await assessmentService.processAssessment(request.server.pg, answers, profile_id);

    return {
      success: true,
      data: result
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

async function getResults(request, reply) {
  try {
    const { id } = request.params;
    const result = await assessmentService.getResults(request.server.pg, id);

    if (!result) {
      reply.code(404);
      return {
        success: false,
        error: 'Assessment not found'
      };
    }

    return {
      success: true,
      data: result
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

async function getAssessmentDetails(request, reply) {
  try {
    const { id } = request.params;
    const result = await assessmentService.getAssessmentDetails(request.server.pg, id);

    if (!result) {
      reply.code(404);
      return {
        success: false,
        error: 'Assessment not found'
      };
    }

    return {
      success: true,
      data: result
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
  submitAssessment,
  getResults,
  getAssessmentDetails
};
