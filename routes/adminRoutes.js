import express  from'express';
import { addOutlets,getOutlets,removeOutlets } from '../controllers/admin/outlet.controller.js';
import { outletAddStaff,getOutletStaff,outletStaffPermission,outletDeleteStaff,outletUpdateStaff,getStaffById } from '../controllers/admin/staff.controller.js';
import { getProducts,addProduct,deleteProduct, updateProduct } from '../controllers/admin/product.controller.js';
import { outletTotalOrders } from '../controllers/admin/order.controller.js';
import { getStocks,addStock,deductStock,stockHistory} from '../controllers/admin/inventory.controller.js';
import { getExpenses,addExpense,getExpenseByDate } from '../controllers/admin/expense.controller.js';
import { getCustomersWithWallet,getRechargeHistoryByOutlet,getOrdersPaidViaWallet } from '../controllers/admin/wallet.controller.js';
import { getOutletCustomers } from '../controllers/admin/customer.controller.js';
import { getTickets,ticketClose } from '../controllers/admin/ticket.controller.js';
import { authenticateToken,authorizeRoles, restrictToAdmin } from '../middlewares/auth.middleware.js';
import { getOutletSalesReport,getOutletRevenueByItems,getRevenueSplit,getWalletRechargeByDay,getProfitLossTrends,getCustomerOverview,getCustomerPerOrder} from '../controllers/admin/reports.controller.js';
import { getDashboardOverview, getOrderSourceDistribution, getOrderStatusDistribution, getPeakTimeSlots, getRevenueTrend, getTopSellingItems } from '../controllers/admin/dashboard.controller.js'

const adminRouter = express.Router();

adminRouter.use(restrictToAdmin);

adminRouter.get('/dashboard/', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management

adminRouter.post('/add-outlet/', authenticateToken, authorizeRoles('ADMIN'),addOutlets );

adminRouter.get('/get-outlets/', authenticateToken, authorizeRoles('ADMIN'), getOutlets);

adminRouter.delete('/remove-outlet/:outletId/',authenticateToken,authorizeRoles('ADMIN'),removeOutlets);

//Staff Management
adminRouter.post('/outlets/add-staff/', authenticateToken, authorizeRoles('ADMIN'),outletAddStaff);
adminRouter.post('/outlets/permissions/',authenticateToken,authorizeRoles('ADMIN'), outletStaffPermission);
adminRouter.get('/outlets/get-staffs/:outletId', authenticateToken, authorizeRoles('ADMIN'),getOutletStaff);

adminRouter.put('/outlets/update-staff/:staffId', authenticateToken, authorizeRoles('ADMIN'), outletUpdateStaff);
adminRouter.delete('/outlets/delete-staff/:staffId', authenticateToken, authorizeRoles('ADMIN'), outletDeleteStaff);
adminRouter.get('/outlets/staff/:staffId', authenticateToken, authorizeRoles('ADMIN'), getStaffById);


//Product  management
adminRouter.get('/outlets/get-products/:outletId',authenticateToken,authorizeRoles('ADMIN'),getProducts);

adminRouter.post('/outlets/add-product/',authenticateToken,authorizeRoles('ADMIN'),addProduct);

adminRouter.delete('/outlets/delete-product/:id',authenticateToken,authorizeRoles('ADMIN'),deleteProduct);

adminRouter.put('/outlets/update-product/:id',authenticateToken,authorizeRoles('ADMIN'),updateProduct)

//Order management
adminRouter.get('/outlets/:outletId/orders/', authenticateToken, authorizeRoles('ADMIN'),outletTotalOrders);


//Inventory management
adminRouter.get('/outlets/get-stocks/:outletId',authenticateToken,authorizeRoles('ADMIN'),getStocks);

adminRouter.post('/outlets/add-stocks/',authenticateToken,authorizeRoles('ADMIN'),addStock);

adminRouter.post('/outlets/deduct-stocks/',authenticateToken,authorizeRoles('ADMIN'),deductStock);

adminRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('ADMIN'),stockHistory);

//Expense Management
adminRouter.post('/outlets/add-expenses/',authenticateToken,authorizeRoles('ADMIN'),addExpense);

adminRouter.get('/outlets/get-expenses/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getExpenses);

adminRouter.get('/outlets/get-expenses-bydate/',authenticateToken,authorizeRoles('ADMIN'),getExpenseByDate); 

//Wallet Management

adminRouter.get('/outlets/wallet-history/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getCustomersWithWallet);

adminRouter.get('/outlets/recharge-history/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getRechargeHistoryByOutlet);

adminRouter.get('/outlets/paid-wallet/',authenticateToken,authorizeRoles('ADMIN'),getOrdersPaidViaWallet);

//Customer Management

adminRouter.get('/outlets/customers/:outletId/', authenticateToken, authorizeRoles('ADMIN'), getOutletCustomers);

//Ticket Management
adminRouter.get('/outlets/tickets/:outletId',authenticateToken,authorizeRoles('ADMIN'),getTickets);

adminRouter.post('/outlets/ticket-close/',authenticateToken,authorizeRoles('ADMIN'),ticketClose);

//Notification Management


//App management

//Reports Management
adminRouter.post('/outlets/sales-report/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getOutletSalesReport);
adminRouter.post('/outlets/revenue-report/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getOutletRevenueByItems);
adminRouter.post('/outlets/revenue-split/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getRevenueSplit);
adminRouter.post('/outlets/wallet-recharge-by-day/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getWalletRechargeByDay);
adminRouter.post('/outlets/profit-loss-trends/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getProfitLossTrends);
adminRouter.post('/outlets/customer-overview/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getCustomerOverview);
adminRouter.post('/outlets/customer-per-order/:outletId/',authenticateToken,authorizeRoles('ADMIN'),getCustomerPerOrder);

// Dashboard Management
adminRouter.get('/dashboard/overview', authenticateToken, authorizeRoles('ADMIN'), getDashboardOverview);
adminRouter.post('/dashboard/revenue-trend', authenticateToken, authorizeRoles('ADMIN'), getRevenueTrend);
adminRouter.post('/dashboard/order-status-distribution', authenticateToken, authorizeRoles('ADMIN'), getOrderStatusDistribution);
adminRouter.post('/dashboard/order-source-distribution', authenticateToken, authorizeRoles('ADMIN'), getOrderSourceDistribution);
adminRouter.post('/dashboard/top-selling-items', authenticateToken, authorizeRoles('ADMIN'), getTopSellingItems);
adminRouter.post('/dashboard/peak-time-slots', authenticateToken, authorizeRoles('ADMIN'), getPeakTimeSlots);

export default adminRouter;
