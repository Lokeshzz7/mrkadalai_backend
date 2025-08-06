import prisma from "../../prisma/client.js";

export const getOutletNonAvailabilityPreview = async (req, res) => {
  const { outletId } = req.params;
  if (!outletId || isNaN(parseInt(outletId))) {
    return res.status(400).json({ message: "Valid outletId is required" });
  }

  try {
    const outletIdNum = parseInt(outletId);

    const nonAvailable = await prisma.outletAvailability.findMany({
      where: {
        outletId: outletIdNum,
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

    const previewData = [];
    for (const entry of nonAvailable) {
      const dateStr = entry.date.toISOString().split("T")[0];
      const nonAvailableSlots = entry.nonAvailableSlots || [];
      previewData.push({
        date: dateStr,
        nonAvailableSlots: nonAvailableSlots,
      });
    }

    res.status(200).json({ message: "Outlet non-availability preview fetched", data: previewData });
  } catch (error) {
    console.error("Error fetching outlet non-availability preview:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
// POST: Update non-available dates and slots (clear and replace)
export const setOutletAvailability = async (req, res) => {
  const { outletId, nonAvailableDates } = req.body;
  if (!outletId || !nonAvailableDates || !Array.isArray(nonAvailableDates)) {
    return res.status(400).json({ message: "outletId and nonAvailableDates array are required" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Clear existing records for the outlet
      await tx.outletAvailability.deleteMany({
        where: { outletId },
      });

      // Insert updated records
      for (const entry of nonAvailableDates) {
        const { date, nonAvailableSlots } = entry;
        if (!date || !nonAvailableSlots || !Array.isArray(nonAvailableSlots)) {
          throw new Error(`Invalid entry for date ${date}: nonAvailableSlots must be an array`);
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format for ${date}`);
        }
        await tx.outletAvailability.create({
          data: {
            outletId,
            date: parsedDate,
            nonAvailableSlots,
          },
        });
      }
    });
    res.status(200).json({ message: "Outlet availability updated successfully" });
  } catch (error) {
    console.error("Error setting outlet availability:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// GET: Get available dates and slots for the next 30 days (for customer-facing use)
export const getAvailableDatesAndSlots = async (req, res) => {
  const { outletId } = req.params;
  if (!outletId || isNaN(parseInt(outletId))) {
    return res.status(400).json({ message: "Valid outletId is required" });
  }

  try {
    const outletIdNum = parseInt(outletId);
    const today = new Date("2025-08-06T15:16:00Z"); // 03:16 PM IST, August 06, 2025
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);

    // Get all non-available dates and slots for the outlet
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