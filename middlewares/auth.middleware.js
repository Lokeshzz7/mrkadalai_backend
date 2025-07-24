import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/env.js';
import prisma from '../prisma/client.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        outletId: true
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

export const authenticateAdminToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await prisma.admin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        isVerified: true,
      },
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid token. Admin not found.' });
    }
    if (!admin.isVerified) {
      return res.status(403).json({ message: 'Admin not verified.' });
    }
    req.admin = admin; // Use req.admin instead of req.user for admins
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log(req.user)
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

export const authorizeAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  next(); // For now, any verified admin is authorized; add more checks if needed
};

export const restrictToSuperAdmin = [authenticateToken, authorizeRoles('SUPERADMIN')];
export const restrictToStaff = [authenticateToken, authorizeRoles('STAFF')];
export const restrictToCustomer = [authenticateToken, authorizeRoles('CUSTOMER')];

export const restrictToStaffWithPermission = (permissionType) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  if (req.user.role === 'ADMIN') {
    return next();
  }
  if (req.user.role !== 'STAFF') {
    return res.status(403).json({ message: 'Unauthorized: Must be STAFF or ADMIN.' });
  }
  try {
    const staff = await prisma.staffDetails.findUnique({
      where: { userId: req.user.id },
      include: {
        permissions: {
          where: { type: permissionType, isGranted: true },
        },
      },
    });
    if (!staff || staff.permissions.length === 0) {
      return res.status(403).json({ message: `Unauthorized: ${permissionType} permission required.` });
    }
    next();
  } catch (error) {
    console.error('Error checking staff permission:', error);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

export const authenticate = authenticateToken;
export const authorize = authorizeRoles;
export const restrictToAdminRoutes = [authenticateAdminToken, authorizeAdmin]; // For admin-specific routes