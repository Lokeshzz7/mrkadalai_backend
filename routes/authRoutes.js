import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import {
  signUp,
  signIn,
  signOut,
  checkAuth,
  staffSignIn,
  googleSignIn,
  superAdminSignIn,
  adminSignup,
} from '../controllers/auth/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const authRouter = express.Router();

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:5500/api/auth/google/callback',
});

// Public routes
authRouter.post('/signup', signUp);
authRouter.post('/signin', signIn);
authRouter.post('/admin-signup', adminSignup);
authRouter.post('/staffsignin', staffSignIn);
authRouter.post('/signout', signOut);
authRouter.post('/superadmin-signin', superAdminSignIn);
authRouter.get('/google', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session = req.session || {};
  req.session.state = state;
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: 'http://localhost:5500/api/auth/google/callback',
    state,
  });
  res.redirect(url);
});
authRouter.get('/google/signup', (req, res) => {
  const { outletId, phone } = req.query;
  if (!outletId) {
    return res.status(400).json({ message: 'Outlet ID (college) is required' });
  }
  const state = JSON.stringify({
    csrf: Math.random().toString(36).substring(2),
    outletId: parseInt(outletId, 10),
    phone: phone || '',
  });
  req.session = req.session || {};
  req.session.state = state;
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['openid', 'email', 'profile'],
    redirect_uri: 'http://localhost:5500/api/auth/google/callback',
    state,
  });
  res.redirect(url);
});
authRouter.get('/google/callback', googleSignIn);

// Protected route
authRouter.get('/me', authenticateToken, checkAuth);

export default authRouter;