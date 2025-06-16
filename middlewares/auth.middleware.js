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
        outletId: true,
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

// Authorize specific roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
        try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      res.status(200).json({ message: 'Signed out successfully' });
    } catch (error) {
      next(error);
    }
      return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
    }
    next();
  };
};

export const restrictToAdmin = [authenticateToken, authorizeRoles('ADMIN')];

export const restrictToStaff = [authenticateToken, authorizeRoles('STAFF')];

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