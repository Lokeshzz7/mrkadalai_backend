import prisma from "../../prisma/client.js";

export const getOutletAppFeatures = async (req, res) => {
  const { outletId } = req.params;
  
  if (!outletId || isNaN(parseInt(outletId))) {
    return res.status(400).json({ message: "Valid outletId is required" });
  }
  
  try {
    const outletIdNum = parseInt(outletId);

    const outlet = await prisma.outlet.findUnique({
      where: { id: outletIdNum },
    });

    if (!outlet) {
      return res.status(400).json({ message: "Outlet not found" });
    }
    
    const features = await prisma.outletAppManagement.findMany({
      where: {
        outletId: outletIdNum,
      },
    });

    const allFeatures = ['APP', 'UPI', 'LIVE_COUNTER', 'COUPONS'];
    const featureStatus = {};

    allFeatures.forEach(feature => {
      const existingFeature = features.find(f => f.feature === feature);
      featureStatus[feature] = existingFeature ? existingFeature.isEnabled : false;
    });

    res.status(200).json({ 
      message: "Outlet app features fetched successfully", 
      data: featureStatus 
    });
  } catch (error) {
    console.error("Error fetching outlet app features:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};


export const updateOutletAppFeatures = async (req, res) => {
  const { outletId, features } = req.body;
  
  if (!outletId || !features || !Array.isArray(features)) {
    return res.status(400).json({ message: "outletId and features array are required" });
  }

  const validFeatures = ['APP', 'UPI', 'LIVE_COUNTER', 'COUPONS'];
  
  for (const featureObj of features) {
    if (!featureObj.feature || !validFeatures.includes(featureObj.feature) || typeof featureObj.isEnabled !== 'boolean') {
      return res.status(400).json({ 
        message: "Each feature must have 'feature' (APP, UPI, LIVE_COUNTER, COUPONS) and 'isEnabled' (boolean)" 
      });
    }
  }

  try {
    const outletIdNum = parseInt(outletId);
    
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletIdNum }
    });

    if (!outlet) {
      return res.status(404).json({ message: "Outlet not found" });
    }

    const results = await prisma.$transaction(async (prismaTransaction) => {
      const updateResults = [];
      
      for (const featureObj of features) {
        const result = await prismaTransaction.outletAppManagement.upsert({
          where: {
            outletId_feature: {
              outletId: outletIdNum,
              feature: featureObj.feature
            }
          },
          update: {
            isEnabled: featureObj.isEnabled
          },
          create: {
            outletId: outletIdNum,
            feature: featureObj.feature,
            isEnabled: featureObj.isEnabled
          }
        });
        updateResults.push(result);
      }
      
      return updateResults;
    });

    res.status(200).json({ 
      message: "Outlet app features updated successfully", 
      data: results 
    });
  } catch (error) {
    console.error("Error updating multiple outlet app features:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

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

export const setOutletAvailability = async (req, res) => {
  const { outletId, nonAvailableDates } = req.body;
  
  const parsedOutletId = parseInt(outletId);
  if (!outletId || isNaN(parsedOutletId)) {
    return res.status(400).json({ message: "Valid outletId is required" });
  }
  
  if (!nonAvailableDates || !Array.isArray(nonAvailableDates)) {
    return res.status(400).json({ message: "outletId and nonAvailableDates array are required" });
  }

  try {

    await prisma.$transaction(async (prismaTransaction) => {

      await prismaTransaction.outletAvailability.deleteMany({
        where: { outletId: parsedOutletId },
      });

      for (const entry of nonAvailableDates) {
        const { date, nonAvailableSlots } = entry;
        if (!date || !nonAvailableSlots || !Array.isArray(nonAvailableSlots)) {
          throw new Error(`Invalid entry for date ${date}: nonAvailableSlots must be an array`);
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          throw new Error(`Invalid date format for ${date}`);
        }
        
        await prismaTransaction.outletAvailability.create({
          data: {
            outletId: parsedOutletId,
            date: parsedDate,
            nonAvailableSlots: nonAvailableSlots,
          },
        });
      }
    });
    
    console.log("Transaction completed successfully");
    res.status(200).json({ message: "Outlet availability updated successfully" });
  } catch (error) {
    console.error("Error setting outlet availability:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getAvailableDatesAndSlots = async (req, res) => {
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