import prisma from "../../prisma/client.js";

export const getOrderHistory = async (req, res) => {
  try {
    const outletId = Number(req.query.outletId);
    const date = req.query.date;

    if (!outletId || !date) {
      return res.status(400).json({ message: 'outletId and date are required' });
    }

    const startDate = new Date(date);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        deliveryDate: {
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
      customerName: order.customer?.user?.name || 'Walk-In',
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


export const getAvailableDatesAndSlotsForStaff = async (req, res) => {
  const { outletId } = req.params;

  if (!outletId || isNaN(parseInt(outletId))) {
    return res.status(400).json({ message: "Valid outletId is required" });
  }

  try {
    const outletIdNum = parseInt(outletId);
    const today = new Date();
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    const nonAvailable = await prisma.outletAvailability.findMany({
      where: {
        outletId: outletIdNum,
        date: {
          gte: today,
          lte: next30Days,
        },
      },
    });

    const allSlots = [
      "SLOT_11_12",
      "SLOT_12_13",
      "SLOT_13_14",
      "SLOT_14_15",
      "SLOT_15_16",
      "SLOT_16_17",
    ];

    const availableDates = [];
    for (let d = new Date(today); d <= next30Days; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const nonAvailEntry = nonAvailable.find(
        (entry) => entry.date.toISOString().split("T")[0] === dateStr
      );

      const availableSlots = nonAvailEntry
        ? allSlots.filter((slot) => !nonAvailEntry.nonAvailableSlots.includes(slot))
        : [...allSlots];

      if (availableSlots.length > 0) {
        availableDates.push({
          date: dateStr,
          availableSlots,
        });
      }
    }

    res.status(200).json({ message: "Available dates and slots fetched", data: availableDates });
  } catch (error) {
    console.error("Error fetching available dates and slots for staff:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
