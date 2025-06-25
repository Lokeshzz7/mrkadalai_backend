import express from "express";
import { getProducts } from "../controllers/staff/manualOrder.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const customerRouter = express.Router();

customerRouter.get("/outlets/get-product/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),getProducts)
customerRouter.get("/outlets/customer-order/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),CustomerAppOrder)


export default  customerRouter;

