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
      })),
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
      totalPrice :order.totalAmount ,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        productName: item.product.name,
        productDescription : item.product.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        itemStatus : item.status
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

    const order = await prisma.order.findFirst({
      where: {
        id: parseInt(orderId),
        outletId: parseInt(outletId),
      },
      include: {
        items: true
      }
    });

    if (!order) {
      return res.status(404).json({ message: "Order not found for this outlet" });
    }

    if (status === "CANCELLED") {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      return res.status(200).json({ message: "Order cancelled" });
    }

    if (status === "DELIVERED") {
      await prisma.orderItem.updateMany({
        where: { orderId: order.id },
        data: { status: "DELIVERED" },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "DELIVERED" },
      });
      return res.status(200).json({ message: "All items and order marked DELIVERED" });
    }

    
    if (status === "PARTIALLY_DELIVERED") {
   
      const item = order.items.find(i => i.id === parseInt(orderItemId));
      if (!item) {
        return res.status(404).json({ message: "Order item not found in this order" });
      }

      
      if (item.status === "DELIVERED") {
        await prisma.order.update({
          where: { id: order.id },
          data: { status: "PARTIALLY_DELIVERED" }
        });
        return res.status(200).json({ message: "Order remains PARTIALLY_DELIVERED; item was already DELIVERED" });
      }

      
      await prisma.orderItem.update({
        where: { id: item.id },
        data: { status: "DELIVERED" }
      });

      
      await prisma.order.update({
        where: { id: order.id },
        data: { status: "PARTIALLY_DELIVERED" }
      });

      return res.status(200).json({ message: "Order marked PARTIALLY_DELIVERED; one item delivered" });
    }

    
    return res.status(400).json({ message: "Invalid status value" });

  } catch (err) {
    console.error("Error updating item status:", err);
    return res.status(500).json({ message: "Server error while updating item status" });
  }
};
