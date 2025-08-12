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
  const { orderId, orderItemId, status, outletId } = req.body;
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
        await tx.order.update({
          where: { id: order.id },
          data: { 
            status: "CANCELLED",
            deliveredAt: null // Reset deliveredAt when order is cancelled
          },
        });

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
      return res.status(200).json({ message: "Order cancelled" });
    }

    // === DELIVERED ===
    if (status === "DELIVERED") {
      await prisma.$transaction([
        prisma.orderItem.updateMany({
          where: { orderId: order.id },
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
      const item = order.items.find(i => i.id === parseInt(orderItemId));
      if (!item) {
        return res.status(404).json({ message: "Order item not found in this order" });
      }
      
      // Check if all items will be delivered after this update
      const allItemsDelivered = order.items.every(i => 
        i.id === parseInt(orderItemId) ? true : i.status === "DELIVERED"
      );
      
      // If item already delivered, just update order status
      if (item.status === "DELIVERED") {
        await prisma.$transaction([
          prisma.order.update({
            where: { id: order.id },
            data: { 
              status: allItemsDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED",
              deliveredAt: allItemsDelivered ? new Date() : null
            },
          }),
        ]);
        return res.status(200).json({
          message: allItemsDelivered ? "All items delivered, order marked DELIVERED" : "Order remains PARTIALLY_DELIVERED; item was already DELIVERED",
        });
      }
      
      await prisma.$transaction([
        prisma.orderItem.update({
          where: { id: item.id },
          data: { status: "DELIVERED" },
        }),
        prisma.order.update({
          where: { id: order.id },
          data: { 
            status: allItemsDelivered ? "DELIVERED" : "PARTIALLY_DELIVERED",
            deliveredAt: allItemsDelivered ? new Date() : null
          },
        }),
      ]);
      return res.status(200).json({ 
        message: allItemsDelivered ? "All items delivered, order marked DELIVERED" : "Order marked PARTIALLY_DELIVERED; one item delivered" 
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
