import prisma from "../../prisma/client.js";

export const createCoupon = async (req, res) => {
  try {
    const { code, description, rewardValue, minOrderValue, validFrom, validUntil, usageLimit, outletId } = req.body;

    if (!code || !rewardValue || !validFrom || !validUntil || !usageLimit || !outletId) {
      return res.status(400).json({ message: 'Missing required fields: code, rewardValue, validFrom, validUntil, usageLimit, and outletId are required' });
    }

    // Validate outlet exists
    const outlet = await prisma.outlet.findUnique({
      where: { id: outletId },
    });
    if (!outlet) {
      return res.status(404).json({ message: 'Outlet not found' });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code,
        description,
        rewardValue,
        minOrderValue,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        isActive: true,
        usageLimit,
        usedCount: 0,
        outletId,
      },
    });

    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create coupon', error: err.message });
  }
};