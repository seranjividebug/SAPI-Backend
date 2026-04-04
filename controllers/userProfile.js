const { v4: uuidv4 } = require('uuid');

async function createProfile(request, reply) {
  try {
    const { country, respondent_name, title, ministry_or_department, contact_email, development_stage } = request.body || {};

    // Get user_id from JWT token (set by verifyToken middleware)
    const userId = request.user?.user_id;
    
    if (!userId) {
      reply.code(401);
      return {
        success: false,
        error: 'Authentication required. Please login first.'
      };
    }

    // Validation
    if (!country || !respondent_name || !contact_email) {
      reply.code(400);
      return {
        success: false,
        error: 'Required fields: country, respondent_name, contact_email'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contact_email)) {
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    const client = await request.server.pg.connect();
    
    try {
      // Check if user already has a profile
      const existingProfile = await client.query(
        'SELECT id FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (existingProfile.rows.length > 0) {
        reply.code(409);
        return {
          success: false,
          error: 'User already has a profile. Use PUT to update existing profile.'
        };
      }

      // Create user profile linked to user
      const profileId = uuidv4();
      const result = await client.query(
        `INSERT INTO user_profiles (id, user_id, country, respondent_name, title, ministry_or_department, contact_email, development_stage) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, country, respondent_name, title, ministry_or_department, contact_email, development_stage, created_at`,
        [
          profileId,
          userId,
          country,
          respondent_name,
          title || '',
          ministry_or_department || '',
          contact_email.toLowerCase(),
          development_stage || ''
        ]
      );

      const profile = result.rows[0];

      return {
        success: true,
        message: 'User profile created successfully',
        data: {
          profile_id: profile.id,
          user_id: userId,
          country: profile.country,
          respondent_name: profile.respondent_name,
          title: profile.title,
          ministry_or_department: profile.ministry_or_department,
          contact_email: profile.contact_email,
          development_stage: profile.development_stage,
          created_at: profile.created_at
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

async function getProfile(request, reply) {
  try {
    const { id } = request.params;
    
    const client = await request.server.pg.connect();
    
    try {
      const result = await client.query(
        `SELECT id, user_id, country, respondent_name, title, ministry_or_department, contact_email, development_stage, created_at
         FROM user_profiles 
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      const profile = result.rows[0];

      return {
        success: true,
        data: {
          profile_id: profile.id,
          user_id: profile.user_id,
          country: profile.country,
          respondent_name: profile.respondent_name,
          title: profile.title,
          ministry_or_department: profile.ministry_or_department,
          contact_email: profile.contact_email,
          development_stage: profile.development_stage,
          created_at: profile.created_at
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

async function getAllProfiles(request, reply) {
  try {
    const client = await request.server.pg.connect();
    
    try {
      const result = await client.query(
        `SELECT id, user_id, country, respondent_name, title, ministry_or_department, contact_email, development_stage, created_at
         FROM user_profiles 
         ORDER BY created_at DESC`
      );

      const profiles = result.rows.map(profile => ({
        profile_id: profile.id,
        user_id: profile.user_id,
        country: profile.country,
        respondent_name: profile.respondent_name,
        title: profile.title,
        ministry_or_department: profile.ministry_or_department,
        contact_email: profile.contact_email,
        development_stage: profile.development_stage,
        created_at: profile.created_at
      }));

      return {
        success: true,
        data: {
          count: profiles.length,
          profiles
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

async function updateProfile(request, reply) {
  try {
    const { id } = request.params;
    const { country, respondent_name, title, ministry_or_department, contact_email, development_stage } = request.body || {};

    // Get user_id from JWT token
    const userId = request.user?.user_id;
    
    if (!userId) {
      reply.code(401);
      return {
        success: false,
        error: 'Authentication required. Please login first.'
      };
    }

    // Check if at least one field to update is provided
    if (!country && !respondent_name && !title && !ministry_or_department && !contact_email && !development_stage) {
      reply.code(400);
      return {
        success: false,
        error: 'At least one field is required to update'
      };
    }

    const client = await request.server.pg.connect();
    
    try {
      // Check if profile exists and belongs to user
      const existingProfile = await client.query(
        'SELECT id, user_id FROM user_profiles WHERE id = $1',
        [id]
      );

      if (existingProfile.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'Profile not found'
        };
      }

      // Verify user owns this profile
      if (existingProfile.rows[0].user_id !== userId) {
        reply.code(403);
        return {
          success: false,
          error: 'Access denied. You can only update your own profile.'
        };
      }

      // Build dynamic update query
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (country) {
        updates.push(`country = $${paramIndex++}`);
        values.push(country);
      }
      if (respondent_name) {
        updates.push(`respondent_name = $${paramIndex++}`);
        values.push(respondent_name);
      }
      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (ministry_or_department !== undefined) {
        updates.push(`ministry_or_department = $${paramIndex++}`);
        values.push(ministry_or_department);
      }
      if (contact_email) {
        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contact_email)) {
          reply.code(400);
          return {
            success: false,
            error: 'Invalid email format'
          };
        }
        updates.push(`contact_email = $${paramIndex++}`);
        values.push(contact_email.toLowerCase());
      }
      if (development_stage !== undefined) {
        updates.push(`development_stage = $${paramIndex++}`);
        values.push(development_stage);
      }

      // Add profile id to values
      values.push(id);

      const updateQuery = `
        UPDATE user_profiles 
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING id, user_id, country, respondent_name, title, ministry_or_department, contact_email, development_stage, created_at, updated_at
      `;

      const result = await client.query(updateQuery, values);

      const profile = result.rows[0];

      return {
        success: true,
        message: 'Profile updated successfully',
        data: {
          profile_id: profile.id,
          user_id: profile.user_id,
          country: profile.country,
          respondent_name: profile.respondent_name,
          title: profile.title,
          ministry_or_department: profile.ministry_or_department,
          contact_email: profile.contact_email,
          development_stage: profile.development_stage,
          created_at: profile.created_at,
          updated_at: profile.updated_at
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
  createProfile,
  getProfile,
  getAllProfiles,
  updateProfile
};
