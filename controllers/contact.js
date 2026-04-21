const { v4: uuidv4 } = require('uuid');
const { sendContactNotificationEmail, sendBriefedIndexRequestEmail, sendCredentialRequestEmail } = require('../services/email');

async function submitContactRequest(request, reply) {
  try {
    request.log.info('[Contact] Submit request received');
    const { name, email, organization, role, area_of_interest, message } = request.body || {};

    request.log.info('[Contact] Validating request data');
    // Validation
    if (!name || !email || !message) {
      request.log.warn('[Contact] Validation failed: Missing required fields');
      reply.code(400);
      return {
        success: false,
        error: 'Name, email, and message are required'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      request.log.warn('[Contact] Validation failed: Invalid email format');
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    request.log.info('[Contact] Connecting to database');
    const client = await request.server.pg.connect();

    try {
      request.log.info('[Contact] Inserting contact request');
      // Insert contact request
      const requestId = uuidv4();
      const result = await client.query(
        `INSERT INTO sapi.contact_requests (id, name, email, organization, role, area_of_interest, message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, organization, role, area_of_interest, message, created_at`,
        [requestId, name, email, organization, role, area_of_interest, message]
      );

      const contactRequest = result.rows[0];
      request.log.info('[Contact] Contact request inserted successfully', { requestId });

      // Send email notification
      request.log.info('[Contact] Sending email notification');
      const emailResult = await sendContactNotificationEmail(name, email, organization, role, area_of_interest, message);

      // Format created_at as UK time
      const date = new Date(contactRequest.created_at);
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = ukFormatter.formatToParts(date);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

      request.log.info('[Contact] Request completed successfully');
      return {
        success: true,
        message: 'Contact request submitted successfully',
        data: {
          id: contactRequest.id,
          name: contactRequest.name,
          email: contactRequest.email,
          organization: contactRequest.organization,
          role: contactRequest.role,
          area_of_interest: contactRequest.area_of_interest,
          message: contactRequest.message,
          created_at: createdAtUK,
          email_sent: emailResult.success,
          email_message: emailResult.success ? 'Notification email sent successfully' : `Failed to send notification email: ${emailResult.error || 'Unknown error'}`
        }
      };
    } catch (dbError) {
      request.log.error('[Contact] Database error:', { error: dbError.message, stack: dbError.stack });
      reply.code(500);
      return {
        success: false,
        error: 'Database error occurred',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      };
    } finally {
      client.release();
    }
  } catch (error) {
    request.log.error('[Contact] Unexpected error:', { error: error.message, stack: error.stack });
    reply.code(500);
    return {
      success: false,
      error: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

// Submit Credential request
async function submitCredentialRequest(request, reply) {
  try {
    request.log.info('[Credential] Submit request received');
    const { fullName, officialTitle, entity, country, email, intendedUse, briefContext } = request.body || {};

    request.log.info('[Credential] Validating request data');
    // Validation
    if (!fullName || !officialTitle || !email || !intendedUse) {
      request.log.warn('[Credential] Validation failed: Missing required fields');
      reply.code(400);
      return {
        success: false,
        error: 'Full name, official title, email, and intended use are required'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      request.log.warn('[Credential] Validation failed: Invalid email format');
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    request.log.info('[Credential] Connecting to database');
    const client = await request.server.pg.connect();

    try {
      request.log.info('[Credential] Inserting credential request');
      // Insert credential request
      const requestId = uuidv4();
      const result = await client.query(
        `INSERT INTO sapi.credential_requests (id, full_name, official_title, entity, country, email, intended_use, brief_context)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, full_name, official_title, entity, country, email, intended_use, brief_context, created_at`,
        [requestId, fullName, officialTitle, entity, country, email, intendedUse, briefContext]
      );

      const credentialRequest = result.rows[0];
      request.log.info('[Credential] Request inserted successfully', { requestId });

      // Send email notification
      request.log.info('[Credential] Sending email notification');
      const emailResult = await sendCredentialRequestEmail(fullName, officialTitle, entity, country, email, intendedUse, briefContext);

      // Format created_at as UK time
      const date = new Date(credentialRequest.created_at);
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = ukFormatter.formatToParts(date);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

      request.log.info('[Credential] Request completed successfully');
      return {
        success: true,
        message: 'Credential request submitted successfully',
        data: {
          id: credentialRequest.id,
          full_name: credentialRequest.full_name,
          official_title: credentialRequest.official_title,
          entity: credentialRequest.entity,
          country: credentialRequest.country,
          email: credentialRequest.email,
          intended_use: credentialRequest.intended_use,
          brief_context: credentialRequest.brief_context,
          created_at: createdAtUK,
          email_sent: emailResult.success,
          email_message: emailResult.success ? 'Notification email sent successfully' : `Failed to send notification email: ${emailResult.error || 'Unknown error'}`
        }
      };
    } catch (dbError) {
      request.log.error('[Credential] Database error:', { error: dbError.message, stack: dbError.stack });
      reply.code(500);
      return {
        success: false,
        error: 'Database error occurred',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      };
    } finally {
      client.release();
    }
  } catch (error) {
    request.log.error('[Credential] Unexpected error:', { error: error.message, stack: error.stack });
    reply.code(500);
    return {
      success: false,
      error: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

// Submit Briefed Index request
async function submitBriefedIndexRequest(request, reply) {
  try {
    request.log.info('[BriefedIndex] Submit request received');
    const { name, email, institution, behalfOf, additionalContext } = request.body || {};

    request.log.info('[BriefedIndex] Validating request data');
    // Validation
    if (!name || !email || !institution) {
      request.log.warn('[BriefedIndex] Validation failed: Missing required fields');
      reply.code(400);
      return {
        success: false,
        error: 'Name, email, and institution are required'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      request.log.warn('[BriefedIndex] Validation failed: Invalid email format');
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    request.log.info('[BriefedIndex] Connecting to database');
    const client = await request.server.pg.connect();

    try {
      request.log.info('[BriefedIndex] Inserting briefed index request');
      // Insert briefed index request
      const requestId = uuidv4();
      const result = await client.query(
        `INSERT INTO sapi.briefed_index_requests (id, name, email, institution, behalf_of, additional_context)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, email, institution, behalf_of, additional_context, created_at`,
        [requestId, name, email, institution, behalfOf, additionalContext]
      );

      const briefedIndexRequest = result.rows[0];
      request.log.info('[BriefedIndex] Request inserted successfully', { requestId });

      // Send email notification
      request.log.info('[BriefedIndex] Sending email notification');
      const emailResult = await sendBriefedIndexRequestEmail(name, email, institution, behalfOf, additionalContext);

      // Format created_at as UK time
      const date = new Date(briefedIndexRequest.created_at);
      const ukFormatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/London',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const parts = ukFormatter.formatToParts(date);
      const getPart = (type) => parts.find(p => p.type === type)?.value;
      const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;

      request.log.info('[BriefedIndex] Request completed successfully');
      return {
        success: true,
        message: 'Briefed Index request submitted successfully',
        data: {
          id: briefedIndexRequest.id,
          name: briefedIndexRequest.name,
          email: briefedIndexRequest.email,
          institution: briefedIndexRequest.institution,
          behalf_of: briefedIndexRequest.behalf_of,
          additional_context: briefedIndexRequest.additional_context,
          created_at: createdAtUK,
          email_sent: emailResult.success,
          email_message: emailResult.success ? 'Notification email sent successfully' : `Failed to send notification email: ${emailResult.error || 'Unknown error'}`
        }
      };
    } catch (dbError) {
      request.log.error('[BriefedIndex] Database error:', { error: dbError.message, stack: dbError.stack });
      reply.code(500);
      return {
        success: false,
        error: 'Database error occurred',
        details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      };
    } finally {
      client.release();
    }
  } catch (error) {
    request.log.error('[BriefedIndex] Unexpected error:', { error: error.message, stack: error.stack });
    reply.code(500);
    return {
      success: false,
      error: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  }
}

// Get all contact requests (admin only)
async function getContactRequests(request, reply) {
  try {
    const { page = 1, limit = 10 } = request.query || {};
    
    const client = await request.server.pg.connect();
    
    try {
      // Get total count
      const countResult = await client.query(
        'SELECT COUNT(*) as total FROM sapi.contact_requests'
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get contact requests list
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const result = await client.query(
        `SELECT id, name, email, organization, role, area_of_interest, message, created_at 
         FROM sapi.contact_requests 
         ORDER BY created_at DESC 
         LIMIT $1 OFFSET $2`,
        [parseInt(limit), offset]
      );
      
      // Format created_at as UK time
      const contactRequests = result.rows.map(request => {
        const date = new Date(request.created_at);
        const ukFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Europe/London',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        const parts = ukFormatter.formatToParts(date);
        const getPart = (type) => parts.find(p => p.type === type)?.value;
        const createdAtUK = `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
        
        return {
          id: request.id,
          name: request.name,
          email: request.email,
          organization: request.organization,
          role: request.role,
          area_of_interest: request.area_of_interest,
          message: request.message,
          created_at: createdAtUK
        };
      });
      
      return {
        success: true,
        data: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          contact_requests: contactRequests
        }
      };
    } finally {
      client.release();
    }
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
  submitContactRequest,
  submitCredentialRequest,
  submitBriefedIndexRequest,
  getContactRequests
};
