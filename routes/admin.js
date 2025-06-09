import express  from'express';
import authenticate  from'../middlewares/auth.js';
import authorize  from'../middlewares/authorize.js';
import {addOutlets,getOutletStaff,getOutlets,outletAddStaff,outletStaffPermission,outletTotalOrders} from '../controllers/admin.controller.js'
import prisma  from'../prisma/client.js';
import bcrypt  from'bcryptjs';


const adminRouter = express.Router();

adminRouter.get('/dashboard/', authenticate, authorize('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management

adminRouter.post('/add-outlets/', authenticate, authorize('ADMIN'),addOutlets );
adminRouter.get('/get-outlets/', authenticate, authorize('ADMIN'), getOutlets);

//Staff Management
adminRouter.post('/outlets/add-staff/', authenticate, authorize('ADMIN'),outletAddStaff);
adminRouter.post('/outlets/permissions/:staffId/',authenticate,authorize('ADMIN'), outletStaffPermission);

//Inventory management

//App management


//Order management
adminRouter.get('/outlets/:outletId/orders/', authenticate, authorize('ADMIN'),outletTotalOrders);

//Staff Management
adminRouter.get('/get-staffs/:outletId', authenticate, authorize('ADMIN'),getOutletStaff);


export default adminRouter;
