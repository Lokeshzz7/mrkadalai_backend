import prisma from "../../prisma/client.js";

export const customerAppOrder = async (req, res) => {
  try {
    const {outletId, customerId,totalAmount,paymentMethod,deliveryDate,deliverySlot,razorpayPaymentId,items,} = req.body;

    // Validate required fields
    if (
      !customerId ||!outletId ||!totalAmount ||!paymentMethod ||!deliveryDate ||!deliverySlot ||!items ||!Array.isArray(items) ||items.length === 0
    ) {
      return res.status(400).json({ message: "Missing or invalid required fields" });
    }

    // Validate deliveryDate
    const deliveryDateObj = new Date(deliveryDate);
    if (isNaN(deliveryDateObj.getTime())) {
      return res.status(400).json({ message: "Invalid delivery date format" });
    }

    // Determine isPreOrder
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deliveryDateNormalized = new Date(deliveryDateObj);
    deliveryDateNormalized.setHours(0, 0, 0, 0);
    const isPreOrder = deliveryDateNormalized > today;

    // Map deliverySlot to enum
    const slotMap = {
      "11:00-12:00": "SLOT_11_12",
      "12:00-13:00": "SLOT_12_13",
      "13:00-14:00": "SLOT_13_14",
      "14:00-15:00": "SLOT_14_15",
      "15:00-16:00": "SLOT_15_16",
      "16:00-17:00": "SLOT_16_17",
    };
    const normalizedSlot = slotMap[deliverySlot] || deliverySlot;
    const validSlots = [
      "SLOT_11_12",
      "SLOT_12_13",
      "SLOT_13_14",
      "SLOT_14_15",
      "SLOT_15_16",
      "SLOT_16_17",
    ];
    if (!validSlots.includes(normalizedSlot)) {
      return res.status(400).json({ message: "Invalid delivery slot" });
    }

    // Validate paymentMethod
    const validPaymentMethods = ["UPI", "CARD", "CASH", "WALLET"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: "Invalid payment method" });
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.quantity || !item.unitPrice || item.quantity <= 0) {
        return res.status(400).json({ message: "Invalid order items" });
      }
    }

    // Create order
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

    res.status(201).json({ message: "Order created", order });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const customerAppOngoingOrderList = async (req, res) => {
  try {
    const { customerId } = req.body; // Alternatively: req.user.id if using auth middleware

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
    const { customerId } = req.body; // Alternatively: req.user.id if using auth middleware

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