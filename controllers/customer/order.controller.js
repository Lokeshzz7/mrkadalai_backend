import prisma from "../../prisma/client.js";

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

export const customerAppOrder = async (req, res) => {
  const { totalAmount, paymentMethod, deliverySlot, items, outletId } = req.body;
  const userId = req.user.id;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Input validation
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

      // Validate outlet
      const outlet = await tx.outlet.findUnique({
        where: { id: outletId },
        select: { id: true, isActive: true }
      });

      if (!outlet) throw new Error("Outlet not found");
      if (!outlet.isActive) throw new Error("Selected outlet is currently inactive");

      // Validate customer
      const customer = await tx.customerDetails.findUnique({
        where: { userId },
        select: { id: true }
      });
      if (!customer) throw new Error("Customer not found");

      const customerId = customer.id;

      // Inventory check
      const inventoryUpdates = [];
      const stockValidationErrors = [];

      for (const item of items) {
        const inventory = await tx.inventory.findUnique({
          where: { productId: item.productId }
        });

        if (!inventory) {
          stockValidationErrors.push(`Product ${item.productId} not found`);
        } else if (inventory.quantity < item.quantity) {
          stockValidationErrors.push(`Insufficient stock for product ${item.productId}`);
        } else {
          inventoryUpdates.push({
            productId: item.productId,
            outletId,
            currentStock: inventory.quantity,
            requestedQuantity: item.quantity,
            newStock: inventory.quantity - item.quantity
          });
        }
      }

      if (stockValidationErrors.length > 0) {
        throw new Error(`Stock validation failed: ${stockValidationErrors.join(', ')}`);
      }

      // Wallet payment
      let walletTransaction = null;

      if (paymentMethod === 'WALLET') {
        const wallet = await tx.wallet.findUnique({
          where: { customerId }
        });

        if (!wallet) throw new Error("Wallet not found");

        if (wallet.balance < totalAmount) {
          throw new Error(`Insufficient wallet balance. Available: ${wallet.balance}, Required: ${totalAmount}`);
        }

        await tx.wallet.update({
          where: { customerId },
          data: {
            balance: wallet.balance - totalAmount,
            totalUsed: wallet.totalUsed + totalAmount,
            lastOrder: new Date()
          }
        });

        walletTransaction = await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: -totalAmount,
            method: 'WALLET',
            status: 'DEDUCT'
          }
        });
      }

      // Inventory deduction
      for (const update of inventoryUpdates) {
        await tx.inventory.update({
          where: { productId: update.productId },
          data: { quantity: update.newStock }
        });

        await tx.stockHistory.create({
          data: {
            productId: update.productId,
            outletId: update.outletId,
            quantity: update.requestedQuantity,
            action: 'REMOVE'
          }
        });
      }

      // Create order
      const deliveryDate = new Date();
      deliveryDate.setHours(0, 0, 0, 0);

      const order = await tx.order.create({
        data: {
          customerId,
          outletId,
          totalAmount,
          paymentMethod,
          status: 'PENDING',
          type: 'APP',
          deliveryDate,
          deliverySlot,
          isPreOrder: false,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              status: 'NOT_DELIVERED'
            }))
          }
        },
        include: {
          items: { include: { product: true } },
          customer: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          },
          outlet: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      });

      // Clear cart
      const cart = await tx.cart.findUnique({
        where: { customerId }
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      return { order, walletTransaction, stockUpdates: inventoryUpdates };
    });

    // Success response
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
        outlet: result.order.outlet
      },
      walletTransaction: result.walletTransaction ? {
        id: result.walletTransaction.id,
        amount: result.walletTransaction.amount,
        method: result.walletTransaction.method,
        status: result.walletTransaction.status,
        createdAt: result.walletTransaction.createdAt
      } : null,
      stockUpdates: result.stockUpdates
    });

  } catch (error) {
    console.error("Error placing order:", error.message);

    if (error.message.includes('wallet balance')) {
      return res.status(400).json({
        message: 'Insufficient wallet balance',
        error: error.message,
        type: 'WALLET_ERROR'
      });
    }

    if (error.message.includes('Stock validation failed')) {
      return res.status(400).json({
        message: 'Some items are out of stock',
        error: error.message,
        type: 'STOCK_ERROR'
      });
    }

    res.status(500).json({
      message: 'Failed to place order',
      error: error.message,
      type: 'SERVER_ERROR'
    });
  }
};

// export const customerAppOrder2 = async (req, res) => {
//   // Use database transaction for atomicity
//   const transaction = await prisma.$transaction(async (tx) => {
//     try {
//       const { totalAmount, paymentMethod, deliverySlot, items, outletId } = req.body;
//       const userId = req.user.id;

//       // Validation (same as before)
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

//       // Check outlet
//       const outlet = await tx.outlet.findUnique({
//         where: { id: outletId },
//         select: { id: true, isActive: true, name: true }
//       });

//       if (!outlet) {
//         throw new Error("Outlet not found");
//       }

//       if (!outlet.isActive) {
//         throw new Error("Selected outlet is currently inactive");
//       }

//       // Get customer
//       const customer = await tx.customerDetails.findUnique({
//         where: { userId },
//         select: { id: true },
//       });

//       if (!customer) {
//         throw new Error("Customer not found");
//       }

//       const customerId = customer.id;

//       // 🚨 CRITICAL: Validate stock availability for ALL items ATOMICALLY
//       const stockValidationErrors = [];
//       const inventoryUpdates = [];

//       for (const item of items) {
//         // Get current inventory with SELECT FOR UPDATE to prevent race conditions
//         const inventory = await tx.inventory.findUnique({
//           where: { productId: item.productId }
//         });

//         if (!inventory) {
//           stockValidationErrors.push(`Product ${item.productId} not found in inventory`);
//           continue;
//         }

//         // Check if we have enough stock
//         if (inventory.quantity < item.quantity) {
//           stockValidationErrors.push(
//             `Insufficient stock for product ${item.productId}. Available: ${inventory.quantity}, Requested: ${item.quantity}`
//           );
//           continue;
//         }

//         // Prepare inventory update
//         inventoryUpdates.push({
//           productId: item.productId,
//           currentStock: inventory.quantity,
//           requestedQuantity: item.quantity,
//           newStock: inventory.quantity - item.quantity
//         });
//       }

//       // If any stock validation errors, reject the entire order
//       if (stockValidationErrors.length > 0) {
//         throw new Error(`Stock validation failed: ${stockValidationErrors.join(', ')}`);
//       }

//       // Handle wallet payment
//       let walletTransaction = null;
//       if (paymentMethod === 'WALLET') {
//         const wallet = await tx.wallet.findUnique({
//           where: { customerId }
//         });

//         if (!wallet) {
//           throw new Error("Wallet not found");
//         }

//         if (wallet.balance < totalAmount) {
//           throw new Error(`Insufficient wallet balance. Available: ${wallet.balance}, Required: ${totalAmount}`);
//         }

//         // Update wallet
//         await tx.wallet.update({
//           where: { customerId },
//           data: {
//             balance: wallet.balance - totalAmount,
//             totalUsed: wallet.totalUsed + totalAmount,
//             lastOrder: new Date()
//           }
//         });

//         // Create wallet transaction
//         walletTransaction = await tx.walletTransaction.create({
//           data: {
//             walletId: wallet.id,
//             amount: -totalAmount,
//             method: 'WALLET',
//             status: 'DEDUCT'
//           }
//         });
//       }

//       // 🚨 CRITICAL: Update inventory ATOMICALLY
//       for (const update of inventoryUpdates) {
//         await tx.inventory.update({
//           where: { productId: update.productId },
//           data: {
//             quantity: update.newStock
//           }
//         });

//         // Create stock history
//         await tx.stockHistory.create({
//           data: {
//             productId: update.productId,
//             outletId,
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
//           items: {
//             include: {
//               product: true
//             }
//           },
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

//       // Clear cart after successful order
//       const cart = await tx.cart.findUnique({
//         where: { customerId }
//       });

//       if (cart) {
//         await tx.cartItem.deleteMany({
//           where: { cartId: cart.id }
//         });
//       }

//       return {
//         order,
//         walletTransaction,
//         stockUpdates: inventoryUpdates
//       };

//     } catch (error) {
//       throw error; // This will trigger transaction rollback
//     }
//   });

//   try {
//     const result = await transaction;
    
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
//     console.error("Error creating order:", error);
    
//     // Return specific error messages
//     if (error.message.includes('Stock validation failed')) {
//       return res.status(400).json({
//         message: "Some items are out of stock",
//         error: error.message,
//         type: 'STOCK_ERROR'
//       });
//     }
    
//     if (error.message.includes('Insufficient wallet balance')) {
//       return res.status(400).json({
//         message: "Insufficient wallet balance",
//         error: error.message,
//         type: 'WALLET_ERROR'
//       });
//     }

//     return res.status(500).json({
//       message: "Failed to place order",
//       error: error.message,
//       type: 'SERVER_ERROR'
//     });
//   }
// };



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
        message: `Cannot cancel order. Order status is ${order.status}` 
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

      return cancelledOrder;
    });

    res.status(200).json({ 
      message: "Order cancelled successfully", 
      order: result,
      refundAmount: order.totalAmount,
      refundMethod: order.paymentMethod === 'CASH' ? 'CASH' : 'WALLET'
    });

  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};