import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import prisma from '../../prisma/client.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../../config/env.js';

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:5500/api/auth/google/callback',
});


export const customerSignup = async (req, res, next) => {
  const { name, email, password, retypePassword, outletId, phone, yearOfStudy } = req.body;

  try {
    if (!name || !email || !password || !retypePassword || !outletId || !phone) {
      return res.status(400).json({ message: 'Name, email, password, retype password, outlet ID, and phone are required' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'CUSTOMER',
        phone,
        outletId,
        customerInfo: {
          create: {
            yearOfStudy: yearOfStudy ? parseInt(yearOfStudy, 10) : null,
            wallet: {
              create: {
                balance: 0,
                totalRecharged: 0,
                totalUsed: 0,
              },
            },
            cart: {
              create: {},
            },
          },
        },
      },
      include: {
        customerInfo: { include: { wallet: true, cart: true } },
        outlet: true,
      },
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
      customerDetails: user.customerInfo ? {
        id: user.customerInfo.id,
        yearOfStudy: user.customerInfo.yearOfStudy,
        wallet: user.customerInfo.wallet,
        cart: user.customerInfo.cart,
      } : undefined,
    };

    res.status(201).json({ message: 'Customer created successfully', user: response });
  } catch (error) {
    console.error('Customer signup error:', error);
    next(error);
  }
};

export const adminSignup = async (req, res, next) => {
  const { name, email, password, retypePassword, phone } = req.body;

  try {
    if (!name || !email || !password || !retypePassword) {
      return res.status(400).json({ message: 'Name, email, password, and retype password are required' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingAdmin = await prisma.admin.findUnique({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isVerified: false,
        phone
      },
    });

    console.log(`Admin signup request for ${email}. Awaiting SuperAdmin verification.`);

    res.status(201).json({ message: 'Admin signup successful. Awaiting SuperAdmin verification.', adminId: admin.id });
  } catch (error) {
    console.error('Admin signup error:', error);
    next(error);
  }
};

export const staffSignup = async (req, res, next) => {
  const { name, email, password, retypePassword, phone } = req.body;

  try {
    if (!name || !email || !password || !retypePassword) {
      return res.status(400).json({ message: 'Name, email, password, and retype password are required' });
    }

    if (password !== retypePassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'STAFF',
        phone: phone || null,
        isVerified: false,
      },
    });

    console.log(`Staff signup request for ${email}. Awaiting SuperAdmin verification.`);

    res.status(201).json({ message: 'Staff signup successful. Awaiting SuperAdmin verification.', userId: user.id });
  } catch (error) {
    console.error('Staff signup error:', error);
    next(error);
  }
};

export const superAdminSignIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { outlet: true },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.role !== 'SUPERADMIN') {
      return res.status(403).json({ message: 'Access denied. Only SuperAdmin can log in here.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
    };

    res.status(200).json({ message: 'SuperAdmin login successful', user: response });
  } catch (error) {
    console.error('SuperAdmin login error:', error);
    next(error);
  }
};

export const verifyAdmin = async (req, res, next) => {
  const { adminId, outletIds, permissions } = req.body;
  const userId = req.user.id;

  try {
    // Verify the requesting user is SuperAdmin
    const superAdmin = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, superAdmin: true },
    });
    if (!superAdmin || superAdmin.role !== 'SUPERADMIN' || !superAdmin.superAdmin) {
      return res.status(403).json({ message: 'Only SuperAdmin can verify admins' });
    }

    const admin = await prisma.admin.findUnique({ where: { id: adminId } });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.isVerified) {
      return res.status(400).json({ message: 'Admin is already verified' });
    }

    // Update admin to verified status and assign outlets and permissions
    await prisma.admin.update({
      where: { id: adminId },
      data: {
        isVerified: true,
        outlets: {
          createMany: {
            data: outletIds.map(outletId => ({ outletId })),
          },
        },
        permissions: {
          createMany: {
            data: permissions.map(p => ({
              adminOutletId: p.adminOutletId,
              type: p.type,
              isGranted: true,
            })),
          },
        },
      },
    });

    res.status(200).json({ message: 'Admin verified successfully' });
  } catch (error) {
    console.error('Admin verification error:', error);
    next(error);
  }
};

// Add this after signIn or staffSignIn
export const adminSignIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!admin.isVerified) {
      return res.status(403).json({ message: 'Admin not verified. Contact SuperAdmin.' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: 'ADMIN' }, // Using 'ADMIN' as a role for token, though it's an Admin model
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      isVerified: admin.isVerified,
    };

    res.status(200).json({ message: 'Admin login successful', admin: response });
  } catch (error) {
    console.error('Admin login error:', error);
    next(error);
  }
};

export const customerSignIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customerInfo: { include: { wallet: true, cart: true } },
        outlet: true,
      },
    });

    if (!user || user.role !== 'CUSTOMER') {
      return res.status(401).json({ message: 'Invalid customer credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
      customerDetails: user.customerInfo ? {
        id: user.customerInfo.id,
        yearOfStudy: user.customerInfo.yearOfStudy,
        wallet: user.customerInfo.wallet,
        cart: user.customerInfo.cart,
      } : undefined,
    };

    res.status(200).json({ message: 'Customer login successful', user: response });
  } catch (error) {
    console.error('Customer login error:', error);
    next(error);
  }
};

export const staffSignIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        staffInfo: { include: { permissions: true } },
        outlet: true,
      },
    });

    if (!user || user.role !== 'STAFF') {
      return res.status(401).json({ message: 'Invalid staff credentials' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Staff not verified. Contact SuperAdmin.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid staff credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
      staffDetails: user.staffInfo ? {
        id: user.staffInfo.id,
        staffRole: user.staffInfo.staffRole,
        permissions: user.staffInfo.permissions,
      } : undefined,
    };

    res.status(200).json({ message: 'Staff login successful', user: response });
  } catch (error) {
    console.error('Staff login error:', error);
    next(error);
  }
};

export const googleSignIn = async (req, res, next) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'Authorization code missing' });
    }

    console.log('Received OAuth code:', code);
    console.log('Received state:', state);

    // Validate state
    if (!state || !req.session.state) {
      return res.status(400).json({ message: 'Invalid or missing state parameter' });
    }
    let parsedState;
    try {
      parsedState = JSON.parse(state);
    } catch {
      parsedState = { csrf: state };
    }
    if (parsedState.csrf !== req.session.state && state !== req.session.state) {
      return res.status(400).json({ message: 'State mismatch' });
    }

    const { tokens } = await client.getToken({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: 'http://localhost:5500/api/auth/google/callback',
    });

    console.log('Received tokens:', tokens);

    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        customerInfo: { include: { wallet: true, cart: true } },
        staffInfo: { include: { permissions: true } },
        outlet: true,
      },
    });

    const isSignup = parsedState.outletId || parsedState.phone;
    const outletId = parsedState.outletId ? Number(parsedState.outletId) : null;
    const phone = parsedState.phone || '';

    if (isSignup && !outletId) {
      return res.status(400).json({ message: 'Outlet ID (college) is required for signup' });
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          role: 'CUSTOMER',
          googleId,
          phone,
          password: null,
          outletId,
          customerInfo: {
            create: {
              yearOfStudy: null, // Optional, can be updated later
              wallet: {
                create: {
                  balance: 0,
                  totalRecharged: 0,
                  totalUsed: 0,
                },
              },
              cart: {
                create: {},
              },
            },
          },
        },
        include: {
          customerInfo: { include: { wallet: true, cart: true } },
          staffInfo: { include: { permissions: true } },
          outlet: true,
        },
      });
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId },
        include: {
          customerInfo: { include: { wallet: true, cart: true } },
          staffInfo: { include: { permissions: true } },
          outlet: true,
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, outletId: user.outletId },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
      customerDetails: user.customerInfo ? {
        id: user.customerInfo.id,
        yearOfStudy: user.customerInfo.yearOfStudy,
        wallet: user.customerInfo.wallet,
        cart: user.customerInfo.cart,
      } : undefined,
      staffDetails: user.staffInfo ? {
        id: user.staffInfo.id,
        staffRole: user.staffInfo.staffRole,
        permissions: user.staffInfo.permissions,
      } : undefined,
    };

    const redirectUrl = `http://localhost:5173?token=${token}`;
    console.log('Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const signOut = async (req, res, next) => {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    });
    res.status(200).json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Sign out error:', error);
    next(error);
  }
};

export const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('JWT verification failed:', err);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const userId = Number(decoded.id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerInfo: { include: { wallet: true, cart: true } },
        staffInfo: { include: { permissions: true } },
        outlet: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      outletId: user.outletId,
      outlet: user.outlet,
      customerDetails: user.customerInfo ? {
        id: user.customerInfo.id,
        yearOfStudy: user.customerInfo.yearOfStudy,
        wallet: user.customerInfo.wallet,
        cart: user.customerInfo.cart,
      } : undefined,
      staffDetails: user.staffInfo ? {
        id: user.staffInfo.id,
        staffRole: user.staffInfo.staffRole,
        permissions: user.staffInfo.permissions,
      } : undefined,
    };

    return res.status(200).json({ user: response });
  } catch (error) {
    console.error('Check auth error:', error);
    return res.status(500).json({ message: 'Server error during authentication' });
  }
};