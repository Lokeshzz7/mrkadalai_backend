import prisma from "../../prisma/client.js";

export const getOrderHistory = async (req, res) => {
  try {
    const outletId = Number(req.query.outletId);
    const date = req.query.date; // Expecting 'YYYY-MM-DD'

    if (!outletId || !date) {
      return res.status(400).json({ message: 'outletId and date are required' });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        createdAt: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    const formattedOrders = orders.map((order) => ({
      orderId: order.id,
      customerName: order.customer?.user?.name || 'Manual Order',
      orderType: order.type,
      createdAt: order.createdAt,
      status: order.status,
      items: order.items.map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
      })),
    }));

    res.status(200).json({
      message: 'Order history fetched successfully',
      orders: formattedOrders,
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};



