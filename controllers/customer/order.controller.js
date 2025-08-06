import prisma from "../../prisma/client.js";
import Razorpay from 'razorpay';
import crypto from 'crypto';

// export const customerAppOrder1 = async (req, res) => {
//   try {
//     const { totalAmount, paymentMethod, deliverySlot, items, outletId } = req.body;
//     const userId = req.user.id;

//     if (!totalAmount || !paymentMethod || !deliverySlot || !items || !Array.isArray(items) || items.length === 0 || !outletId) {
//       return res.status(400).json({ 
//         message: "Invalid input: totalAmount, paymentMethod, deliverySlot, outletId, and items are required" 
//       });
//     }

//     if (typeof outletId !== 'number' || outletId <= 0) {
//       return res.status(400).json({ 
//         message: "Invalid outletId: must be a positive number" 
//       });
//     }

//     const validPaymentMethods = ['WALLET', 'UPI', 'CARD'];
//     if (!validPaymentMethods.includes(paymentMethod)) {
//       return res.status(400).json({ 
//         message: "Invalid payment method" 
//       });
//     }
//     const validDeliverySlots = ['SLOT_11_12', 'SLOT_12_13', 'SLOT_13_14', 'SLOT_14_15', 'SLOT_15_16', 'SLOT_16_17'];
//     if (!validDeliverySlots.includes(deliverySlot)) {
//       return res.status(400).json({ 
//         message: "Invalid delivery slot" 
//       });
//     }

//     const outlet = await prisma.outlet.findUnique({
//       where: { id: outletId },
//       select: { id: true, isActive: true, name: true }
//     });

//     if (!outlet) {
//       return res.status(404).json({ message: "Outlet not found" });
//     }

//     if (!outlet.isActive) {
//       return res.status(400).json({ message: "Selected outlet is currently inactive" });
//     }

//     const customer = await prisma.customerDetails.findUnique({
//       where: { userId },
//       select: { id: true },
//     });

//     if (!customer) {
//       return res.status(404).json({ message: "Customer not found" });
//     }

//     const customerId = customer.id;

//     let walletTransaction = null;
//     if (paymentMethod === 'WALLET') {
//       const wallet = await prisma.wallet.findUnique({
//         where: { customerId }
//       });

//       if (!wallet) {
//         return res.status(404).json({ message: "Wallet not found" });
//       }

//       if (wallet.balance < totalAmount) {
//         return res.status(400).json({ 
//           message: "Insufficient wallet balance", 
//           availableBalance: wallet.balance,
//           requiredAmount: totalAmount
//         });
//       }

//       // Deduct amount from wallet
//       await prisma.wallet.update({
//         where: { customerId },
//         data: {
//           balance: wallet.balance - totalAmount,
//           totalUsed: wallet.totalUsed + totalAmount,
//           lastOrder: new Date()
//         }
//       });

//       // Create wallet transaction record
//       walletTransaction = await prisma.walletTransaction.create({
//         data: {
//           walletId: wallet.id,
//           amount: -totalAmount,
//           method: 'WALLET',
//           status: 'DEDUCT'
//         }
//       });
//     }

//     const deliveryDate = new Date();
//     deliveryDate.setHours(0, 0, 0, 0); 

//     const order = await prisma.order.create({
//       data: {
//         customerId,
//         outletId, 
//         totalAmount,
//         paymentMethod,
//         status: 'PENDING',
//         type: 'APP',
//         deliveryDate,
//         deliverySlot,
//         isPreOrder: false,
//         items: {
//           create: items.map(item => ({
//             productId: item.productId,
//             quantity: item.quantity,
//             unitPrice: item.unitPrice,
//             status: 'NOT_DELIVERED'
//           }))
//         }
//       },
//       include: {
//         items: {
//           include: {
//             product: true
//           }
//         },
//         customer: {
//           include: {
//             user: {
//               select: {
//                 name: true,
//                 email: true,
//                 phone: true
//               }
//             }
//           }
//         },
//         outlet: {
//           select: {
//             id: true,
//             name: true,
//             address: true
//           }
//         }
//       }
//     });

//     const cart = await prisma.cart.findUnique({
//       where: { customerId }
//     });

//     if (cart) {
//       await prisma.cartItem.deleteMany({
//         where: { cartId: cart.id }
//       });
//     }
//     for (const item of items) {
//       const inventory = await prisma.inventory.findUnique({
//         where: { productId: item.productId }
//       });

//       if (inventory && inventory.quantity >= item.quantity) {
//         await prisma.inventory.update({
//           where: { productId: item.productId },
//           data: {
//             quantity: inventory.quantity - item.quantity
//           }
//         });

//         await prisma.stockHistory.create({
//           data: {
//             productId: item.productId,
//             outletId, 
//             quantity: item.quantity,
//             action: 'REMOVE'
//           }
//         });
//       }
//     }

//     res.status(201).json({
//       message: 'Order placed successfully',
//       order: {
//         id: order.id,
//         orderNumber: `#ORD-${order.id.toString().padStart(6, '0')}`,
//         totalAmount: order.totalAmount,
//         paymentMethod: order.paymentMethod,
//         status: order.status,
//         deliverySlot: order.deliverySlot,
//         deliveryDate: order.deliveryDate,
//         createdAt: order.createdAt,
//         items: order.items,
//         customer: order.customer,
//         outlet: order.outlet
//       },
//       walletTransaction: walletTransaction ? {
//         id: walletTransaction.id,
//         amount: walletTransaction.amount,
//         method: walletTransaction.method,
//         status: walletTransaction.status,
//         createdAt: walletTransaction.createdAt
//       } : null
//     });

//   } catch (error) {
//     console.error("Error creating order:", error);

//     if (error.code && paymentMethod === 'WALLET') {
//       try {
//         const customer = await prisma.customerDetails.findUnique({
//           where: { userId: req.user.id },
//           select: { id: true }
//         });

//         if (customer) {
//           const wallet = await prisma.wallet.findUnique({
//             where: { customerId: customer.id }
//           });

//           if (wallet) {
//             await prisma.wallet.update({
//               where: { customerId: customer.id },
//               data: {
//                 balance: wallet.balance + totalAmount,
//                 totalUsed: Math.max(0, wallet.totalUsed - totalAmount)
//               }
//             });

//             // Create refund transaction record
//             await prisma.walletTransaction.create({
//               data: {
//                 walletId: wallet.id,
//                 amount: totalAmount,
//                 method: 'WALLET',
//                 status: 'RECHARGE'
//               }
//             });
//           }
//         }
//       } catch (refundError) {
//         console.error("Error refunding wallet:", refundError);
//       }
//     }

//     return res.status(500).json({ 
//       message: "Failed to place order", 
//       error: error.message 
//     });
//   }
// };

// export const customerAppOrder = async (req, res) => {
//   const { totalAmount, paymentMethod, deliverySlot, items, outletId } = req.body;
//   const userId = req.user.id;

//   try {
//     const result = await prisma.$transaction(async (tx) => {
//       // Input validation
//       if (!totalAmount || !paymentMethod || !deliverySlot || !items || !Array.isArray(items) || items.length === 0 || !outletId) {
//         throw new Error("Invalid input: totalAmount, paymentMethod, deliverySlot, outletId, and items are required");
//       }

//       if (typeof outletId !== 'number' || outletId <= 0) {
//         throw new Error("Invalid outletId: must be a positive number");
//       }

//       const validPaymentMethods = ['WALLET', 'UPI', 'CARD'];
//       if (!validPaymentMethods.includes(paymentMethod)) {
//         throw new Error("Invalid payment method");
//       }

//       const validDeliverySlots = ['SLOT_11_12', 'SLOT_12_13', 'SLOT_13_14', 'SLOT_14_15', 'SLOT_15_16', 'SLOT_16_17'];
//       if (!validDeliverySlots.includes(deliverySlot)) {
//         throw new Error("Invalid delivery slot");
//       }

//       // Validate outlet
//       const outlet = await tx.outlet.findUnique({
//         where: { id: outletId },
//         select: { id: true, isActive: true }
//       });

//       if (!outlet) throw new Error("Outlet not found");
//       if (!outlet.isActive) throw new Error("Selected outlet is currently inactive");

//       // Validate customer
//       const customer = await tx.customerDetails.findUnique({
//         where: { userId },
//         select: { id: true }
//       });
//       if (!customer) throw new Error("Customer not found");

//       const customerId = customer.id;

//       // Inventory check
//       const inventoryUpdates = [];
//       const stockValidationErrors = [];

//       for (const item of items) {
//         const inventory = await tx.inventory.findUnique({
//           where: { productId: item.productId }
//         });

//         if (!inventory) {
//           stockValidationErrors.push(`Product ${item.productId} not found`);
//         } else if (inventory.quantity < item.quantity) {
//           stockValidationErrors.push(`Insufficient stock for product ${item.productId}`);
//         } else {
//           inventoryUpdates.push({
//             productId: item.productId,
//             outletId,
//             currentStock: inventory.quantity,
//             requestedQuantity: item.quantity,
//             newStock: inventory.quantity - item.quantity
//           });
//         }
//       }

//       if (stockValidationErrors.length > 0) {
//         throw new Error(`Stock validation failed: ${stockValidationErrors.join(', ')}`);
//       }

//       // Wallet payment
//       let walletTransaction = null;

//       if (paymentMethod === 'WALLET') {
//         const wallet = await tx.wallet.findUnique({
//           where: { customerId }
//         });

//         if (!wallet) throw new Error("Wallet not found");

//         if (wallet.balance < totalAmount) {
//           throw new Error(`Insufficient wallet balance. Available: ${wallet.balance}, Required: ${totalAmount}`);
//         }

//         await tx.wallet.update({
//           where: { customerId },
//           data: {
//             balance: wallet.balance - totalAmount,
//             totalUsed: wallet.totalUsed + totalAmount,
//             lastOrder: new Date()
//           }
//         });

//         walletTransaction = await tx.walletTransaction.create({
//           data: {
//             walletId: wallet.id,
//             amount: -totalAmount,
//             method: 'WALLET',
//             status: 'DEDUCT'
//           }
//         });
//       }

//       // Inventory deduction
//       for (const update of inventoryUpdates) {
//         await tx.inventory.update({
//           where: { productId: update.productId },
//           data: { quantity: update.newStock }
//         });

//         await tx.stockHistory.create({
//           data: {
//             productId: update.productId,
//             outletId: update.outletId,
//             quantity: update.requestedQuantity,
//             action: 'REMOVE'
//           }
//         });
//       }

//       // Create order
//       const deliveryDate = new Date();
//       deliveryDate.setHours(0, 0, 0, 0);

//       const order = await tx.order.create({
//         data: {
//           customerId,
//           outletId,
//           totalAmount,
//           paymentMethod,
//           status: 'PENDING',
//           type: 'APP',
//           deliveryDate,
//           deliverySlot,
//           isPreOrder: false,
//           items: {
//             create: items.map(item => ({
//               productId: item.productId,
//               quantity: item.quantity,
//               unitPrice: item.unitPrice,
//               status: 'NOT_DELIVERED'
//             }))
//           }
//         },
//         include: {
//           items: { include: { product: true } },
//           customer: {
//             include: {
//               user: {
//                 select: {
//                   name: true,
//                   email: true,
//                   phone: true
//                 }
//               }
//             }
//           },
//           outlet: {
//             select: {
//               id: true,
//               name: true,
//               address: true
//             }
//           }
//         }
//       });

//       // Clear cart
//       const cart = await tx.cart.findUnique({
//         where: { customerId }
//       });

//       if (cart) {
//         await tx.cartItem.deleteMany({
//           where: { cartId: cart.id }
//         });
//       }

//       return { order, walletTransaction, stockUpdates: inventoryUpdates };
//     });

//     // Success response
//     res.status(201).json({
//       message: 'Order placed successfully',
//       order: {
//         id: result.order.id,
//         orderNumber: `#ORD-${result.order.id.toString().padStart(6, '0')}`,
//         totalAmount: result.order.totalAmount,
//         paymentMethod: result.order.paymentMethod,
//         status: result.order.status,
//         deliverySlot: result.order.deliverySlot,
//         deliveryDate: result.order.deliveryDate,
//         createdAt: result.order.createdAt,
//         items: result.order.items,
//         customer: result.order.customer,
//         outlet: result.order.outlet
//       },
//       walletTransaction: result.walletTransaction ? {
//         id: result.walletTransaction.id,
//         amount: result.walletTransaction.amount,
//         method: result.walletTransaction.method,
//         status: result.walletTransaction.status,
//         createdAt: result.walletTransaction.createdAt
//       } : null,
//       stockUpdates: result.stockUpdates
//     });

//   } catch (error) {
//     console.error("Error placing order:", error.message);

//     if (error.message.includes('wallet balance')) {
//       return res.status(400).json({
//         message: 'Insufficient wallet balance',
//         error: error.message,
//         type: 'WALLET_ERROR'
//       });
//     }

//     if (error.message.includes('Stock validation failed')) {
//       return res.status(400).json({
//         message: 'Some items are out of stock',
//         error: error.message,
//         type: 'STOCK_ERROR'
//       });
//     }

//     res.status(500).json({
//       message: 'Failed to place order',
//       error: error.message,
//       type: 'SERVER_ERROR'
//     });
//   }
// };

const razorpay = new Razorpay({
  key_id: "rzp_test_CqJOLIOhHoCry6",
  key_secret: "7kpwsEwlmizR3A17LgaQ9a2E",
});

export const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: "Invalid amount",
        error: "Amount must be greater than 0"
      });
    }

    // Verify customer exists
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found"
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount), // Amount in paise
      currency: currency,
      receipt: receipt || `order_${new Date().getTime()}`,
      notes: {
        customer_id: customer.id,
        user_id: userId
      }
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(201).json({
      message: "Razorpay order created successfully",
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        created_at: razorpayOrder.created_at
      }
    });

  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({
      message: "Failed to create Razorpay order",
      error: error.message
    });
  }
};

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({
        message: "Payment verification failed",
        error: "Invalid signature"
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    res.status(200).json({
      message: "Payment verified successfully",
      payment: {
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.method,
        captured: payment.captured,
        created_at: payment.created_at
      }
    });

  } catch (error) {
    console.error("Error verifying Razorpay payment:", error);
    res.status(500).json({
      message: "Payment verification failed",
      error: error.message
    });
  }
};


export const customerAppOrder = async (req, res) => {
  const transaction = await prisma.$transaction(async (tx) => {
    try {
      const {
        totalAmount,
        paymentMethod,
        deliverySlot,
        items,
        outletId,
        couponCode,
        paymentDetails, // For Razorpay payments
      } = req.body;
      const userId = req.user.id;

      if (!totalAmount || !paymentMethod || !deliverySlot || !items || !Array.isArray(items) || items.length === 0 || !outletId) {
        throw new Error("Invalid input: totalAmount, paymentMethod, deliverySlot, outletId, and items are required");
      }
      if (typeof outletId !== 'number' || outletId <= 0) {
        throw new Error("Invalid outletId: must be a positive number");
      }
      const validPaymentMethods = ['WALLET', 'UPI', 'CARD'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        throw new Error("Invalid payment method");
      }
      const validDeliverySlots = ['SLOT_11_12', 'SLOT_12_13', 'SLOT_13_14', 'SLOT_14_15', 'SLOT_15_16', 'SLOT_16_17'];
      if (!validDeliverySlots.includes(deliverySlot)) {
        throw new Error("Invalid delivery slot");
      }

      let razorpayPaymentId = null;
      if ((paymentMethod === 'UPI' || paymentMethod === 'CARD') && paymentDetails) {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentDetails;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
          throw new Error("Invalid payment details for online payment");
        }
        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
          .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
          .update(body.toString())
          .digest("hex");
        const isAuthentic = expectedSignature === razorpay_signature;
        if (!isAuthentic) {
          throw new Error("Payment verification failed: Invalid signature");
        }
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (payment.status !== 'captured' && payment.status !== 'authorized') {
          throw new Error("Payment not successful");
        }
        const paidAmount = payment.amount / 100;
        if (Math.abs(paidAmount - totalAmount) > 0.01) {
          throw new Error(`Payment amount mismatch. Expected: ${totalAmount}, Paid: ${paidAmount}`);
        }
        razorpayPaymentId = razorpay_payment_id;
      }

      const outlet = await tx.outlet.findUnique({
        where: { id: outletId },
        select: { id: true, isActive: true, name: true },
      });
      if (!outlet) {
        throw new Error("Outlet not found");
      }
      if (!outlet.isActive) {
        throw new Error("Selected outlet is currently inactive");
      }

      const customer = await tx.customerDetails.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!customer) {
        throw new Error("Customer not found");
      }
      const customerId = customer.id;

      const stockValidationErrors = [];
      const inventoryUpdates = [];
      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId },
        });
        if (!inventory) {
          stockValidationErrors.push(`Product ${item.productId} not found in inventory`);
          continue;
        }
        if (inventory.quantity < item.quantity) {
          stockValidationErrors.push(
            `Insufficient stock for product ${item.productId}. Available: ${inventory.quantity}, Requested: ${item.quantity}`
          );
          continue;
        }
        inventoryUpdates.push({
          productId: item.productId,
          currentStock: inventory.quantity,
          requestedQuantity: item.quantity,
          newStock: inventory.quantity - item.quantity,
        });
      }
      if (stockValidationErrors.length > 0) {
        throw new Error(`Stock validation failed: ${stockValidationErrors.join(', ')}`);
      }

      let finalTotalAmount = totalAmount;
      let couponDiscount = 0;
      let coupon = null;
      if (couponCode) {
        coupon = await tx.coupon.findUnique({
          where: { code: couponCode },
        });
        if (!coupon || !coupon.isActive) {
          throw new Error("Invalid or inactive coupon");
        }
        const now = new Date(); // 10:32 AM IST, August 06, 2025
        if (now < coupon.validFrom || now > coupon.validUntil) {
          throw new Error("Coupon is not valid for the current date");
        }
        if (coupon.outletId !== outletId) {
          throw new Error("Coupon is not valid for the selected outlet");
        }
        const existingUsage = await tx.couponUsage.findFirst({
          where: { userId, couponId: coupon.id },
        });
        if (existingUsage) {
          throw new Error("Coupon already used by this customer");
        }
        if (coupon.usedCount >= coupon.usageLimit) {
          throw new Error("Coupon usage limit reached");
        }
        if (totalAmount < coupon.minOrderValue) {
          throw new Error(`Minimum order value of ${coupon.minOrderValue} required`);
        }
        if (coupon.rewardValue > 0) {
          if (coupon.rewardValue < 1) {
            couponDiscount = totalAmount * coupon.rewardValue; // Percentage discount
          } else if (coupon.rewardValue <= totalAmount) {
            couponDiscount = coupon.rewardValue; // Fixed amount discount
          }
        }
        finalTotalAmount = totalAmount - couponDiscount;
      }

      let walletTransaction = null;
      if (paymentMethod === 'WALLET') {
        const wallet = await tx.wallet.findUnique({
          where: { customerId },
        });
        if (!wallet) {
          throw new Error("Wallet not found");
        }
        if (wallet.balance < finalTotalAmount) {
          throw new Error(`Insufficient wallet balance. Available: ${wallet.balance}, Required: ${finalTotalAmount}`);
        }
        await tx.wallet.update({
          where: { customerId },
          data: {
            balance: wallet.balance - finalTotalAmount,
            totalUsed: wallet.totalUsed + finalTotalAmount,
            lastOrder: new Date(),
          },
        });
        walletTransaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -finalTotalAmount,
            method: 'WALLET',
            status: 'DEDUCT',
          },
        });
      }

      for (const update of inventoryUpdates) {
        await tx.inventory.update({
          where: { productId: update.productId },
          data: { quantity: update.newStock },
        });
        await tx.stockHistory.create({
          data: {
            productId: update.productId,
            outletId,
            quantity: update.requestedQuantity,
            action: 'REMOVE',
          },
        });
      }

      const deliveryDate = new Date();
      deliveryDate.setHours(0, 0, 0, 0);
      const order = await tx.order.create({
        data: {
          customerId,
          outletId,
          totalAmount: finalTotalAmount,
          paymentMethod,
          status: 'PENDING',
          type: 'APP',
          deliveryDate,
          deliverySlot,
          isPreOrder: false,
          razorpayPaymentId,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              status: 'NOT_DELIVERED',
            })),
          },
        },
        include: {
          items: { include: { product: true } },
          customer: {
            include: {
              user: {
                select: { name: true, email: true, phone: true },
              },
            },
          },
          outlet: { select: { id: true, name: true, address: true } },
        },
      });

      const cart = await tx.cart.findUnique({
        where: { customerId },
      });
      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }

      if (coupon) {
        await tx.couponUsage.create({
          data: {
            couponId: coupon.id,
            orderId: order.id,
            userId,
            amount: couponDiscount,
          },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: coupon.usedCount + 1 },
        });
      }

      return {
        order,
        walletTransaction,
        stockUpdates: inventoryUpdates,
        couponDiscount,
        razorpayPaymentId,
      };
    } catch (error) {
      throw error; // This will trigger transaction rollback
    }
  }, { timeout: 15000 });

  try {
    const result = await transaction;
    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: result.order.id,
        orderNumber: `#ORD-${result.order.id.toString().padStart(6, '0')}`,
        totalAmount: result.order.totalAmount,
        paymentMethod: result.order.paymentMethod,
        status: result.order.status,
        deliverySlot: result.order.deliverySlot,
        deliveryDate: result.order.deliveryDate,
        createdAt: result.order.createdAt,
        items: result.order.items,
        customer: result.order.customer,
        outlet: result.order.outlet,
        razorpayPaymentId: result.razorpayPaymentId,
      },
      walletTransaction: result.walletTransaction
        ? {
            id: result.walletTransaction.id,
            amount: result.walletTransaction.amount,
            method: result.walletTransaction.method,
            status: result.walletTransaction.status,
            createdAt: result.walletTransaction.createdAt,
          }
        : null,
      stockUpdates: result.stockUpdates,
      couponDiscount: result.couponDiscount,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    if (error.message.includes('Stock validation failed')) {
      return res.status(400).json({
        message: 'Some items are out of stock',
        error: error.message,
        type: 'STOCK_ERROR',
      });
    }
    if (error.message.includes('Insufficient wallet balance')) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        error: error.message,
        type: 'WALLET_ERROR',
      });
    }
    if (error.message.includes('Payment verification failed')) {
      return res.status(400).json({
        message: 'Payment verification failed',
        error: error.message,
        type: 'PAYMENT_ERROR',
      });
    }
    if (error.message.includes('Coupon is not valid for the selected outlet')) {
      return res.status(400).json({
        message: 'Coupon is not valid for the selected outlet',
        error: error.message,
        type: 'COUPON_ERROR',
      });
    }
    return res.status(500).json({
      message: 'Failed to place order',
      error: error.message,
      type: 'SERVER_ERROR',
    });
  }
};



export const customerAppOngoingOrderList = async (req, res) => {
  try {
    const userId = req.user.id;
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerId = customer.id;
    const orders = await prisma.order.findMany({
      where: {
        customerId,
        status: 'PENDING',
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "No ongoing orders found", orders: [] });
    }

    res.status(200).json({ message: "Ongoing orders retrieved", orders });
  } catch (error) {
    console.error("Error retrieving ongoing orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const customerAppOrderHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerId = customer.id;

    const orders = await prisma.order.findMany({
      where: {
        customerId,
        status: {
          in: ['DELIVERED', 'CANCELLED'],
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.status(200).json({ message: "Order history retrieved", orders });
  } catch (error) {
    console.error("Error retrieving order history:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const customerAppCancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;
    if (!orderId || isNaN(parseInt(orderId))) {
      return res.status(400).json({ message: "Invalid order ID" });
    }
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }
    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        customerId: customer.id,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (order.status !== 'PENDING') {
      return res.status(400).json({
        message: `Cannot cancel order. Order status is ${order.status}`,
      });
    }
    const result = await prisma.$transaction(async (tx) => {
      const cancelledOrder = await tx.order.update({
        where: { id: parseInt(orderId) },
        data: {
          status: 'CANCELLED',
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          outlet: {
            select: {
              id: true,
              name: true,
              address: true,
            },
          },
        },
      });
      for (const item of order.items) {
        await tx.inventory.updateMany({
          where: {
            productId: item.productId,
            outletId: order.outletId,
          },
          data: {
            quantity: {
              increment: item.quantity,
            },
          },
        });
        await tx.stockHistory.create({
          data: {
            productId: item.productId,
            outletId: order.outletId,
            quantity: item.quantity,
            action: 'ADD',
            timestamp: new Date(),
          },
        });
      }
      if (order.paymentMethod === 'WALLET' || order.paymentMethod === 'UPI' || order.paymentMethod === 'CARD') {
        let wallet = await tx.wallet.findUnique({
          where: { customerId: customer.id },
        });
        if (!wallet) {
          wallet = await tx.wallet.create({
            data: {
              customerId: customer.id,
              balance: 0,
              totalRecharged: 0,
              totalUsed: 0,
            },
          });
        }
        await tx.wallet.update({
          where: { customerId: customer.id },
          data: {
            balance: {
              increment: order.totalAmount,
            },
          },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: order.totalAmount,
            method: order.paymentMethod,
            status: 'RECHARGE',
            createdAt: new Date(),
          },
        });
      }
      // Removed coupon refund logic
      return cancelledOrder;
    });
    res.status(200).json({
      message: "Order cancelled successfully",
      order: result,
      refundAmount: order.totalAmount,
      refundMethod: order.paymentMethod === 'CASH' ? 'CASH' : 'WALLET',
    });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};