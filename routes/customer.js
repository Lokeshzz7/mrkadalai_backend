import express from "express";
import { getProducts } from "../controllers/staff/manualOrder.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const customerrouter = express.Router();

customerrouter.get("/outlets/get-product/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),getProducts)
customerrouter.get("/outlets/customer-order/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),CustomerAppOrder)


export default  customerrouter;

