const jwt = require('jsonwebtoken');
const { ADMIN_ROLES } = require('../models/admin.model');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ALLOWED_ADMIN_ROLES = Object.values(ADMIN_ROLES);

/**
 * Admin Authentication Middleware
 * Verifies JWT token and attaches admin info to request
 */
const authenticateAdmin = (req, res, next) => {
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
    
    const adminId = decoded.adminId || decoded.id;
    if (!adminId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        error: 'Admin access required',
      });
    }

    // Attach admin info to request
    req.admin = {
      adminId,
      id: adminId,
      email: decoded.email,
      role: decoded.role || ADMIN_ROLES.ADMIN,
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

    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      error: 'An error occurred during authentication',
    });
  }
};

const verifyAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const role = (req.admin.role || '').toLowerCase();
  if (!ALLOWED_ADMIN_ROLES.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
      error: 'Admin role required',
    });
  }

  next();
};

const verifyFaculty = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const role = (req.admin.role || '').toLowerCase();
  if (role !== ADMIN_ROLES.FACULTY) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
      error: 'Faculty role required',
    });
  }

  next();
};

module.exports = {
  authenticateAdmin,
  verifyAdmin,
  verifyFaculty,
};

