import express  from'express';
import { restrictToAdminRoutes } from '../middlewares/auth.middleware';

const adminRouter = express.Router();

adminRouter.use(restrictToAdminRoutes)