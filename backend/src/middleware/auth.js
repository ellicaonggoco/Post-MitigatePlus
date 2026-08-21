const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET environment variable is not set!');
        return res.status(500).json({ message: 'Server configuration error' });
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-passwordHash');
      if (!req.user) {
        return res.status(401).json({ message: 'User account not found' });
      }
      if (req.user.isActive === false) {
        return res.status(403).json({ message: 'Forbidden: Account has been suspended or deactivated.' });
      }
      // Invalidate tokens issued prior to a password change
      if (req.user.passwordChangedAt && decoded.iat) {
        const changedTimestamp = parseInt(req.user.passwordChangedAt.getTime() / 1000, 10);
        if (decoded.iat < changedTimestamp) {
          return res.status(401).json({ message: 'Session expired due to password change. Please sign in again.' });
        }
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Forbidden: No authenticated user.' });
    }

    // Expand admin & superadmin permissions automatically
    const expandedRoles = [...roles];
    if (roles.includes('lgu_admin') || roles.includes('lgu_superadmin') || roles.includes('lgu_super_admin')) {
      expandedRoles.push('lgu_superadmin', 'lgu_super_admin', 'lgu_admin');
    }

    if (!expandedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: User role '${req.user.role}' does not have required access.`,
      });
    }
    next();
  };
};

const requireBarangayScope = (req, res, next) => {
  if (req.user.role === 'lgu_admin' || req.user.role === 'lgu_superadmin' || req.user.role === 'lgu_super_admin') {
    // LGU Admin and SuperAdmin have city-wide access across all barangays
    return next();
  }
  
  if (req.user.role === 'barangay_official' || req.user.role === 'field_staff') {
    if (!req.user.barangayCode) {
      return res.status(403).json({ message: 'Forbidden: Official account is missing assigned barangayCode.' });
    }
    req.barangayCode = req.user.barangayCode;
    return next();
  }
  
  next();
};

module.exports = { protect, requireRole, requireBarangayScope };
