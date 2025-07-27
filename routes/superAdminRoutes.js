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
import { getDashboardOverview, getOrderSourceDistribution, getOrderStatusDistribution, getPeakTimeSlots, getRevenueTrend, getTopSellingItems, getPendingAdminVerifications, verifyAdmin, mapOutletsToAdmin, assignAdminPermissions,getVerifiedAdmins,verifyStaff,getUnverifiedStaff } from '../controllers/superadmin/dashboard.controller.js'

const superadminRouter = express.Router();

superadminRouter.use(restrictToSuperAdmin);

superadminRouter.get('/dashboard/', authenticateToken, authorizeRoles('SUPERADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management

superadminRouter.post('/add-outlet/', authenticateToken, authorizeRoles('SUPERADMIN'),addOutlets );

superadminRouter.get('/get-outlets/', authenticateToken, authorizeRoles('SUPERADMIN'), getOutlets);

superadminRouter.delete('/remove-outlet/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),removeOutlets);

//Staff Management
superadminRouter.post('/outlets/add-staff/', authenticateToken, authorizeRoles('SUPERADMIN'),outletAddStaff);
superadminRouter.post('/outlets/permissions/',authenticateToken,authorizeRoles('SUPERADMIN'), outletStaffPermission);
superadminRouter.get('/outlets/get-staffs/:outletId', authenticateToken, authorizeRoles('SUPERADMIN'),getOutletStaff);

superadminRouter.put('/outlets/update-staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), outletUpdateStaff);
superadminRouter.delete('/outlets/delete-staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), outletDeleteStaff);
superadminRouter.get('/outlets/staff/:staffId', authenticateToken, authorizeRoles('SUPERADMIN'), getStaffById);


//Product  management
superadminRouter.get('/outlets/get-products/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getProducts);

superadminRouter.post('/outlets/add-product/',authenticateToken,authorizeRoles('SUPERADMIN'),addProduct);

superadminRouter.delete('/outlets/delete-product/:id',authenticateToken,authorizeRoles('SUPERADMIN'),deleteProduct);

superadminRouter.put('/outlets/update-product/:id',authenticateToken,authorizeRoles('SUPERADMIN'),updateProduct)

//Order management
superadminRouter.get('/outlets/:outletId/orders/', authenticateToken, authorizeRoles('SUPERADMIN'),outletTotalOrders);


//Inventory management
superadminRouter.get('/outlets/get-stocks/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getStocks);

superadminRouter.post('/outlets/add-stocks/',authenticateToken,authorizeRoles('SUPERADMIN'),addStock);

superadminRouter.post('/outlets/deduct-stocks/',authenticateToken,authorizeRoles('SUPERADMIN'),deductStock);

superadminRouter.post('/outlets/get-stock-history',authenticateToken,authorizeRoles('SUPERADMIN'),stockHistory);

//Expense Management
superadminRouter.post('/outlets/add-expenses/',authenticateToken,authorizeRoles('SUPERADMIN'),addExpense);

superadminRouter.get('/outlets/get-expenses/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getExpenses);

superadminRouter.get('/outlets/get-expenses-bydate/',authenticateToken,authorizeRoles('SUPERADMIN'),getExpenseByDate); 

//Wallet Management

superadminRouter.get('/outlets/wallet-history/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomersWithWallet);

superadminRouter.get('/outlets/recharge-history/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getRechargeHistoryByOutlet);

superadminRouter.get('/outlets/paid-wallet/',authenticateToken,authorizeRoles('SUPERADMIN'),getOrdersPaidViaWallet);

//Customer Management

superadminRouter.get('/outlets/customers/:outletId/', authenticateToken, authorizeRoles('SUPERADMIN'), getOutletCustomers);

//Ticket Management
superadminRouter.get('/outlets/tickets/:outletId',authenticateToken,authorizeRoles('SUPERADMIN'),getTickets);

superadminRouter.post('/outlets/ticket-close/',authenticateToken,authorizeRoles('SUPERADMIN'),ticketClose);

//Notification Management


//App management

//Reports Management
superadminRouter.post('/outlets/sales-report/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getOutletSalesReport);
superadminRouter.post('/outlets/revenue-report/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getOutletRevenueByItems);
superadminRouter.post('/outlets/revenue-split/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getRevenueSplit);
superadminRouter.post('/outlets/wallet-recharge-by-day/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getWalletRechargeByDay);
superadminRouter.post('/outlets/profit-loss-trends/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getProfitLossTrends);
superadminRouter.post('/outlets/customer-overview/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomerOverview);
superadminRouter.post('/outlets/customer-per-order/:outletId/',authenticateToken,authorizeRoles('SUPERADMIN'),getCustomerPerOrder);

// Dashboard Management
superadminRouter.get('/dashboard/overview', authenticateToken, authorizeRoles('SUPERADMIN'), getDashboardOverview);
superadminRouter.post('/dashboard/revenue-trend', authenticateToken, authorizeRoles('SUPERADMIN'), getRevenueTrend);
superadminRouter.post('/dashboard/order-status-distribution', authenticateToken, authorizeRoles('SUPERADMIN'), getOrderStatusDistribution);
superadminRouter.post('/dashboard/order-source-distribution', authenticateToken, authorizeRoles('SUPERADMIN'), getOrderSourceDistribution);
superadminRouter.post('/dashboard/top-selling-items', authenticateToken, authorizeRoles('SUPERADMIN'), getTopSellingItems);
superadminRouter.post('/dashboard/peak-time-slots', authenticateToken, authorizeRoles('SUPERADMIN'), getPeakTimeSlots);

// Superadmin: Pending admin and staff verifications
superadminRouter.get('/pending-admins', authenticateToken, authorizeRoles('SUPERADMIN'), getPendingAdminVerifications);
superadminRouter.post('/verify-admin/:adminId', authenticateToken, authorizeRoles('SUPERADMIN'), verifyAdmin);
superadminRouter.get('/verified-admins', authenticateToken, authorizeRoles('SUPERADMIN'), getVerifiedAdmins);
superadminRouter.post('/verify-staff/:userId', authenticateToken, authorizeRoles('SUPERADMIN'), verifyStaff)
superadminRouter.get('/unverified-staff', authenticateToken, authorizeRoles('SUPERADMIN'), getUnverifiedStaff);
//Permssion and outletid assigning
superadminRouter.post('/map-outlets-to-admin', restrictToSuperAdmin, mapOutletsToAdmin);
superadminRouter.post('/assign-admin-permissions', restrictToSuperAdmin, assignAdminPermissions);


export default superadminRouter;
