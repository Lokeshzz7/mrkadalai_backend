import express  from'express';
import { authenticateToken,authorizeRoles, restrictToStaff } from '../middlewares/auth.middleware.js';
import { addManualOrder,getProducts } from '../controllers/staff/manualOrder.controller.js';
import { getHomeDetails, getOrder, recentOrders, updateOrder } from '../controllers/staff/home.controller.js';
import { getStocks,addStock,deductStock,stockHistory } from '../controllers/staff/inventory.controller.js';
import { getRechargeHistory,addRecharge } from '../controllers/staff/wallet.controller.js';
import { OutletCurrentOrder } from '../controllers/staff/notification.controller.js';
import { getAvailableDatesAndSlotsForStaff, getOrderHistory } from '../controllers/staff/orderHistory.controller.js';

const staffRouter = express.Router();

staffRouter.use(restrictToStaff)


//Home management
staffRouter.get('/outlets/get-home-data/',authenticateToken,authorizeRoles('STAFF'),getHomeDetails);
staffRouter.get('/outlets/get-recent-orders/:outletId/',authenticateToken,authorizeRoles('STAFF'),recentOrders);
staffRouter.get('/outlets/get-order/:outletId/:orderId/',authenticateToken,authorizeRoles('STAFF'),getOrder);
staffRouter.put('/outlets/update-order/',authenticateToken,authorizeRoles('STAFF'),updateOrder);

//Manual Order
staffRouter.post('/outlets/add-manual-order/',authenticateToken,authorizeRoles('STAFF'),addManualOrder);
staffRouter.get('/outlets/get-products-in-stock/:outletId',authenticateToken,authorizeRoles('STAFF'),getProducts);

//Inventory Management
staffRouter.get('/outlets/get-stocks/:outletId/',authenticateToken,authorizeRoles('STAFF'),getStocks);
staffRouter.post('/outlets/add-stock/',authenticateToken,authorizeRoles('STAFF'),addStock);
staffRouter.post('/outlets/deduct-stock/',authenticateToken,authorizeRoles('STAFF'),deductStock);
staffRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('STAFF'),stockHistory);

//Notification Management
staffRouter.get('/outlets/get-current-order/:outletId',authenticateToken,authorizeRoles('STAFF'),OutletCurrentOrder)

//Recharge Management

staffRouter.get('/outlets/get-recharge-history/:outletId/',authenticateToken,authorizeRoles('STAFF'),getRechargeHistory);
staffRouter.post('/outlets/recharge-wallet/',authenticateToken,authorizeRoles('STAFF'),addRecharge);

//Order management
staffRouter.get('/outlets/get-order-history/',authenticateToken,authorizeRoles('STAFF'),getOrderHistory);
staffRouter.get('/outlets/get-orderdates/:outletId/',authenticateToken,authorizeRoles('STAFF'),getAvailableDatesAndSlotsForStaff);

export default staffRouter;