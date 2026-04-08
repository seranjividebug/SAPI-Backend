const pdfController = require('../controllers/pdf');

module.exports = async function (fastify, opts) {
  fastify.post('/dimension-analysis', pdfController.generateDimensionAnalysisPDF);
};
