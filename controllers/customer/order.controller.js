import prisma from "../../prisma/client.js";

export const CustomerAppOrder=async (req, res)=>{
  try {
    const { customerId, outletId, totalAmount, paymentMethod,deliveryTime,coupon,items } = req.body;

    
    if (!customerId ||!outletId || !totalAmount || !paymentMethod || !items || items.length === 0) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const order = await prisma.order.create({
      data: {
        customerId,
        outletId,
        totalAmount,
        paymentMethod,
        status: 'PENDING',
        type: 'APP',
        deliveryTime,
        coupon,
        items: {
          create: items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice
          }))
        }
      },
      include: {
        items: true
      }
    });

    res.status(201).json({ message: "Manual order created", order });
  } catch (error) {
    console.error("Error creating manual order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};