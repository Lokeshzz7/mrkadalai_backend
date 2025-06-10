import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma/client.js';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';

export const signUp = async (req, res, next) => {
  const { name, email, password, role, outletId,phone } = req.body;

  try {
    if (!name || !email || !password || !role || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (role !== "ADMIN" && !outletId) {
      return res.status(400).json({ message: "Provide outletId for non-admin users" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        outletId: role !== 'ADMIN' ? outletId : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        outletId: true
      }
    });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    res.status(201).json({
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    console.error("Signup error:", error);
    next(error);
  }
};

export const signIn = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        outletId: user.outletId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    next(error);
  }
};

export const signOut = async (req, res, next) => {
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
};

export const checkAuth = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      console.log('No token found in cookies');
      return res.status(401).json({ message: 'Not authenticated' });
    }

    console.log('Token received:', token);

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded JWT:', decoded);
    } catch (err) {
      console.error('JWT verification failed:', err);
      return res.status(401).json({ message: 'Invalid token' });
    }

    const userId = Number(decoded.id);
    if (isNaN(userId)) {
      console.error('Invalid user ID in token:', decoded.id);
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        outletId: true
      }
    });

    if (!user) {
      console.log('No user found with ID:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('User found:', user);

    return res.status(200).json({ user });
  } catch (error) {
    console.error('Unhandled error in checkAuth:', error);
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};
