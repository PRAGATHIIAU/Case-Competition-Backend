const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user info to request
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No authorization header provided',
      });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        error: 'No token provided',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    // Support both userId (alumni) and studentId (students)
    req.user = {
      userId: decoded.userId,
      studentId: decoded.studentId,
      email: decoded.email,
      type: decoded.type, // 'student' or undefined (alumni)
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        error: 'Token verification failed',
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired',
        error: 'Please login again',
      });
    }

    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'An error occurred during authentication',
    });
  }
};

/**
 * Middleware to check if user owns the resource
 * Must be used after authenticate middleware
 * Supports both integer IDs (alumni/users) and UUIDs (students)
 */
const authorizeOwner = (req, res, next) => {
  const resourceId = req.params.id || req.params.userId || req.params.studentId;
  const authenticatedUserId = req.user?.userId || req.user?.studentId;

  if (!authenticatedUserId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  // Handle both integer IDs and UUIDs (strings)
  // Convert to string for comparison to handle both cases
  const resourceIdStr = String(resourceId);
  const authenticatedIdStr = String(authenticatedUserId);

  if (resourceIdStr !== authenticatedIdStr) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
      error: 'You can only modify your own account',
    });
  }

  next();
};

module.exports = {
  authenticate,
  authorizeOwner,
};

