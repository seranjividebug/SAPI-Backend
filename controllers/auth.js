const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Role constants
const ROLES = {
  ADMIN: 1,       // Admin and Super Admin both use role 1
  USER: 2
};

// Generate admin password - fixed value for Admin and SuperAdmin
function generateAdminPassword() {
  return 'Admin@123';
}

async function register(request, reply) {
  try {
    const { full_name, email, password, confirm_password, role } = request.body || {};

    // Validation
    if (!full_name || !email) {
      reply.code(400);
      return {
        success: false,
        error: 'Full name and email are required'
      };
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    // Determine role (default to USER if not specified)
    const userRole = role && parseInt(role) === ROLES.ADMIN ? ROLES.ADMIN : ROLES.USER;
    
    let finalPassword;
    
    // For Admin/SuperAdmin (role 1): auto-generate password
    if (userRole === ROLES.ADMIN) {
      finalPassword = generateAdminPassword();
    } else {
      // For regular users: require password from request
      if (!password || !confirm_password) {
        reply.code(400);
        return {
          success: false,
          error: 'Password and confirm_password are required for user registration'
        };
      }

      if (password !== confirm_password) {
        reply.code(400);
        return {
          success: false,
          error: 'Passwords do not match'
        };
      }

      if (password.length < 6) {
        reply.code(400);
        return {
          success: false,
          error: 'Password must be at least 6 characters long'
        };
      }
      
      finalPassword = password;
    }

    const client = await request.server.pg.connect();
    
    try {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM sapi.users WHERE email = $1',
        [email.toLowerCase()]
      );

      if (existingUser.rows.length > 0) {
        reply.code(409);
        return {
          success: false,
          error: 'Email already registered'
        };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(finalPassword, SALT_ROUNDS);

      // Create user
      const userId = uuidv4();
      const result = await client.query(
        `INSERT INTO sapi.users (id, full_name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, full_name, email, role, created_at`,
        [userId, full_name, email.toLowerCase(), passwordHash, userRole]
      );

      const user = result.rows[0];

      // Format created_at as UK time
      const date = new Date(user.created_at);
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

      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      const response = {
        success: true,
        message: userRole === ROLES.ADMIN ? 'Admin registered successfully' : 'User registered successfully',
        data: {
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
            created_at: createdAtUK
          },
          token
        }
      };

      // For admin registration, include the generated password in response
      if (userRole === ROLES.ADMIN) {
        response.data.generated_password = finalPassword;
      }

      return response;
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

async function login(request, reply) {
  try {
    const { email, password } = request.body || {};

    // Validation
    if (!email || !password) {
      reply.code(400);
      return {
        success: false,
        error: 'Email and password are required'
      };
    }

    const client = await request.server.pg.connect();
    
    try {
      // Find user by email
      const result = await client.query(
        `SELECT id, full_name, email, password_hash, role, created_at 
         FROM sapi.users 
         WHERE email = $1`,
        [email.toLowerCase()]
      );

      if (result.rows.length === 0) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);

      if (!isValidPassword) {
        reply.code(401);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // Format created_at as UK time
      const date = new Date(user.created_at);
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

      // Generate JWT token
      const token = jwt.sign(
        { 
          user_id: user.id, 
          email: user.email, 
          role: user.role 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return {
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
            created_at: createdAtUK
          },
          token
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

// List users with optional role filter
async function getUsers(request, reply) {
  try {
    const { role, page = 1, limit = 10 } = request.query || {};
    
    const client = await request.server.pg.connect();
    
    try {
      let whereClause = '';
      const params = [];
      
      // Filter by role if provided
      if (role !== undefined) {
        whereClause = 'WHERE role = $1';
        params.push(parseInt(role));
      }
      
      // Get total count
      const countResult = await client.query(
        `SELECT COUNT(*) as total FROM sapi.users ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get users list
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const queryParams = [...params, parseInt(limit), offset];
      
      const result = await client.query(
        `SELECT id, full_name, email, role, created_at 
         FROM sapi.users 
         ${whereClause}
         ORDER BY created_at DESC 
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        queryParams
      );
      
      // Format created_at as UK time
      const users = result.rows.map(user => {
        const date = new Date(user.created_at);
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
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
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
          users
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

// Get user by ID
async function getUserById(request, reply) {
  try {
    const { id } = request.params;

    const client = await request.server.pg.connect();

    try {
      const result = await client.query(
        `SELECT id, full_name, email, role, created_at
         FROM sapi.users
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found'
        };
      }

      const user = result.rows[0];

      // Format created_at as UK time
      const date = new Date(user.created_at);
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
        success: true,
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
          created_at: createdAtUK
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

// Get current authenticated user
async function getCurrentUser(request, reply) {
  try {
    const userId = request.user.user_id;

    const client = await request.server.pg.connect();

    try {
      const result = await client.query(
        `SELECT id, full_name, email, role, created_at
         FROM sapi.users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found'
        };
      }

      const user = result.rows[0];

      // Format created_at as UK time
      const date = new Date(user.created_at);
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
        success: true,
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
          created_at: createdAtUK
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

// Update user
async function updateUser(request, reply) {
  try {
    const { id } = request.params;
    const { full_name, email, role } = request.body || {};
    
    if (!full_name && !email && role === undefined) {
      reply.code(400);
      return {
        success: false,
        error: 'At least one field required: full_name, email, or role'
      };
    }
    
    const client = await request.server.pg.connect();
    
    try {
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM sapi.users WHERE id = $1',
        [id]
      );
      
      if (existingUser.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      // Build update query dynamically
      const updates = [];
      const values = [];
      let paramIndex = 1;
      
      if (full_name) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(full_name);
      }
      
      if (email) {
        // Check if email already exists for another user
        const emailCheck = await client.query(
          'SELECT id FROM sapi.users WHERE email = $1 AND id != $2',
          [email.toLowerCase(), id]
        );
        
        if (emailCheck.rows.length > 0) {
          reply.code(409);
          return {
            success: false,
            error: 'Email already registered by another user'
          };
        }
        
        updates.push(`email = $${paramIndex++}`);
        values.push(email.toLowerCase());
      }
      
      if (role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(parseInt(role));
      }
      
      values.push(id);
      
      const result = await client.query(
        `UPDATE sapi.users 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramIndex}
         RETURNING id, full_name, email, role, created_at, updated_at`,
        values
      );
      
      const user = result.rows[0];
      
      // Format dates as UK time
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
      
      const createdParts = ukFormatter.formatToParts(new Date(user.created_at));
      const updatedParts = ukFormatter.formatToParts(new Date(user.updated_at));
      const getPart = (parts, type) => parts.find(p => p.type === type)?.value;
      
      const createdAtUK = `${getPart(createdParts, 'day')}/${getPart(createdParts, 'month')}/${getPart(createdParts, 'year')} ${getPart(createdParts, 'hour')}:${getPart(createdParts, 'minute')}:${getPart(createdParts, 'second')}`;
      const updatedAtUK = `${getPart(updatedParts, 'day')}/${getPart(updatedParts, 'month')}/${getPart(updatedParts, 'year')} ${getPart(updatedParts, 'hour')}:${getPart(updatedParts, 'minute')}:${getPart(updatedParts, 'second')}`;
      
      return {
        success: true,
        message: 'User updated successfully',
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
          created_at: createdAtUK,
          updated_at: updatedAtUK
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

// Delete user
async function deleteUser(request, reply) {
  try {
    const { id } = request.params;
    
    const client = await request.server.pg.connect();
    
    try {
      // Check if user exists
      const existingUser = await client.query(
        'SELECT id FROM sapi.users WHERE id = $1',
        [id]
      );
      
      if (existingUser.rows.length === 0) {
        reply.code(404);
        return {
          success: false,
          error: 'User not found'
        };
      }
      
      // Delete user
      await client.query(
        'DELETE FROM sapi.users WHERE id = $1',
        [id]
      );
      
      return {
        success: true,
        message: 'User deleted successfully'
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

// Middleware to verify JWT token
async function verifyToken(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      return {
        success: false,
        error: 'Access denied. No token provided.'
      };
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      request.user = decoded;
      return;
    } catch (err) {
      reply.code(401);
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }
  } catch (error) {
    reply.code(500);
    return {
      success: false,
      error: error.message
    };
  }
}

// Middleware to check if user is admin
function requireAdmin(request, reply, done) {
  if (!request.user || request.user.role !== ROLES.ADMIN) {
    reply.code(403);
    return done(new Error('Access denied. Admin privileges required.'));
  }
  done();
}

// Middleware to check if user is authenticated (role 2 or admin)
function requireUser(request, reply, done) {
  if (!request.user || (request.user.role !== ROLES.USER && request.user.role !== ROLES.ADMIN)) {
    reply.code(403);
    return done(new Error('Access denied. User authentication required.'));
  }
  done();
}

module.exports = {
  register,
  login,
  getUsers,
  getUserById,
  getCurrentUser,
  updateUser,
  deleteUser,
  verifyToken,
  requireAdmin,
  requireUser,
  ROLES
};
