import prisma from "../../prisma/client.js";

export const recentOrders = async (req, res) => {
  try {
    const { outletId } = req.params;

    const orders = await prisma.order.findMany({
      where: {
        outletId: Number(outletId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const formatted = orders.map(order => ({
      billNumber: order.id,
      customerName: order.customer?.user?.name || "Walk-in Customer",
      orderType: order.type,
      paymentMode: order.paymentMethod,
      status: order.status,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        unitPrice : item.unitPrice
      })),
      totalAmount : order.totalAmount,
      createdAt: order.createdAt,
    }));

    res.status(200).json({
      message: "Recent orders fetched successfully",
      orders: formatted,
    });

  } catch (error) {
    console.error("Error fetching recent orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getOrder = async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  const outletId = parseInt(req.params.outletId);

  if (!orderId || !outletId) {
    return res.status(400).json({ message: "Provide valid orderId and outletId" });
  }

  try {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        outletId: outletId,
      },
      include: {
        customer: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
        outlet: {
          select: {
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found or does not belong to this outlet" });
    }

    const orderDetails = {
      orderId: order.id,
      customerName: order.customer?.user?.name || "Guest",
      outletName: order.outlet.name,
      orderStatus: order.status,
      totalPrice: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id, // Include the actual OrderItem ID
        productName: item.product.name,
        productDescription: item.product.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        itemStatus: item.status
      })),
    };

    return res.status(200).json({ order: orderDetails });

  } catch (error) {
    console.error("Error fetching order:", error);
    return res.status(500).json({ message: "Server error while fetching order" });
  }
};


export const updateOrder = async (req, res) => {
  const { orderId, orderItemIds, status, outletId } = req.body;
  if (!orderId || !status || !outletId) {
    return res.status(400).json({ message: "Provide orderId, status, and outletId" });
  }
  try {
    const staffOutletId = parseInt(req.user.outletId);
    if (parseInt(outletId) !== staffOutletId) {
      return res.status(403).json({ message: "You can only cancel orders for your assigned outlet" });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        outletId: parseInt(outletId),
      },
      include: {
        items: true,
        customer: true,
      },
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found for this outlet" });
    }

    // === CANCELLED ===
    if (status === "CANCELLED") {
      if (order.status !== 'PENDING') {
        return res.status(400).json({
          message: `Cannot cancel order. Order status is ${order.status}`,
        });
      }
      await prisma.$transaction(async (tx) => {
        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data: { 
            status: "CANCELLED",
            deliveredAt: null // Reset deliveredAt when order is cancelled
          },
        });

        // Restore stock for all items since entire order is cancelled
        for (const item of order.items) {
          // Update inventory - add back the quantity
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });

          // Add stock history record
          await tx.stockHistory.create({
            data: {
              productId: item.productId,
              outletId: order.outletId,
              quantity: item.quantity,
              action: 'ADD', // Adding back to stock
            },
          });
        }

        // Refund logic based on order type
        if (order.type === 'APP' && order.customerId) {
          // Refund to wallet for APP orders
          let wallet = await tx.wallet.findUnique({
            where: { customerId: order.customerId },
          });
          await tx.wallet.update({
            where: { customerId: order.customerId },
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
        } else if (order.type === 'MANUAL') {
          // None
        }

        // Refund coupon for staff cancellation
        const couponUsage = await tx.couponUsage.findFirst({
          where: { orderId: parseInt(orderId) },
        });
        if (couponUsage) {
          await tx.couponUsage.delete({
            where: { id: couponUsage.id },
          });
          await tx.coupon.update({
            where: { id: couponUsage.couponId },
            data: { usedCount: { decrement: 1 } },
          });
        }
      });
      return res.status(200).json({ message: "Order cancelled and stock updated" });
    }

    // === DELIVERED ===
    if (status === "DELIVERED") {
        if (order.status === 'CANCELLED') {
             return res.status(400).json({ message: "Cannot mark a cancelled order as delivered." });
        }
        await prisma.$transaction([
            prisma.orderItem.updateMany({
                where: { orderId: order.id, status: { not: "DELIVERED" } }, // Only update undelivered items
                data: { status: "DELIVERED" },
            }),
            prisma.order.update({
                where: { id: order.id },
                data: { 
                    status: "DELIVERED",
                    deliveredAt: new Date() // Set deliveredAt when order is delivered
                },
            }),
        ]);
        return res.status(200).json({ message: "All items and order marked DELIVERED" });
    }

    // === PARTIALLY_DELIVERED ===
    if (status === "PARTIALLY_DELIVERED") {
      if (!orderItemIds || !Array.isArray(orderItemIds) || orderItemIds.length === 0) {
        return res.status(400).json({ message: "Provide at least one orderItemId to deliver" });
      }

      await prisma.$transaction(async (tx) => {
        const itemIdsInt = orderItemIds.map(id => parseInt(id));

        // Update selected items to DELIVERED
        await tx.orderItem.updateMany({
          where: { id: { in: itemIdsInt } },
          data: { status: "DELIVERED" },
        });

        // Check if all items are now delivered
        const updatedOrder = await tx.order.findUnique({
          where: { id: order.id },
          include: { items: true },
        });
        const allItemsDelivered = updatedOrder.items.every(item => item.status === "DELIVERED" || item.status === "CANCELLED");

        // Update the main order status based on the check
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: allItemsDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED",
            deliveredAt: allItemsDelivered ? new Date() : null,
          },
        });
      });
      
      const message = orderItemIds.length > 1 ? "Selected items delivered, order marked PARTIALLY_DELIVERED" : "Order marked PARTIALLY_DELIVERED; one item delivered";

      return res.status(200).json({ 
        message: message
      });
    }

    // === PARTIAL_CANCEL (New functionality for cancelling remaining undelivered items) ===
    if (status === "PARTIAL_CANCEL") {
      if (order.status !== 'PARTIALLY_DELIVERED') {
        return res.status(400).json({
          message: `Cannot partially cancel order. Order status is ${order.status}`,
        });
      }

      const undeliveredItems = order.items.filter(item => item.status === "NOT_DELIVERED");
      
      if (undeliveredItems.length === 0) {
        return res.status(400).json({ message: "No undelivered items to cancel" });
      }

      await prisma.$transaction(async (tx) => {
        // Calculate refund amount for undelivered items
        const refundAmount = undeliveredItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);

        // Update order status to DELIVERED since remaining items are being cancelled
        await tx.order.update({
          where: { id: order.id },
          data: { 
            status: "DELIVERED", // All delivered items remain, undelivered ones are cancelled
            deliveredAt: new Date()
          },
        });
        
        // This part is changed. We do not update the OrderItem status to 'CANCELLED'.
        // It remains 'NOT_DELIVERED' as requested.

        // Restore stock for undelivered items and create stock history
        for (const item of undeliveredItems) {
          // Update inventory - add back the quantity
          await tx.inventory.update({
            where: { productId: item.productId },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });

          // Add stock history record
          await tx.stockHistory.create({
            data: {
              productId: item.productId,
              outletId: order.outletId,
              quantity: item.quantity,
              action: 'ADD', // Adding back to stock
            },
          });
        }

        // Refund logic for undelivered items (only for APP orders)
        if (order.type === 'APP' && order.customerId && refundAmount > 0) {
          let wallet = await tx.wallet.findUnique({
            where: { customerId: order.customerId },
          });
          await tx.wallet.update({
            where: { customerId: order.customerId },
            data: {
              balance: {
                increment: refundAmount,
              },
            },
          });
          await tx.walletTransaction.create({
            data: {
              walletId: wallet.id,
              amount: refundAmount,
              method: order.paymentMethod,
              status: 'RECHARGE',
              createdAt: new Date(),
            },
          });
        }
      });
      
      return res.status(200).json({ 
        message: `Undelivered items cancelled, stock restored, and ₹${undeliveredItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0)} refunded` 
      });
    }

    return res.status(400).json({ message: "Invalid status value" });
  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ message: "Server error while updating item status" });
  }
};

export const getHomeDetails = async (req, res) => {
  try {
    const outletId = parseInt(req.user.outletId);

    
    const orderStats = await prisma.order.groupBy({
      by: ['type', 'deliverySlot'],
      where: {
        outletId,
        status: {
          in: ['DELIVERED', 'PARTIALLY_DELIVERED'],
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    let totalRevenue = 0;
    let appOrders = 0;
    let manualOrders = 0;
    const slotCounts = {};

    orderStats.forEach(stat => {
      totalRevenue += stat._sum.totalAmount || 0;

      if (stat.type === 'APP') appOrders += stat._count._all;
      if (stat.type === 'MANUAL') manualOrders += stat._count._all;

      if (stat.deliverySlot) {
        if (!slotCounts[stat.deliverySlot]) slotCounts[stat.deliverySlot] = 0;
        slotCounts[stat.deliverySlot] += stat._count._all;
      }
    });

    let peakSlot = null;
    let maxSlotCount = 0;
    for (const [slot, count] of Object.entries(slotCounts)) {
      if (count > maxSlotCount) {
        peakSlot = slot;
        maxSlotCount = count;
      }
    }

   
    const bestSellerAgg = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      where: {
        order: {
          outletId,
          status: {
            in: ['DELIVERED', 'PARTIALLY_DELIVERED'],
          },
        },
      },
      orderBy: {
        _sum: { quantity: 'desc' },
      },
      take: 1,
    });

    let bestSellerProduct = null;
    if (bestSellerAgg.length > 0) {
      const product = await prisma.product.findUnique({
        where: { id: bestSellerAgg[0].productId },
        select: { id: true, name: true, imageUrl: true },
      });
      bestSellerProduct = {
        ...product,
        quantitySold: bestSellerAgg[0]._sum.quantity,
      };
    }

  
  
    const totalWalletRecharge = await prisma.wallet.aggregate({
      _sum: {
        totalRecharged: true,
      },
      where: {
        customer: {
          user: {
            outletId: outletId,
          },
        },
      },
    });

    const totalRechargedAmount = totalWalletRecharge._sum.totalRecharged || 0;

    
    const lowStock = await prisma.inventory.findMany({
      where: {
        outletId,
        quantity: {
          lt: prisma.inventory.fields.threshold,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
          },
        },
      },
    });

    const lowStockProducts = lowStock.map(item => ({
      productId: item.product.id,
      name: item.product.name,
      imageUrl: item.product.imageUrl,
      quantity: item.quantity,
      threshold: item.threshold,
    }));

  
    return res.status(200).json({
      totalRevenue,
      appOrders,
      manualOrders,
      peakSlot,
      bestSellerProduct,
      totalRechargedAmount,
      lowStockProducts,
    });

  } catch (error) {
    console.error('Error in getHomeDetails:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
