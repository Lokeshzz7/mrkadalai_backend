import prisma from "../../prisma/client.js";

export const createCoupon = async (req, res) => {
  try {
    const { code, description, rewardValue, minOrderValue, validFrom, validUntil, usageLimit } = req.body;
    
    console.log('Extracted values:', {
      code, description, rewardValue, minOrderValue, validFrom, validUntil, usageLimit
    });

    if (!code || !rewardValue || !validFrom || !validUntil || !usageLimit) {
      console.log('Missing required fields');
      return res.status(400).json({ message: 'Missing required fields' });
    }

    console.log('Checking if coupon exists...');
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (existingCoupon) {
      console.log('Coupon code already exists');
      return res.status(400).json({ message: 'Coupon code already exists' });
    }

    const validFromDate = new Date(validFrom);
    const validUntilDate = new Date(validUntil);
    const now = new Date();

    console.log('Date validation:', { validFromDate, validUntilDate, now });

    if (validFromDate < now) {
      console.log('Valid from date is in the past');
      return res.status(400).json({ message: 'Valid from date cannot be in the past' });
    }

    if (validUntilDate <= validFromDate) {
      console.log('Valid until date is before or equal to valid from date');
      return res.status(400).json({ message: 'Valid until date must be after valid from date' });
    }

    console.log('Creating coupon in database...');
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        description: description || '',
        rewardValue: parseFloat(rewardValue),
        minOrderValue: parseFloat(minOrderValue) || 0,
        validFrom: validFromDate,
        validUntil: validUntilDate,
        isActive: true,
        usageLimit: parseInt(usageLimit),
        usedCount: 0,
      },
    });

    console.log('Coupon created successfully:', coupon);
    res.status(201).json({ message: 'Coupon created successfully', coupon });
  } catch (err) {
    console.error('=== COUPON CREATION ERROR ===');
    console.error('Error details:', err);
    console.error('Stack trace:', err.stack);
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
    console.error('Error fetching coupons:', err);
    res.status(500).json({ message: 'Failed to fetch coupons', error: err.message });
  }
};

export const deleteCoupon = async (req, res) => {
  try {
    console.log('=== DELETE COUPON DEBUG ===');
    const { couponId } = req.params;
    console.log('Coupon ID to delete:', couponId);

    if (!couponId) {
      return res.status(400).json({ message: 'Coupon ID is required' });
    }

    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: parseInt(couponId) }
    });

    if (!existingCoupon) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    const couponUsage = await prisma.couponUsage.findFirst({
      where: { couponId: parseInt(couponId) }
    });

    if (couponUsage) {
      await prisma.coupon.update({
        where: { id: parseInt(couponId) },
        data: { isActive: false }
      });
      console.log('Coupon deactivated (was previously used)');
      return res.status(200).json({ message: 'Coupon deactivated successfully (was previously used)' });
    } else {
      await prisma.coupon.delete({
        where: { id: parseInt(couponId) }
      });
      console.log('Coupon deleted successfully');
      return res.status(200).json({ message: 'Coupon deleted successfully' });
    }
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ message: 'Failed to delete coupon', error: err.message });
  }
};