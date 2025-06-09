import express  from'express';
import {addOutlets,getOutletStaff,getOutlets,outletAddStaff,outletStaffPermission,outletTotalOrders} from '../controllers/admin.controller.js';
import { authenticateToken,authorizeRoles } from '../middlewares/auth.middleware.js';

const adminRouter = express.Router();

adminRouter.get('/dashboard/', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management

adminRouter.post('/add-outlets/', authenticateToken, authorizeRoles('ADMIN'),addOutlets );
adminRouter.get('/get-outlets/', authenticateToken, authorizeRoles('ADMIN'), getOutlets);

//Staff Management
adminRouter.post('/outlets/add-staff/', authenticateToken, authorizeRoles('ADMIN'),outletAddStaff);
adminRouter.post('/outlets/permissions/:staffId/',authenticateToken,authorizeRoles('ADMIN'), outletStaffPermission);

//Inventory management

//App management


//Order management
adminRouter.get('/outlets/:outletId/orders/', authenticateToken, authorizeRoles('ADMIN'),outletTotalOrders);

//Staff Management
adminRouter.get('/get-staffs/:outletId', authenticateToken, authorizeRoles('ADMIN'),getOutletStaff);


export default adminRouter;
