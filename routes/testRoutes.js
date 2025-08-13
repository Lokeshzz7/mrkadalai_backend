import express from "express";
import { authenticateToken, authorizeRoles } from "../middlewares/auth.middleware.js";
import { 
  simulateRazorpayPayment, 
  verifyWalletRechargeEnhanced, 
  simulateRazorpayWebhook 
} from "../controllers/test/razorpayTest.controller.js";

const testRouter = express.Router();

// Test routes for Razorpay simulation (only for development/testing)
if (process.env.NODE_ENV !== 'production') {
  // Simulate Razorpay payment and generate valid signature
  testRouter.post("/simulate-razorpay-payment", authenticateToken, authorizeRoles('CUSTOMER'), simulateRazorpayPayment);
  
  // Enhanced verify endpoint that handles both real and mock payments
  testRouter.post("/verify-wallet-recharge-enhanced", authenticateToken, authorizeRoles('CUSTOMER'), verifyWalletRechargeEnhanced);
  
  // Simulate Razorpay webhook
  testRouter.post("/simulate-razorpay-webhook", simulateRazorpayWebhook);
}

export default testRouter;