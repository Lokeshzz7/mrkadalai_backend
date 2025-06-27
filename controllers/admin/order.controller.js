
import prisma from "../../prisma/client.js";
//Order management
export const outletTotalOrders = async (req, res, next) => {
  const { outletId } = req.params;

  try {
    const orders = await prisma.order.findMany({
      where: { outletId: Number(outletId) },
      include: {
        customer: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true,
                phone: true 
              }
            }
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = orders.map(order => ({
      orderId: order.id,
      orderTime: order.createdAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      customerName: order.customer?.user?.email || 'N/A',
      customerPhone: order.customer?.user?.phone || 'N/A',
      type : order.type,
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity
      }))
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
};