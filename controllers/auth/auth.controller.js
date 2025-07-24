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


export const signUp = async (req, res, next) => {
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

    res.status(201).json({ message: 'User created successfully', user: response });
  } catch (error) {
    console.error('Signup error:', error);
    next(error);
  }
};

export const adminSignup = async (req, res, next) => {
  const { name, email, password, retypePassword } = req.body;

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
      },
    });

    // Notify SuperAdmin (e.g., via dashboard or email - implement separately)
    // For now, log a message to indicate a notification should be sent
    console.log(`Admin signup request for ${email}. Awaiting SuperAdmin verification.`);

    res.status(201).json({ message: 'Admin signup successful. Awaiting SuperAdmin verification.', adminId: admin.id });
  } catch (error) {
    console.error('Admin signup error:', error);
    next(error);
  }
};

export const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        customerInfo: { include: { wallet: true, cart: true } },
        staffInfo: { include: { permissions: true } },
        outlet: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
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
      staffDetails: user.staffInfo ? {
        id: user.staffInfo.id,
        staffRole: user.staffInfo.staffRole,
        permissions: user.staffInfo.permissions,
      } : undefined,
    };

    res.status(200).json({ message: 'Login successful', user: response });
  } catch (error) {
    console.error('Login error:', error);
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