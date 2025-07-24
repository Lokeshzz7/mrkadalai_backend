import prisma from "../../prisma/client.js";

//Customer management
export const getOutletCustomers = async (req, res, next) => {
  const { outletId } = req.params;

  try {
    const outletIdNum = Number(outletId);

    const customers = await prisma.user.findMany({
      where: {
        outletId: outletIdNum,
        role: 'CUSTOMER',
      },
      include: {
        customerInfo: {
          include: {
            wallet: true,
            orders: {
              select: {
                totalAmount: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    const formattedCustomers = customers.map(user => {
      const totalOrders = user.customerInfo?.orders?.length || 0;
  
      const lastOrderDate = user.customerInfo?.orders?.length > 0 
        ? user.customerInfo.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
        : null;

      return {
        customerId: user.customerInfo?.id || null,
        walletId: user.customerInfo?.wallet?.id || null,
        name: user.name,
        email: user.email,
        yearOfStudy: user.customerInfo?.yearOfStudy || null,
        phoneNo: user.phone || null,
        walletBalance: user.customerInfo?.wallet?.balance || 0,
        totalOrders: totalOrders,
        totalPurchaseCost: user.customerInfo?.orders.reduce((sum, order) => sum + order.totalAmount, 0) || 0,
        lastOrderDate: lastOrderDate,
      };
    });

    res.status(200).json({
      message: customers.length > 0 ? 'Customers retrieved successfully' : 'No customers found for this outlet',
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};