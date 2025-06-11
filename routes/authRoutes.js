import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../prisma/client.js";
import { signUp, signIn, signOut, checkAuth, staffSignIn } from "../controllers/auth.controller.js";
import { authenticateToken } from '../middlewares/auth.middleware.js';
const authRouter = express.Router();


// * Public routes
authRouter.post('/signup', signUp);
authRouter.post('/signin', signIn);
authRouter.post('/signout', signOut);
authRouter.post('/staffsignin', staffSignIn);

// *  Protected route to check authentication status
authRouter.get('/me', authenticateToken, checkAuth);

export default authRouter;

