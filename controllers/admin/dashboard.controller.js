import prisma from "../../prisma/client.js";

export const getDashboardOverview = async (req, res, next) => {
  try {
    const totalActiveOutlets = await prisma.outlet.count({
      where: { isActive: true }
    });

    const totalRevenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
      }
    });

    const totalCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { not: null }
      }
    });

    const totalOrders = await prisma.order.count();

    const topPerformingOutlet = await prisma.order.groupBy({
      by: ['outletId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });

    let topOutletDetails = null;
    if (topPerformingOutlet.length > 0) {
      topOutletDetails = await prisma.outlet.findUnique({
        where: { id: topPerformingOutlet[0].outletId },
        select: { id: true, name: true, address: true }
      });
    }

    res.status(200).json({
      totalActiveOutlets,
      totalRevenue: totalRevenueResult._sum.totalAmount || 0,
      totalCustomers: totalCustomers.length,
      totalOrders,
      topPerformingOutlet: topOutletDetails ? {
        ...topOutletDetails,
        orderCount: topPerformingOutlet[0]._count.id
      } : null
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard overview", error: err.message });
  }
};

export const getRevenueTrend = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        },
        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
      },
      select: {
        totalAmount: true,
        createdAt: true
      }
    });

    const dailyRevenue = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.totalAmount);
    }

    const result = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch revenue trend", error: err.message });
  }
};

export const getOrderStatusDistribution = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      _count: { id: true }
    });

    const result = {
      delivered: 0,
      pending: 0,
      cancelled: 0,
      partiallyDelivered: 0
    };

    for (const statusCount of statusCounts) {
      switch (statusCount.status) {
        case 'DELIVERED':
          result.delivered = statusCount._count.id;
          break;
        case 'PENDING':
          result.pending = statusCount._count.id;
          break;
        case 'CANCELLED':
          result.cancelled = statusCount._count.id;
          break;
        case 'PARTIALLY_DELIVERED':
          result.partiallyDelivered = statusCount._count.id;
          break;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order status distribution", error: err.message });
  }
};

export const getOrderSourceDistribution = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const sourceCounts = await prisma.order.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      _count: { id: true }
    });

    const result = {
      appOrders: 0,
      manualOrders: 0
    };

    for (const sourceCount of sourceCounts) {
      if (sourceCount.type === 'APP') {
        result.appOrders = sourceCount._count.id;
      } else if (sourceCount.type === 'MANUAL') {
        result.manualOrders = sourceCount._count.id;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order source distribution", error: err.message });
  }
};

export const getTopSellingItems = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to)
          },
          status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
        }
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: { name: true }
        },
        order: {
          select: { createdAt: true }
        }
      }
    });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    const productStats = {};
    for (const item of orderItems) {
      const productId = item.productId;
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: item.product.name,
          totalOrders: 0,
          totalRevenue: 0,
          orderDates: new Set()
        };
      }
      productStats[productId].totalOrders += item.quantity;
      productStats[productId].totalRevenue += item.quantity * item.unitPrice;
      productStats[productId].orderDates.add(item.order.createdAt.toISOString().slice(0, 10));
    }

    const result = Object.values(productStats)
      .map(stat => ({
        productId: stat.productId,
        productName: stat.productName,
        totalOrders: stat.totalOrders,
        totalRevenue: stat.totalRevenue,
        averageDailyOrders: stat.totalOrders / daysDiff,
        averageDailySales: stat.totalRevenue / daysDiff
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 3);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch top selling items", error: err.message });
  }
};

export const getPeakTimeSlots = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const slotCounts = await prisma.order.groupBy({
      by: ['deliverySlot'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        },
        deliverySlot: { not: null }
      },
      _count: { id: true }
    });

    const allSlots = [
      'SLOT_11_12',
      'SLOT_12_13',
      'SLOT_13_14',
      'SLOT_14_15',
      'SLOT_15_16',
      'SLOT_16_17'
    ];

    const result = allSlots.map(slot => {
      const found = slotCounts.find(s => s.deliverySlot === slot);
      return {
        timeSlot: slot,
        displayName: slot.replace('SLOT_', '').replace('_', ':') + ':00',
        orderCount: found ? found._count.id : 0
      };
    });

    result.sort((a, b) => b.orderCount - a.orderCount);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch peak time slots", error: err.message });
  }
};