const contact = require('../controllers/contact');
const auth = require('../controllers/auth');

async function routes(fastify, options) {
  // Public route - submit contact request
  fastify.post('/submit', contact.submitContactRequest);

  // Public route - submit credential request
  fastify.post('/credential', contact.submitCredentialRequest);

  // Public route - submit briefed index request
  fastify.post('/briefed-index', contact.submitBriefedIndexRequest);

  // Protected route - get all contact requests (admin only)
  fastify.get('/', {
    preHandler: [auth.verifyToken, auth.requireAdmin]
  }, contact.getContactRequests);
}

module.exports = routes;
