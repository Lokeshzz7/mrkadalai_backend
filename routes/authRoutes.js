import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import {
  customerSignIn,
  signOut,
  checkAuth,
  staffSignIn,
  googleSignIn,
  superAdminSignIn,
  adminSignup,
  staffSignup,
  customerSignup,
} from '../controllers/auth/auth.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const authRouter = express.Router();

const client = new OAuth2Client({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:5500/api/auth/google/callback',
});

// Public routes

//Customer auth
authRouter.post('/signup', customerSignup);
authRouter.post('/signin', customerSignIn);

//staff auth
authRouter.post('/staff-signup',staffSignup)
authRouter.post('/staffsignin', staffSignIn);

//admin auth
authRouter.post('/admin-signup', adminSignup);

//super-admin auth
authRouter.post('/superadmin-signin', superAdminSignIn);

//google auth
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

//sign out
authRouter.post('/signout', signOut);

export default authRouter;