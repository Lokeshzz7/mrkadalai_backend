import prisma from "../../prisma/client.js";



export const rechargeWallet = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const paymentMethod = req.body.paymentMethod;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const validMethods = ['UPI', 'CARD', 'CASH', 'WALLET'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    let wallet = await prisma.wallet.update({
      where: { customerId },
      data: {
        balance: { increment: amount },
        totalRecharged: { increment: amount },
        lastRecharged: new Date(),
        transactions: {
          create: {
            amount,
            method: paymentMethod,
            status: 'RECHARGE',
          }
        }
      },
      include: { transactions: true }
    });

    res.status(200).json({
      message: 'Wallet recharged successfully',
      wallet
    });

  } catch (error) {
    console.error('Recharge error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const recentTrans = async (req, res) => {
  try {
    const userId = req.user.id;

    const customerDetails = await prisma.customerDetails.findUnique({
      where: { userId },
    });

    if (!customerDetails) {
      return res.status(404).json({ message: 'Customer details not found' });
    }

    const customerId = customerDetails.id;

    const wallet = await prisma.wallet.findUnique({
      where: { customerId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.status(200).json({
      message: 'Recent transactions fetched successfully',
      transactions: wallet.transactions
    });

  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

