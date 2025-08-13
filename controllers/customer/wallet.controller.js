import prisma from "../../prisma/client.js";
import razorpayService from "../../services/razorpayService.js";

// Create Razorpay order for wallet recharge
export const createWalletRechargeOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        message: 'Invalid amount',
        error: 'Amount must be greater than 0'
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

    // Create Razorpay order
    const orderResult = await razorpayService.createWalletRechargeOrder(
      amount, 
      customerDetails.id, 
      userId
    );

    if (!orderResult.success) {
      return res.status(500).json({
        message: 'Failed to create payment order',
        error: orderResult.error
      });
    }

    // Get service charge breakdown for display
    const breakdown = razorpayService.getServiceChargeBreakdown(amount);

    res.status(201).json({
      message: 'Wallet recharge order created successfully',
      order: {
        id: orderResult.order.id,
        amount: orderResult.order.amount, // Amount in paise
        currency: orderResult.order.currency,
        receipt: orderResult.order.receipt
      },
      breakdown: {
        walletAmount: breakdown.walletAmount,
        serviceCharge: breakdown.serviceCharge,
        totalPayable: breakdown.totalPayable,
        serviceChargePercentage: breakdown.serviceChargePercentage
      }
    });

  } catch (error) {
    console.error('Error creating wallet recharge order:', error);
    res.status(500).json({
      message: 'Failed to create wallet recharge order',
      error: error.message
    });
  }
};

// Verify payment and recharge wallet
export const verifyWalletRecharge = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
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

    // Fetch payment details from Razorpay
    const paymentResult = await razorpayService.fetchPaymentDetails(razorpay_payment_id);
    
    if (!paymentResult.success) {
      return res.status(500).json({
        message: 'Failed to fetch payment details',
        error: paymentResult.error
      });
    }

    const payment = paymentResult.payment;

    // Verify payment status
    if (payment.status !== 'captured' && payment.status !== 'authorized') {
      return res.status(400).json({
        message: 'Payment not successful',
        status: payment.status
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

// Legacy cash recharge (for staff/admin use)
export const rechargeWallet = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const paymentMethod = req.body.paymentMethod;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Only allow CASH for direct recharge (UPI/CARD should use Razorpay flow)
    if (paymentMethod !== 'CASH') {
      return res.status(400).json({ 
        message: 'Use Razorpay flow for UPI/CARD payments',
        hint: 'Use /create-wallet-recharge-order and /verify-wallet-recharge endpoints'
      });
    }

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    let wallet = await prisma.wallet.upsert({
      where: { customerId },
      create: {
        customerId,
        balance: amount,
        totalRecharged: amount,
        totalUsed: 0,
        lastRecharged: new Date(),
        transactions: {
          create: {
            amount,
            method: paymentMethod,
            status: 'RECHARGE',
          }
        }
      },
      update: {
        balance: { increment: amount },
        totalRecharged: { increment: amount },
        lastRecharged: new Date(),
        transactions: {
          create: {
            amount,
            method: paymentMethod,
            status: 'RECHARGE',
          }
        }
      },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    res.status(200).json({
      message: 'Wallet recharged successfully',
      wallet: {
        balance: wallet.balance,
        totalRecharged: wallet.totalRecharged,
        lastRecharged: wallet.lastRecharged
      },
      transaction: wallet.transactions[0]
    });

  } catch (error) {
    console.error('Recharge error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const recentTrans = async (req, res) => {
  try {
    const userId = req.user.id;

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20 // Limit to recent 20 transactions
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Format transactions with service charge info
    const formattedTransactions = wallet.transactions.map(txn => ({
      id: txn.id,
      amount: txn.amount,
      grossAmount: txn.grossAmount,
      serviceCharge: txn.serviceCharge,
      method: txn.method,
      status: txn.status,
      razorpayPaymentId: txn.razorpayPaymentId,
      createdAt: txn.createdAt,
      // Add display fields
      displayAmount: txn.status === 'RECHARGE' ? `+₹${txn.amount}` : `-₹${Math.abs(txn.amount)}`,
      hasServiceCharge: txn.serviceCharge && txn.serviceCharge > 0,
      totalPaid: txn.grossAmount || txn.amount
    }));

    res.status(200).json({
      message: 'Recent transactions fetched successfully',
      transactions: formattedTransactions,
      walletBalance: wallet.balance
    });

  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWalletDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    let wallet = await prisma.wallet.findUnique({
      where: { customerId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          customerId,
          balance: 0,
          totalRecharged: 0,
          totalUsed: 0,
        }
      });
    }

    res.status(200).json({
      message: 'Wallet details fetched successfully',
      wallet: {
        balance: wallet.balance,
        totalRecharged: wallet.totalRecharged,
        totalUsed: wallet.totalUsed,
        lastRecharged: wallet.lastRecharged,
        lastOrder: wallet.lastOrder
      }
    });

  } catch (error) {
    console.error('Error fetching wallet details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getRechargeHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
      include: {
        transactions: {
          where: {
            status: 'RECHARGE' 
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    // Format recharge history with service charge breakdown
    const formattedHistory = wallet.transactions.map(txn => ({
      id: txn.id,
      walletAmount: txn.amount, // Amount credited to wallet
      totalPaid: txn.grossAmount || txn.amount, // Total amount paid by customer
      serviceCharge: txn.serviceCharge || 0,
      method: txn.method,
      razorpayPaymentId: txn.razorpayPaymentId,
      createdAt: txn.createdAt,
      // Calculate service charge percentage if applicable
      serviceChargePercentage: txn.serviceCharge && txn.amount > 0 
        ? Math.round((txn.serviceCharge / txn.amount) * 100 * 100) / 100 
        : 0,
      isOnlinePayment: txn.razorpayPaymentId ? true : false
    }));

    // Calculate totals
    const totalRecharged = formattedHistory.reduce((sum, txn) => sum + txn.walletAmount, 0);
    const totalPaid = formattedHistory.reduce((sum, txn) => sum + txn.totalPaid, 0);
    const totalServiceCharges = formattedHistory.reduce((sum, txn) => sum + txn.serviceCharge, 0);

    res.status(200).json({
      message: 'Recharge history fetched successfully',
      rechargeHistory: formattedHistory,
      summary: {
        totalTransactions: formattedHistory.length,
        totalWalletAmount: totalRecharged,
        totalAmountPaid: totalPaid,
        totalServiceCharges: totalServiceCharges,
        currentBalance: wallet.balance
      }
    });

  } catch (error) {
    console.error('Error fetching recharge history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get service charge breakdown for a given amount (utility endpoint)
export const getServiceChargeBreakdown = async (req, res) => {
  try {
    const { amount } = req.query;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        message: 'Invalid amount',
        error: 'Amount must be a positive number'
      });
    }

    const walletAmount = parseFloat(amount);
    const breakdown = razorpayService.getServiceChargeBreakdown(walletAmount);

    res.status(200).json({
      message: 'Service charge breakdown calculated successfully',
      breakdown
    });

  } catch (error) {
    console.error('Error calculating service charge breakdown:', error);
    res.status(500).json({
      message: 'Failed to calculate service charge breakdown',
      error: error.message
    });
  }
};