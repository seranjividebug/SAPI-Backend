const { v4: uuidv4 } = require('uuid');
const { sendContactNotificationEmail } = require('../services/email');

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
  getContactRequests
};
