import prisma from "../../prisma/client.js";


export const createCoupon = async (req, res) => {
    try {
      const { code, description, rewardValue, minOrderValue, validFrom, validUntil, usageLimit } = req.body;
  
      if (!code || !rewardValue || !validFrom || !validUntil || !usageLimit) {
        return res.status(400).json({ message: 'Missing required fields' });
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
        },
      });
  
      res.status(201).json({ message: 'Coupon created successfully', coupon });
    } catch (err) {
      res.status(500).json({ message: 'Failed to create coupon', error: err.message });
    }
  };


export const getCoupons = async (req, res) => {
    try {
      const coupons = await prisma.coupon.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      res.status(200).json(coupons);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch coupons', error: err.message });
    }
  };