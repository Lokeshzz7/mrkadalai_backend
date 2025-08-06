
import express from "express";
import { customerAppOngoingOrderList,customerAppOrder,customerAppOrderHistory,customerAppCancelOrder } from "../controllers/customer/order.controller.js";
import { getProductsAndStocks } from "../controllers/customer/home.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { rechargeWallet,recentTrans,getWalletDetails,getRechargeHistory } from "../controllers/customer/wallet.controller.js";
import { getCart, updateCartItem } from "../controllers/customer/cart.controller.js";
import { editProfile, getProfile } from "../controllers/customer/profile.controller.js";
import { 
  createTicket, 
  getCustomerTickets, 
  getTicketDetails 
} from "../controllers/customer/ticket.controller.js";
import { applyCoupon, getCoupons } from "../controllers/customer/coupon.controller.js";
const customerRouter = express.Router();

// Products Fetch 
customerRouter.get("/outlets/get-product/",authenticateToken,authorizeRoles('CUSTOMER'),getProductsAndStocks);

//Order management
customerRouter.post("/outlets/customer-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrder)
customerRouter.get("/outlets/customer-ongoing-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOngoingOrderList)
customerRouter.get("/outlets/customer-order-history/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrderHistory)
customerRouter.put("/outlets/customer-cancel-order/:orderId", authenticateToken, authorizeRoles('CUSTOMER'), customerAppCancelOrder);

//Wallet management
customerRouter.post("/outlets/recharge-wallet",authenticateToken,authorizeRoles('CUSTOMER'),rechargeWallet);
customerRouter.get("/outlets/get-recent-recharge",authenticateToken,authorizeRoles('CUSTOMER'),recentTrans);
customerRouter.get("/outlets/get-wallet-details", authenticateToken, authorizeRoles('CUSTOMER'), getWalletDetails);
customerRouter.get("/outlets/get-recharge-history", authenticateToken, authorizeRoles('CUSTOMER'), getRechargeHistory);


//Cart management
customerRouter.put("/outlets/update-cart-item",authenticateToken,authorizeRoles('CUSTOMER'),updateCartItem);
customerRouter.get("/outlets/get-cart", authenticateToken, authorizeRoles('CUSTOMER'), getCart);

//Profile management
customerRouter.put("/outlets/edit-profile",authenticateToken,authorizeRoles('CUSTOMER'),editProfile);
customerRouter.get("/outlets/get-profile",authenticateToken,authorizeRoles('CUSTOMER'),getProfile);


//Ticket Management
customerRouter.post("/outlets/tickets/create", authenticateToken, authorizeRoles('CUSTOMER'), createTicket);
customerRouter.get("/outlets/tickets", authenticateToken, authorizeRoles('CUSTOMER'), getCustomerTickets);
customerRouter.get("/outlets/tickets/:ticketId", authenticateToken, authorizeRoles('CUSTOMER'), getTicketDetails);

//Coupon Management
customerRouter.get("/outlets/coupons", authenticateToken, authorizeRoles('CUSTOMER'), getCoupons);
customerRouter.post("/outlets/apply-coupon", authenticateToken, authorizeRoles('CUSTOMER'), applyCoupon);

export default customerRouter;