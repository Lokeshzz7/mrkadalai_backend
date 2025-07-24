import prisma from "../../prisma/client.js";

//Wallet Management

export const getCustomersWithWallet = async (req, res, next) => {
  const outletId  = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: "Provide outletId" });
  }

  try {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        outletId: parseInt(outletId)
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        customerInfo: {
          select: {
            id: true, 
            wallet: {
              select: {
                id: true,             
                balance: true,
                totalRecharged: true,
                totalUsed: true,
                lastRecharged: true,
                lastOrder: true
              }
            }
          }
        }
      }
    });

    const formatted = customers.map(user => ({
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      customerId: user.customerInfo?.id,
      walletId: user.customerInfo?.wallet?.id,
      balance: user.customerInfo?.wallet?.balance || 0,
      totalRecharged: user.customerInfo?.wallet?.totalRecharged || 0,
      totalUsed: user.customerInfo?.wallet?.totalUsed || 0,
      lastRecharged: user.customerInfo?.wallet?.lastRecharged,
      lastOrder: user.customerInfo?.wallet?.lastOrder
    }));

    return res.status(200).json({
      message: "Customers with wallet fetched successfully",
      count: formatted.length,
      data: formatted
    });
  } catch (err) {
    console.error("Error fetching customers with wallet:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getRechargeHistoryByOutlet = async (req, res, next) => {
  const outletId  = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: "Provide outletId" });
  }

  try {
    const customers = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER',
        outletId: parseInt(outletId)
      },
      select: {
        name: true,
        customerInfo: {
          select: {
            wallet: {
              select: {
                transactions: {
                  orderBy: {
                    createdAt: 'desc'
                  },
                  select: {
                    id: true,
                    amount: true,
                    createdAt: true,
                    method: true,
                    status: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const history = [];

    customers.forEach(customer => {
      const customerName = customer.name;
      const transactions = customer.customerInfo?.wallet?.transactions || [];

      transactions.forEach(txn => {
        history.push({
          customerName,
          rechargeId: txn.id,
          amount: txn.amount,
          date: txn.createdAt,
          method: txn.method,
          status: txn.status
        });
      });
    });

    return res.status(200).json({
      message: "Recharge history fetched successfully",
      count: history.length,
      data: history
    });
  } catch (err) {
    console.error("Error fetching recharge history:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getOrdersPaidViaWallet = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        paymentMethod: 'WALLET'  
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        paymentMethod: true,
        customer: {
          select: {
            user: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    const result = orders.map(order => ({
      orderId: order.id,
      customerName: order.customer?.user?.name || "Unknown",
      orderTotal: order.totalAmount,
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod
    }));

    return res.status(200).json({
      message: "Orders paid via wallet fetched successfully",
      count: result.length,
      data: result
    });
  } catch (err) {
    console.error("Error fetching wallet orders:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};