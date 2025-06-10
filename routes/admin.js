import express  from'express';
import {addOutlets,getOutletStaff,getOutlets,outletAddStaff,outletStaffPermission,outletTotalOrders,addProduct, deleteProduct, getStocks, addStock, deductStock, stockHistory, getProducts, addExpense} from '../controllers/admin.controller.js';
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
adminRouter.post('/outlets/permissions/',authenticateToken,authorizeRoles('ADMIN'), outletStaffPermission);

//Inventory management

//Product  management
adminRouter.get('/outlets/get-products/:outletId',authenticateToken,authorizeRoles('ADMIN'),getProducts);

adminRouter.post('/outlets/add-product/',authenticateToken,authorizeRoles('ADMIN'),addProduct);

adminRouter.delete('/outlets/delete-product/:id',authenticateToken,authorizeRoles('ADMIN'),deleteProduct);

//Order management
adminRouter.get('/outlets/:outletId/orders/', authenticateToken, authorizeRoles('ADMIN'),outletTotalOrders);

//Staff Management
adminRouter.get('/outlets/get-staffs/:outletId', authenticateToken, authorizeRoles('ADMIN'),getOutletStaff);

//Inventory management
adminRouter.get('/outlets/get-stocks/:outletId',authenticateToken,authorizeRoles('ADMIN'),getStocks);

adminRouter.post('/outlets/add-stocks/',authenticateToken,authorizeRoles('ADMIN'),addStock);

adminRouter.post('/outlets/deduct-stocks/',authenticateToken,authorizeRoles('ADMIN'),deductStock);

adminRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('ADMIN'),stockHistory);

adminRouter.post('/outlets/add-expenses/',authenticateToken,authorizeRoles('ADMIN'),addExpense);


export default adminRouter;
