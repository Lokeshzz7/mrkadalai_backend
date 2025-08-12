import prisma from "../../prisma/client.js";

export const getProductsAndStocks = async (req, res) => {
  try {
    const outletId = req.user.outletId;

    if (!outletId) {
      return res.status(400).json({ message: "Outlet ID not found in request." });
    }

    const products = await prisma.product.findMany({
      where: {
        outletId,
      },
      include: {
        inventory: true,
      },
    });

    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products and stocks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getAvailableDatesAndSlotsForCustomer = async (req, res) => {
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

    // Generate available dates
    const availableDates = [];
    for (let d = new Date(today); d <= next30Days; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const nonAvailEntry = nonAvailable.find((entry) => entry.date.toISOString().split("T")[0] === dateStr);
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
    console.error("Error fetching available dates and slots:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};