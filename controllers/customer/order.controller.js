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
    const customerId = req.user.id;
    

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

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
    const customerId  = req.user.id; 

    if (!customerId) {
      return res.status(400).json({ message: "Customer ID is required" });
    }

    const orders = await prisma.order.findMany({
      where: {
        customerId,
        status: {
          in: ['COMPLETED', 'CANCELLED'],
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

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "No completed or cancelled orders found", orders: [] });
    }

    res.status(200).json({ message: "Order history retrieved", orders });
  } catch (error) {
    console.error("Error retrieving order history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

