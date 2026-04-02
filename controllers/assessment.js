const assessmentService = require('../services/assessment');
const scoringService = require('../services/scoring');

async function submitAssessment(request, reply) {
  try {
    console.log('Request body:', request.body);
    const { answers, userProfile } = request.body || {};

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      reply.code(400);
      return {
        success: false,
        error: 'Answers array is required'
      };
    }

    if (!userProfile || !userProfile.country || !userProfile.respondent_name || !userProfile.contact_email) {
      reply.code(400);
      return {
        success: false,
        error: 'User profile with country, respondent_name, and contact_email is required'
      };
    }

    // Save assessment with user profile and calculate scores
    const result = await assessmentService.processAssessment(request.server.pg, answers, userProfile);

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

module.exports = {
  submitAssessment,
  getResults
};
