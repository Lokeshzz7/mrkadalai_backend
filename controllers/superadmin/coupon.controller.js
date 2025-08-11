import prisma from "../../prisma/client.js";

export const createCoupon = async (req, res) => {
  const { code, description, rewardValue, minOrderValue, validFrom, validUntil, isActive, usageLimit, outletId } = req.body;

  if (!code || !rewardValue || !minOrderValue || !validFrom || !validUntil) {
    return res.status(400).json({ message: "code, rewardValue, minOrderValue, validFrom, and validUntil are required" });
  }

  try {
    let parsedRewardValue;
    if (typeof rewardValue === "string" && rewardValue.endsWith("%")) {
      const percentage = parseFloat(rewardValue.replace("%", ""));
      if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
        return res.status(400).json({ message: "rewardValue must be a valid percentage between 1% and 100%" });
      }
      parsedRewardValue = percentage / 100;
    } else {
      return res.status(400).json({ message: "rewardValue must be provided as a percentage (e.g., '10%')" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        rewardValue: parsedRewardValue,
        minOrderValue,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: isActive !== undefined ? isActive : true,
        usageLimit: usageLimit || null,
        usedCount: 0,
        outletId: outletId || null,
        createdAt: new Date(),
      },
    });

    res.status(201).json({ message: "Coupon created successfully", data: coupon });
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      include: { outlet: true },
    });
    res.status(200).json({ message: "Coupons fetched successfully", data: coupons });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

export const deleteCoupon = async (req, res) => {
  const { couponId } = req.params;
  if (!couponId || isNaN(parseInt(couponId))) {
    return res.status(400).json({ message: "Valid couponId is required" });
  }

  try {
    await prisma.coupon.delete({
      where: { id: parseInt(couponId) },
    });
    res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ message: "Coupon not found" });
    }
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};