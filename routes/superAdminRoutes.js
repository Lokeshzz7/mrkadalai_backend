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
import { authenticateToken,authorizeRoles,restrictToSuperAdmin, restrictToSuperAdminOrAdmin } from '../middlewares/auth.middleware.js';
import { getOutletSalesReport,getOutletRevenueByItems,getRevenueSplit,getWalletRechargeByDay,getProfitLossTrends,getCustomerOverview,getCustomerPerOrder} from '../controllers/superadmin/reports.controller.js';
import { getDashboardOverview, getOrderSourceDistribution, getOrderStatusDistribution, getPeakTimeSlots, getRevenueTrend, getTopSellingItems, getPendingAdminVerifications, verifyAdmin, mapOutletsToAdmin, assignAdminPermissions,getVerifiedAdmins,verifyStaff,getUnverifiedStaff, getVerifiedStaff } from '../controllers/superadmin/dashboard.controller.js'

const superadminRouter = express.Router();

superadminRouter.get('/dashboard/', authenticateToken, authorizeRoles('SUPERADMIN'), (req, res) => {
  res.json({ message: 'Welcome to Admin Dashboard' });
});

//Outlet Management
superadminRouter.post('/add-outlet/', restrictToSuperAdmin, addOutlets);
superadminRouter.get('/get-outlets/', restrictToSuperAdmin, getOutlets);
superadminRouter.delete('/remove-outlet/:outletId/', restrictToSuperAdmin, removeOutlets);

//Staff Management
superadminRouter.post('/outlets/add-staff/', restrictToSuperAdmin, outletAddStaff);
superadminRouter.post('/outlets/permissions/', restrictToSuperAdmin, outletStaffPermission);
superadminRouter.get('/outlets/get-staffs/:outletId', restrictToSuperAdmin, getOutletStaff);
superadminRouter.put('/outlets/update-staff/:staffId', restrictToSuperAdmin, outletUpdateStaff);
superadminRouter.delete('/outlets/delete-staff/:staffId', restrictToSuperAdmin, outletDeleteStaff);
superadminRouter.get('/outlets/staff/:staffId', restrictToSuperAdmin, getStaffById);

//Product management
superadminRouter.get('/outlets/get-products/:outletId', restrictToSuperAdmin, getProducts);
superadminRouter.post('/outlets/add-product/', restrictToSuperAdmin, addProduct);
superadminRouter.delete('/outlets/delete-product/:id', restrictToSuperAdmin, deleteProduct);
superadminRouter.put('/outlets/update-product/:id', restrictToSuperAdmin, updateProduct);

//Order management
superadminRouter.get('/outlets/:outletId/orders/', restrictToSuperAdmin, outletTotalOrders);

//Inventory management
superadminRouter.get('/outlets/get-stocks/:outletId', restrictToSuperAdmin, getStocks);
superadminRouter.post('/outlets/add-stocks/', restrictToSuperAdmin, addStock);
superadminRouter.post('/outlets/deduct-stocks/', restrictToSuperAdmin, deductStock);
superadminRouter.post('/outlets/get-stock-history', restrictToSuperAdmin, stockHistory);

//Expense Management
superadminRouter.post('/outlets/add-expenses/', restrictToSuperAdmin, addExpense);
superadminRouter.get('/outlets/get-expenses/:outletId/', restrictToSuperAdmin, getExpenses);
superadminRouter.get('/outlets/get-expenses-bydate/', restrictToSuperAdmin, getExpenseByDate);

//Wallet Management
superadminRouter.get('/outlets/wallet-history/:outletId/', restrictToSuperAdmin, getCustomersWithWallet);
superadminRouter.get('/outlets/recharge-history/:outletId/', restrictToSuperAdmin, getRechargeHistoryByOutlet);
superadminRouter.get('/outlets/paid-wallet/', restrictToSuperAdmin, getOrdersPaidViaWallet);

//Customer Management
superadminRouter.get('/outlets/customers/:outletId/', restrictToSuperAdmin, getOutletCustomers);

//Ticket Management
superadminRouter.get('/outlets/tickets/:outletId', restrictToSuperAdmin, getTickets);
superadminRouter.post('/outlets/ticket-close/', restrictToSuperAdmin, ticketClose);

//Notification Management


//App management

//Reports Management
superadminRouter.post('/outlets/sales-report/:outletId/', restrictToSuperAdminOrAdmin, getOutletSalesReport);
superadminRouter.post('/outlets/revenue-report/:outletId/', restrictToSuperAdmin, getOutletRevenueByItems);
superadminRouter.post('/outlets/revenue-split/:outletId/', restrictToSuperAdmin, getRevenueSplit);
superadminRouter.post('/outlets/wallet-recharge-by-day/:outletId/', restrictToSuperAdmin, getWalletRechargeByDay);
superadminRouter.post('/outlets/profit-loss-trends/:outletId/', restrictToSuperAdmin, getProfitLossTrends);
superadminRouter.post('/outlets/customer-overview/:outletId/', restrictToSuperAdmin, getCustomerOverview);
superadminRouter.post('/outlets/customer-per-order/:outletId/', restrictToSuperAdmin, getCustomerPerOrder);

// Dashboard Management
superadminRouter.get('/dashboard/overview', restrictToSuperAdmin, getDashboardOverview);
superadminRouter.post('/dashboard/revenue-trend', restrictToSuperAdmin, getRevenueTrend);
superadminRouter.post('/dashboard/order-status-distribution', restrictToSuperAdmin, getOrderStatusDistribution);
superadminRouter.post('/dashboard/order-source-distribution', restrictToSuperAdmin, getOrderSourceDistribution);
superadminRouter.post('/dashboard/top-selling-items', restrictToSuperAdmin, getTopSellingItems);
superadminRouter.post('/dashboard/peak-time-slots', restrictToSuperAdmin, getPeakTimeSlots);

// Superadmin: Pending admin and staff verifications
superadminRouter.get('/pending-admins', restrictToSuperAdmin, getPendingAdminVerifications);
superadminRouter.post('/verify-admin/:adminId', restrictToSuperAdmin, verifyAdmin);
superadminRouter.get('/verified-admins', restrictToSuperAdmin, getVerifiedAdmins);
superadminRouter.post('/verify-staff/:userId', restrictToSuperAdmin, verifyStaff);
superadminRouter.get('/unverified-staff', restrictToSuperAdmin, getUnverifiedStaff);
superadminRouter.get('/verified-staff', restrictToSuperAdmin, getVerifiedStaff);

//Permssion and outletid assigning
superadminRouter.post('/map-outlets-to-admin', restrictToSuperAdmin, mapOutletsToAdmin);
superadminRouter.post('/assign-admin-permissions', restrictToSuperAdmin, assignAdminPermissions);


export default superadminRouter;
