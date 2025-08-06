import prisma from "../../prisma/client.js";

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

export const applyCoupon = async (req, res) => {
  try {
    const { code, currentTotal, outletId } = req.body; // Added outletId to request body

    if (!code || !currentTotal || currentTotal < 0 || !outletId) {
      return res.status(400).json({ message: 'Missing or invalid fields: code, currentTotal, and outletId are required' });
    }

    const userId = req.user.id;

    // Fetch customer details using userId to get the correct cart
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true, cart: { select: { id: true, items: { include: { product: true } } } } },
    });

    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const cart = customer.cart;
    if (!cart) {
      return res.status(404).json({ message: 'Cart not found for customer' });
    }

    const cartItems = cart.items;

    // Calculate total cost from cart items
    const calculatedTotal = cartItems.reduce((total, item) => {
      return total + (item.quantity * item.product.price);
    }, 0);

    // Validate that currentTotal matches calculatedTotal
    if (Math.abs(calculatedTotal - currentTotal) > 0.01) { // Allow for minor floating-point differences
      return res.status(400).json({
        message: 'Provided currentTotal does not match calculated cart total',
        calculatedTotal,
        providedTotal: currentTotal,
      });
    }

    // Fetch coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ message: 'Invalid or inactive coupon' });
    }

    const now = new Date(); // 10:34 PM IST, August 05, 2025
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return res.status(400).json({ message: 'Coupon is not valid for the current date' });
    }

    // Check if coupon is specific to the provided outlet
    if (coupon.outletId !== outletId) {
      return res.status(400).json({ message: 'Coupon is not valid for the selected outlet' });
    }

    // Check one-time usage per customer (without recording yet)
    const existingUsage = await prisma.couponUsage.findFirst({
      where: { userId, couponId: coupon.id },
    });
    if (existingUsage) {
      return res.status(400).json({ message: 'Coupon already used by this customer' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    if (currentTotal < coupon.minOrderValue) {
      return res.status(400).json({ message: `Minimum order value of ${coupon.minOrderValue} required` });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.rewardValue > 0) {
      if (coupon.rewardValue < 1) {
        discount = currentTotal * coupon.rewardValue; // Percentage discount (e.g., 0.1 = 10%)
      } else if (coupon.rewardValue <= currentTotal) {
        discount = coupon.rewardValue; // Fixed amount discount
      }
    }

    const totalAfterDiscount = currentTotal - discount;

    res.status(200).json({
      message: 'Coupon applied successfully',
      discount,
      totalAfterDiscount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply coupon', error: err.message });
  }
};