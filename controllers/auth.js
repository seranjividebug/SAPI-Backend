const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Role constants
const ROLES = {
  ADMIN: 1,
  USER: 2
};

async function register(request, reply) {
  try {
    const { full_name, email, password, confirm_password } = request.body || {};

    // Validation
    if (!full_name || !email || !password || !confirm_password) {
      reply.code(400);
      return {
        success: false,
        error: 'All fields are required: full_name, email, password, confirm_password'
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

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      reply.code(400);
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    const client = await request.server.pg.connect();
    
    try {
      // Check if email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE email = $1',
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
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user with role 2 (user) - only user registration allowed
      const userId = uuidv4();
      const result = await client.query(
        `INSERT INTO users (id, full_name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id, full_name, email, role, created_at`,
        [userId, full_name, email.toLowerCase(), passwordHash, ROLES.USER]
      );

      const user = result.rows[0];

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
        message: 'User registered successfully',
        data: {
          user: {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            role_name: user.role === ROLES.ADMIN ? 'admin' : 'user',
            created_at: user.created_at
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
         FROM users 
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
            created_at: user.created_at
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

module.exports = {
  register,
  login,
  verifyToken,
  requireAdmin,
  ROLES
};
