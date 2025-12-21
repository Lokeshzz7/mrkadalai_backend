import prisma from "../../prisma/client.js";
import { getCurrentISTAsUTC, convertUTCToIST, formatDateForIST, getTimezoneInfo } from "../../utils/timezone.js"
export const getCoupons = async (req, res) => {
  try {
    const { outletId } = req.params;
    const userId = req.user.id; // Get current customer's user ID
    
    const currentISTAsUTC = getCurrentISTAsUTC();
    
    const coupons = await prisma.coupon.findMany({
      where: { 
        outletId: parseInt(outletId), 
        isActive: true,
        validFrom: {
          lte: currentISTAsUTC
        },
        validUntil: {
          gte: currentISTAsUTC
        }
      },
      include: {
        usages: {
          where: {
            userId: userId
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    const unusedCoupons = coupons.filter(coupon => coupon.usages.length === 0);
    
    const couponsWithStatus = unusedCoupons.map(coupon => ({
      id: coupon.id,
      code: coupon.code,
      description: coupon.description,
      rewardValue: coupon.rewardValue,
      minOrderValue: coupon.minOrderValue,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      isActive: coupon.isActive,
      usageLimit: coupon.usageLimit,
      usedCount: coupon.usedCount,
      usageType: coupon.usageType,
      outletId: coupon.outletId,
      createdAt: coupon.createdAt,
      isCurrentlyValid: true, // All returned coupons are currently valid
      validFromIST: formatDateForIST(coupon.validFrom),
      validUntilIST: formatDateForIST(coupon.validUntil),
      isUsedByCustomer: false, // These are all unused by customer
      remainingUses: coupon.usageLimit - coupon.usedCount
    }));
    
    res.status(200).json({
      message: 'Available coupons fetched successfully',
      coupons: couponsWithStatus,
      totalAvailable: couponsWithStatus.length,
      currentTimeIST: formatDateForIST(currentISTAsUTC),
      timezone: getTimezoneInfo(),
      note: 'Only unused coupons by this customer are returned'
    });
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ message: 'Failed to fetch coupons', error: err.message });
  }
};

export const applyCoupon = async (req, res) => {
  try {
    const { code, currentTotal, outletId } = req.body;

    if (!code || !currentTotal || currentTotal < 0 || !outletId) {
      return res.status(400).json({ message: 'Missing or invalid fields: code, currentTotal, and outletId are required' });
    }

    const userId = req.user.id;

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

    const calculatedTotal = cartItems.reduce((total, item) => {
      return total + (item.quantity * item.product.price);
    }, 0);

    if (Math.abs(calculatedTotal - currentTotal) > 0.01) {
      return res.status(400).json({
        message: 'Provided currentTotal does not match calculated cart total',
        calculatedTotal,
        providedTotal: currentTotal,
      });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ message: 'Invalid or inactive coupon' });
    }

    const currentISTAsUTC = getCurrentISTAsUTC();
    if (currentISTAsUTC < coupon.validFrom || currentISTAsUTC > coupon.validUntil) {
      const validFromIST = new Date(coupon.validFrom.getTime() + (5.5 * 60 * 60 * 1000));
      const validUntilIST = new Date(coupon.validUntil.getTime() + (5.5 * 60 * 60 * 1000));
      
      return res.status(400).json({ 
        message: 'Coupon is not valid for the current date and time',
        currentTimeIST: currentISTAsUTC.toISOString(),
        couponValidFrom: validFromIST.toISOString(),
        couponValidUntil: validUntilIST.toISOString(),
        timezone: 'IST (UTC+5:30)'
      });
    }

    if (coupon.outletId !== outletId) {
      return res.status(400).json({ message: 'Coupon is not valid for the selected outlet' });
    }

    const existingUsage = await prisma.couponUsage.findFirst({
      where: { userId, couponId: coupon.id },
    });
    if (existingUsage) {
      return res.status(400).json({ message: 'Coupon already used by this customer' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit reached' });
    }

    // Industry standard: Minimum order value is checked on ORIGINAL amount (before discount)
    // This ensures orders qualify even if the discount brings the final amount below minimum
    // Example: Min order ₹100, Order ₹120, Discount 25% → Final ₹90 (valid, as original ₹120 > ₹100)
    if (currentTotal < coupon.minOrderValue) {
      return res.status(400).json({ 
        message: `Minimum order value of ₹${coupon.minOrderValue} required. Your current order value is ₹${currentTotal}` 
      });
    }

    let discount = 0;
    if (coupon.rewardValue > 0) {
      if (coupon.rewardValue <= 1) {
        discount = currentTotal * coupon.rewardValue; // Percentage discount (e.g., 0.25 = 25%)
      } else if (coupon.rewardValue <= currentTotal) {
        discount = coupon.rewardValue; // Fixed amount discount (e.g., ₹50)
      } else {
        // Fixed amount discount exceeds order total, cap at order total
        discount = currentTotal;
      }
    }

    // Calculate final amount after discount (minimum 0)
    const totalAfterDiscount = Math.max(0, currentTotal - discount);

    res.status(200).json({
      message: 'Coupon applied successfully',
      discount,
      totalAfterDiscount,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply coupon', error: err.message });
  }
};
