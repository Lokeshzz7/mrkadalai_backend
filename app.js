// app.js
import dotenv from 'dotenv';
dotenv.config();
import express from "express";
const app = express();
const PORT = process.env.PORT || 5500;

import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/admin.js';
import errorMiddleware from './middlewares/error.middleware.js';
import arjectMiddleware from './middlewares/arcjet.middleware.js';
import cors from 'cors';
import cookieParser from 'cookie-parser';


app.use(cookieParser());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// app.use(arjectMiddleware);

app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);

app.use(errorMiddleware)

app.get('/', (req, res) => {
  res.send('Server is running...');
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

