import express from "express";
import { getProducts } from "../controllers/staff/manualOrder.controller.js";
import { authenticate, authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";

const customerrouter = express.Router();

customerrouter.get("/outlets/get-product/:outletId",authenticateToken,authorizeRoles('CUSTOMER'),getProducts)



export default  customerrouter;

