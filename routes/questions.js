const questions = require('../controllers/questions');

module.exports = async function (fastify, opts) {
  fastify.get('/', questions.getAllQuestions);
};
