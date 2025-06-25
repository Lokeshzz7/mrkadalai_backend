
import express from "express";
import { getProducts} from "../controllers/staff/manualOrder.controller.js";
import { customerAppOngoingOrderList,customerAppOrder,customerAppOrderHistory } from "../controllers/customer/order.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import {customerAppOrder} from "../controllers/customer/order.controller.js";
const customerRouter = express.Router();

customerRouter.get("/outlets/get-product/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),getProducts)
customerRouter.post("/outlets/customer-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrder)
customerRouter.get("/outlets/customer-ongoing-order/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOngoingOrderList)
customerRouter.get("/outlets/customer-order-history/",authenticateToken,authorizeRoles('CUSTOMER'),customerAppOrderHistory)


export default  customerRouter;