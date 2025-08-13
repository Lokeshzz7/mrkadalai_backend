// app.js
import dotenv from 'dotenv';
dotenv.config();
import pool from './db/db.js';
import express from "express";
const app = express();
const PORT = process.env.PORT || 5500;

import authRoutes from './routes/authRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import errorMiddleware from './middlewares/error.middleware.js';
import arjectMiddleware from './middlewares/arcjet.middleware.js';
import cors from 'cors';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import staffRoutes from './routes/staffRoutes.js';
import customerRouter from './routes/customerRoutes.js';
import multer from "multer";
import './services/notificationScheduler.js'; // Initialize notification scheduler

app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
}));

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());


// app.use(arjectMiddleware);

app.use('/api/superadmin', superAdminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/customer',customerRouter);
app.use(errorMiddleware)

app.get('/', (req, res) => {
  res.send('Server is running...');
});

app.listen(PORT, async () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  await pool;
});

