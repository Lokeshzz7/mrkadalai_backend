import prisma from "../../prisma/client.js";

export const getRechargeHistory = async (req, res) => {
  const { outletId } = req.params;

  try {
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        status: 'RECHARGE',
        wallet: {
          customer: {
            user: {
              outletId: Number(outletId),
              role: 'CUSTOMER',
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        wallet: {
          include: {
            customer: {
              include: {
                user: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const formatted = transactions.map(txn => ({
      transactionId: txn.id,
      customerName: txn.wallet.customer.user.name,
      amount: txn.amount,
      time: txn.createdAt
    }));

    res.status(200).json({
      message: "Recharge history fetched successfully",
      recharges: formatted
    });
  } catch (error) {
    console.error("Error fetching recharge history:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const addRecharge = async (req, res) => {
  const { customerId, amount, method } = req.body;

  try {
    const customerIdNum = Number(customerId);

    const wallet = await prisma.wallet.findUnique({
      where: {
        customerId: customerIdNum
      }
    });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found for this customer" });
    }

    
    const updatedWallet = await prisma.wallet.update({
      where: {
        customerId: customerIdNum
      },
      data: {
        balance: { increment: amount },
        totalRecharged: { increment: amount },
        lastRecharged: new Date()
      }
    });

    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: updatedWallet.id,
        amount,
        method,
        status: 'RECHARGE'
      }
    });

    res.status(200).json({
      message: "Recharge successful",
      wallet: {
        balance: updatedWallet.balance,
        totalRecharged: updatedWallet.totalRecharged
      },
      transactionId: transaction.id
    });

  } catch (error) {
    console.error("Error during recharge:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
