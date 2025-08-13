import prisma from "../../prisma/client.js";
import razorpayService from "../../services/razorpayService.js";
import crypto from 'crypto';

// Test endpoint to simulate complete Razorpay payment flow
export const simulateRazorpayPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user.id;

    if (!orderId || !amount) {
      return res.status(400).json({
        message: 'Order ID and amount are required'
      });
    }

    // Get customer details
    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    // Generate mock payment ID (similar to Razorpay format)
    const mockPaymentId = `pay_${crypto.randomBytes(12).toString('hex')}`;
    
    // Create proper signature using the same method Razorpay uses
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "7kpwsEwlmizR3A17LgaQ9a2E";
    const body = orderId + "|" + mockPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(body.toString())
      .digest("hex");

    // Create mock payment object (similar to what Razorpay returns)
    const mockPayment = {
      id: mockPaymentId,
      entity: "payment",
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      status: "captured",
      order_id: orderId,
      method: "upi",
      captured: true,
      created_at: Math.floor(Date.now() / 1000),
      notes: {
        customer_id: customerDetails.id.toString(),
        user_id: userId.toString(),
        wallet_amount: (amount / 1.02).toFixed(2), // Calculate wallet amount from gross
        service_charge: (amount - (amount / 1.02)).toFixed(2),
        transaction_type: 'wallet_recharge'
      }
    };

    res.status(200).json({
      message: 'Mock payment simulation successful',
      mockPaymentData: {
        razorpay_order_id: orderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: expectedSignature
      },
      paymentDetails: mockPayment,
      instructions: {
        step1: 'Copy the mockPaymentData above',
        step2: 'Use it in the verify-wallet-recharge endpoint',
        step3: 'The signature will be valid and payment will be processed'
      }
    });

  } catch (error) {
    console.error('Error simulating payment:', error);
    res.status(500).json({
      message: 'Failed to simulate payment',
      error: error.message
    });
  }
};

// Enhanced verify endpoint that can handle both real and mock payments
export const verifyWalletRechargeEnhanced = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      isTestMode = false
    } = req.body;
    const userId = req.user.id;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: 'Missing payment verification details'
      });
    }

    // Verify payment signature
    const isValidSignature = razorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      return res.status(400).json({
        message: 'Payment verification failed',
        error: 'Invalid signature'
      });
    }

    // Get customer details
    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    let payment;
    
    if (isTestMode || razorpay_payment_id.startsWith('pay_test_')) {
      // Handle test/mock payment
      const walletAmount = parseFloat(req.body.wallet_amount || 100);
      const serviceCharge = parseFloat(req.body.service_charge || 2);
      const grossAmount = walletAmount + serviceCharge;

      payment = {
        id: razorpay_payment_id,
        amount: grossAmount * 100, // Convert to paise
        status: 'captured',
        method: 'upi',
        order_id: razorpay_order_id,
        notes: {
          customer_id: customerId.toString(),
          user_id: userId.toString(),
          wallet_amount: walletAmount.toString(),
          service_charge: serviceCharge.toString(),
          transaction_type: 'wallet_recharge'
        }
      };
    } else {
      // Fetch real payment details from Razorpay
      const paymentResult = await razorpayService.fetchPaymentDetails(razorpay_payment_id);
      
      if (!paymentResult.success) {
        return res.status(500).json({
          message: 'Failed to fetch payment details',
          error: paymentResult.error
        });
      }

      payment = paymentResult.payment;

      // Verify payment status
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        return res.status(400).json({
          message: 'Payment not successful',
          status: payment.status
        });
      }
    }

    // Process wallet recharge in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check if payment already processed
      const existingTransaction = await tx.walletTransaction.findFirst({
        where: { razorpayPaymentId: razorpay_payment_id }
      });

      if (existingTransaction) {
        throw new Error('Payment already processed');
      }

      // Extract amounts from payment notes
      const walletAmount = parseFloat(payment.notes.wallet_amount);
      const serviceCharge = parseFloat(payment.notes.service_charge);
      const grossAmount = payment.amount / 100; // Convert from paise

      // Update wallet balance
      const wallet = await tx.wallet.upsert({
        where: { customerId },
        create: {
          customerId,
          balance: walletAmount,
          totalRecharged: walletAmount,
          totalUsed: 0,
          lastRecharged: new Date()
        },
        update: {
          balance: { increment: walletAmount },
          totalRecharged: { increment: walletAmount },
          lastRecharged: new Date()
        }
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: walletAmount,
          grossAmount: grossAmount,
          serviceCharge: serviceCharge,
          method: payment.method === 'upi' ? 'UPI' : 'CARD',
          razorpayPaymentId: razorpay_payment_id,
          razorpayOrderId: razorpay_order_id,
          status: 'RECHARGE'
        }
      });

      return { wallet, transaction };
    });

    res.status(200).json({
      message: 'Wallet recharged successfully',
      testMode: isTestMode,
      wallet: {
        balance: result.wallet.balance,
        totalRecharged: result.wallet.totalRecharged,
        lastRecharged: result.wallet.lastRecharged
      },
      transaction: {
        id: result.transaction.id,
        amount: result.transaction.amount,
        grossAmount: result.transaction.grossAmount,
        serviceCharge: result.transaction.serviceCharge,
        method: result.transaction.method,
        createdAt: result.transaction.createdAt
      },
      payment: {
        id: payment.id,
        status: payment.status,
        method: payment.method
      }
    });

  } catch (error) {
    console.error('Error verifying wallet recharge:', error);
    
    if (error.message === 'Payment already processed') {
      return res.status(409).json({
        message: 'Payment already processed',
        error: error.message
      });
    }

    res.status(500).json({
      message: 'Wallet recharge verification failed',
      error: error.message
    });
  }
};

// Test endpoint to generate valid Razorpay webhook simulation
export const simulateRazorpayWebhook = async (req, res) => {
  try {
    const { orderId, paymentId, amount } = req.body;

    if (!orderId || !paymentId || !amount) {
      return res.status(400).json({
        message: 'Order ID, Payment ID, and amount are required'
      });
    }

    // Create webhook payload similar to Razorpay
    const webhookPayload = {
      entity: "event",
      account_id: "acc_test_account",
      event: "payment.captured",
      contains: ["payment"],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: "payment",
            amount: Math.round(amount * 100),
            currency: "INR",
            status: "captured",
            order_id: orderId,
            method: "upi",
            captured: true,
            created_at: Math.floor(Date.now() / 1000)
          }
        }
      },
      created_at: Math.floor(Date.now() / 1000)
    };

    res.status(200).json({
      message: 'Webhook simulation generated',
      webhook: webhookPayload,
      note: 'This simulates what Razorpay would send to your webhook endpoint'
    });

  } catch (error) {
    console.error('Error simulating webhook:', error);
    res.status(500).json({
      message: 'Failed to simulate webhook',
      error: error.message
    });
  }
};