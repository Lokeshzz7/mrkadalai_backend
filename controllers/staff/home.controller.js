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
                name: true
              }
            }
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const formatted = orders.map(order => ({
      billNumber: order.id,
      customerName: order.customer.user.name,
      orderType: order.type,
      paymentMode: order.paymentMethod,
      status: order.status,
      items: order.items.map(item => ({
        name: item.product.name,
        quantity: item.quantity
      })),
      createdAt: order.createdAt
    }));

    res.status(200).json({
      message: "Recent orders fetched successfully",
      orders: formatted
    });

  } catch (error) {
    console.error("Error fetching recent orders:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

