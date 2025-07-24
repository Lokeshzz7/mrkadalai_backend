import express  from'express';
import { addOutlets,getOutlets,removeOutlets } from '../controllers/superadmin/outlet.controller.js';
import { outletAddStaff,getOutletStaff,outletStaffPermission,outletDeleteStaff,outletUpdateStaff,getStaffById } from '../controllers/superadmin/staff.controller.js';
import { getProducts,addProduct,deleteProduct, updateProduct } from '../controllers/superadmin/product.controller.js';
import { outletTotalOrders } from '../controllers/superadmin/order.controller.js';
import { getStocks,addStock,deductStock,stockHistory} from '../controllers/superadmin/inventory.controller.js';
import { getExpenses,addExpense,getExpenseByDate } from '../controllers/superadmin/expense.controller.js';
import { getCustomersWithWallet,getRechargeHistoryByOutlet,getOrdersPaidViaWallet } from '../controllers/superadmin/wallet.controller.js';
import { getOutletCustomers } from '../controllers/superadmin/customer.controller.js';
import { getTickets,ticketClose } from '../controllers/superadmin/ticket.controller.js';
import { authenticateToken,authorizeRoles,restrictToSuperAdmin } from '../middlewares/auth.middleware.js';
import { getOutletSalesReport,getOutletRevenueByItems,getRevenueSplit,getWalletRechargeByDay,getProfitLossTrends,getCustomerOverview,getCustomerPerOrder} from '../controllers/superadmin/reports.controller.js';
import { getDashboardOverview, getOrderSourceDistribution, getOrderStatusDistribution, getPeakTimeSlots, getRevenueTrend, getTopSellingItems, getPendingAdminVerifications, verifyAdmin, mapOutletsToAdmin, assignAdminPermissions } from '../controllers/superadmin/dashboard.controller.js'

const adminRouter = express.Router();

adminRouter.use(restrictToSuperAdmin);

adminRouter.get('/dashboard/', authenticateToken, authorizeRoles('SUPERADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management

adminRouter.post('/add-outlet/', authenticateToken, authorizeRoles('SUPERADMIN'),addOutlets );

adminRouter.get('/get-outlets/', authenticateToken, authorizeRoles('SUPERADMIN'), getOutlets);

adminRouter.delete('/remove-outlet/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),removeOutlets);

//Staff Management
adminRouter.post('/outlets/add-staff/', authenticateToken, authorizeRoles('SUPERADMIN'),outletAddStaff);
adminRouter.post('/outlets/permissions/',authenticateToken,authorizeRoles('SUPERADMIN'), outletStaffPermission);
adminRouter.get('/outlets/get-staffs/:outletId', authenticateToken, authorizeRoles('SUPERADMIN'),getOutletStaff);

adminRouter.put('/outlets/update-staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), outletUpdateStaff);
adminRouter.delete('/outlets/delete-staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), outletDeleteStaff);
adminRouter.get('/outlets/staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), getStaffById);


//Product  management
adminRouter.get('/outlets/get-products/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getProducts);

adminRouter.post('/outlets/add-product/',authenticateToken,authorizeRoles('SUPERADMIN'),addProduct);

adminRouter.delete('/outlets/delete-product/:id',authenticateToken,authorizeRoles('SUPERADMIN'),deleteProduct);

adminRouter.put('/outlets/update-product/:id',authenticateToken,authorizeRoles('SUPERADMIN'),updateProduct)

//Order management
adminRouter.get('/outlets/:outletId/orders/', authenticateToken, authorizeRoles('SUPERADMIN'),outletTotalOrders);


//Inventory management
adminRouter.get('/outlets/get-stocks/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getStocks);

adminRouter.post('/outlets/add-stocks/',authenticateToken,authorizeRoles('SUPERADMIN'),addStock);

adminRouter.post('/outlets/deduct-stocks/',authenticateToken,authorizeRoles('SUPERADMIN'),deductStock);

adminRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('SUPERADMIN'),stockHistory);

//Expense Management
adminRouter.post('/outlets/add-expenses/',authenticateToken,authorizeRoles('SUPERADMIN'),addExpense);

adminRouter.get('/outlets/get-expenses/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getExpenses);

adminRouter.get('/outlets/get-expenses-bydate/',authenticateToken,authorizeRoles('SUPERADMIN'),getExpenseByDate); 

//Wallet Management

adminRouter.get('/outlets/wallet-history/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomersWithWallet);

adminRouter.get('/outlets/recharge-history/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getRechargeHistoryByOutlet);

adminRouter.get('/outlets/paid-wallet/',authenticateToken,authorizeRoles('SUPERADMIN'),getOrdersPaidViaWallet);

//Customer Management

adminRouter.get('/outlets/customers/:outletId/', authenticateToken, authorizeRoles('SUPERADMIN'), getOutletCustomers);

//Ticket Management
adminRouter.get('/outlets/tickets/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getTickets);

adminRouter.post('/outlets/ticket-close/',authenticateToken,authorizeRoles('SUPERADMIN'),ticketClose);

//Notification Management


//App management

//Reports Management
adminRouter.post('/outlets/sales-report/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getOutletSalesReport);
adminRouter.post('/outlets/revenue-report/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getOutletRevenueByItems);
adminRouter.post('/outlets/revenue-split/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getRevenueSplit);
adminRouter.post('/outlets/wallet-recharge-by-day/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getWalletRechargeByDay);
adminRouter.post('/outlets/profit-loss-trends/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getProfitLossTrends);
adminRouter.post('/outlets/customer-overview/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomerOverview);
adminRouter.post('/outlets/customer-per-order/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomerPerOrder);

// Dashboard Management
adminRouter.get('/dashboard/overview', authenticateToken, authorizeRoles('SUPERADMIN'), getDashboardOverview);
adminRouter.post('/dashboard/revenue-trend', authenticateToken, authorizeRoles('SUPERADMIN'), getRevenueTrend);
adminRouter.post('/dashboard/order-status-distribution', authenticateToken, authorizeRoles('SUPERADMIN'), getOrderStatusDistribution);
adminRouter.post('/dashboard/order-source-distribution', authenticateToken, authorizeRoles('SUPERADMIN'), getOrderSourceDistribution);
adminRouter.post('/dashboard/top-selling-items', authenticateToken, authorizeRoles('SUPERADMIN'), getTopSellingItems);
adminRouter.post('/dashboard/peak-time-slots', authenticateToken, authorizeRoles('SUPERADMIN'), getPeakTimeSlots);

// Superadmin: Pending admin verifications
adminRouter.get('/pending-admins', authenticateToken, authorizeRoles('SUPERADMIN'), getPendingAdminVerifications);
adminRouter.post('/verify-admin/:adminId', authenticateToken, authorizeRoles('SUPERADMIN'), verifyAdmin);

//Permssion and outletid assigning
adminRouter.post('/map-outlets-to-admin', restrictToSuperAdmin, mapOutletsToAdmin);
adminRouter.post('/assign-admin-permissions', restrictToSuperAdmin, assignAdminPermissions);

export default adminRouter;
