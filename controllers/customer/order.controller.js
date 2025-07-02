import prisma from "../../prisma/client.js";

export const customerAppOrder = async (req, res) => {
  try {
    const {
      outletId,
      customerId,
      totalAmount,
      paymentMethod,
      deliveryDate,
      deliverySlot,
      razorpayPaymentId,
      items,
    } = req.body;

    if (
      !customerId || !outletId || !totalAmount || !paymentMethod ||
      !deliveryDate || !deliverySlot || !items || !Array.isArray(items) || items.length === 0
    ) {
      return res.status(400).json({ message: "Missing or invalid required fields" });
    }

    const deliveryDateObj = new Date(deliveryDate);
    if (isNaN(deliveryDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid delivery date format" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDateNormalized = new Date(deliveryDateObj);
    deliveryDateNormalized.setHours(0, 0, 0, 0);
    const isPreOrder = deliveryDateNormalized > today;

    const slotMap = {
      "11:00-12:00": "SLOT_11_12",
      "12:00-13:00": "SLOT_12_13",
      "13:00-14:00": "SLOT_13_14",
      "14:00-15:00": "SLOT_14_15",
      "15:00-16:00": "SLOT_15_16",
      "16:00-17:00": "SLOT_16_17",
    };
    const normalizedSlot = slotMap[deliverySlot] || deliverySlot;
    const validSlots = Object.values(slotMap);
    if (!validSlots.includes(normalizedSlot)) {
      return res.status(400).json({ message: "Invalid delivery slot" });
    }

    const validPaymentMethods = ["UPI", "CARD", "CASH", "WALLET"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice || item.quantity <= 0) {
        return res.status(400).json({ message: "Invalid order items" });
      }
    }

   
    for (const item of items) {
      const inventory = await prisma.inventory.findFirst({
        where: {
          productId: item.productId,
          outletId: outletId,
        },
      });

      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient inventory for product ID ${item.productId}`,
        });
      }
    }

   
    const order = await prisma.order.create({
      data: {
        customerId,
        outletId,
        totalAmount,
        paymentMethod,
        status: "PENDING",
        type: "APP",
        deliveryDate: deliveryDateObj,
        deliverySlot: normalizedSlot,
        isPreOrder,
        razorpayPaymentId,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            status: "NOT_DELIVERED",
          })),
        },
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

    for (const item of items) {
      await prisma.inventory.updateMany({
        where: {
          productId: item.productId,
          outletId: outletId,
        },
        data: {
          quantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
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