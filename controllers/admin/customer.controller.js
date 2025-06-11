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
              },
            },
          },
        },
      },
    });

    const formattedCustomers = customers.map(user => ({
      customerId: user.customerInfo?.id || null,
      walletId: user.customerInfo?.wallet?.id || null,
      name: user.name,
      yearOfStudy: user.customerInfo?.yearOfStudy || null,
      phoneNo: user.phone || null,
      walletBalance: user.customerInfo?.wallet?.balance || 0,
      totalPurchaseCost: user.customerInfo?.orders.reduce((sum, order) => sum + order.totalAmount, 0) || 0,
    }));

    res.status(200).json({
      message: customers.length > 0 ? 'Customers retrieved successfully' : 'No customers found for this outlet',
      customers: formattedCustomers,
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
