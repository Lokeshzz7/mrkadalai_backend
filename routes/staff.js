import express  from'express';
import { authenticateToken,authorizeRoles, restrictToStaff } from '../middlewares/auth.middleware.js';
import { addManualOrder } from '../controllers/staff/manualOrder.controller.js';
import { recentOrders } from '../controllers/staff/home.controller.js';
import { getStocks,addStock,deductStock,stockHistory } from '../controllers/staff/inventory.controller.js';
import { getRechargeHistory,addRecharge } from '../controllers/staff/wallet.controller.js';
import { getOrderHistory } from '../controllers/staff/orderHistory.controller.js';
const staffRouter = express.Router();

staffRouter.use(restrictToStaff)


//Home management

staffRouter.get('/outlets/get-recent-orders/:outletId/',authenticateToken,authorizeRoles('STAFF'),recentOrders);

//Manual Order
staffRouter.post('/outlets/add-manual-order/',authenticateToken,authorizeRoles('STAFF'),addManualOrder);

//Inventory Management
staffRouter.get('/outlets/get-stocks/:outletId/',authenticateToken,authorizeRoles('STAFF'),getStocks);
staffRouter.post('/outlets/add-stock/',authenticateToken,authorizeRoles('STAFF'),addStock);
staffRouter.post('/outlets/deduct-stock/',authenticateToken,authorizeRoles('STAFF'),deductStock);
staffRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('STAFF'),stockHistory);

//Recharge Management

staffRouter.get('/outlets/get-recharge-history/:outletId/',authenticateToken,authorizeRoles('STAFF'),getRechargeHistory);
staffRouter.post('/outlets/recharge-wallet/',authenticateToken,authorizeRoles('STAFF'),addRecharge);

//Order management
staffRouter.get('/outlets/get-order-history/',authenticateToken,authorizeRoles('STAFF'),getOrderHistory);

export default staffRouter;