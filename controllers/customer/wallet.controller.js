import prisma from "../../prisma/client.js";



export const rechargeWallet = async (req, res) => {
  try {
    const amount = parseFloat(req.body.amount);
    const customerId = req.user.id;
    const paymentMethod = req.body.paymentMethod;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const validMethods = ['UPI', 'CARD', 'CASH', 'WALLET'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    
    let wallet = await prisma.wallet.findUnique({
      where: { customerId }
    });

    if (!wallet) {
     
      wallet = await prisma.wallet.create({
        data: {
          customerId,
          balance: amount,
          totalRecharged: amount,
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
    } else {

      wallet = await prisma.wallet.update({
        where: { customerId },
        data: {
          balance: { increment: amount },
          totalRecharged: { increment: amount },
          lastRecharged: new Date(),
          transactions: {
            create: {
              amount,
              method: paymentMethod,
              status: 'RECHARGE'
            }
          }
        },
        include: { transactions: true }
      });
    }

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
    const customerId = req.user.id;

    
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
