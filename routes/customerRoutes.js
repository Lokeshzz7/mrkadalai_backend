
import express from "express";
import { customerAppOngoingOrderList,customerAppOrder,customerAppOrderHistory } from "../controllers/customer/order.controller.js";
import { getProductsAndStocks } from "../controllers/customer/home.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { rechargeWallet,recentTrans } from "../controllers/customer/wallet.controller.js";
import { getCart, updateCartItem } from "../controllers/customer/cart.controller.js";
import { editProfile } from "../controllers/customer/profile.controller.js";
const customerRouter = express.Router();

// Products Fetch 
customerRouter.get("/outlets/get-product/",authenticateToken,authorizeRoles('CUSTOMER'),getProductsAndStocks);

//Order management
customerRouter.post("/outlets/customer-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrder)
customerRouter.get("/outlets/customer-ongoing-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOngoingOrderList)
customerRouter.get("/outlets/customer-order-history/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrderHistory)

//Wallet management
customerRouter.post("/outlets/recharge-wallet",authenticateToken,authorizeRoles('CUSTOMER'),rechargeWallet);
customerRouter.get("/outlets/get-recent-recharge",authenticateToken,authorizeRoles('CUSTOMER'),recentTrans);


//Cart management
customerRouter.put("/outlets/update-cart-item",authenticateToken,authorizeRoles('CUSTOMER'),updateCartItem);
// Add this route
customerRouter.get("/outlets/get-cart", authenticateToken, authorizeRoles('CUSTOMER'), getCart);

//Profile management
customerRouter.get("/outlets/get-profile",authenticateToken,authorizeRoles('CUSTOMER'),editProfile);

export default  customerRouter;