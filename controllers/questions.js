const questionsService = require('../services/questions');

async function getAllQuestions(request, reply) {
  try {
    const questions = await questionsService.getAllQuestions();
    return {
      success: true,
      data: questions
    };
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getAllQuestions
};
