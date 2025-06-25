import prisma from "../../prisma/client.js";


export const addManualOrder = async (req, res) => {
  const { outletId, totalAmount, paymentMethod, items } = req.body;

  if (!outletId || !totalAmount || !paymentMethod || !items || items.length === 0) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    
    for (const item of items) {
      const inventory = await prisma.inventory.findFirst({
        where: {
          outletId,
          productId: item.productId
        }
      });

      if (!inventory || inventory.quantity < item.quantity) {
        return res.status(400).json({
          message: `Insufficient inventory for product ID ${item.productId}`
        });
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      // Create order and order items
      const createdOrder = await tx.order.create({
        data: {
          outletId,
          totalAmount,
          paymentMethod,
          status: 'PENDING',
          type: 'MANUAL',
          customerId: null,
          items: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice
            }))
          }
        },
        include: { items: true }
      });

      for (const item of items) {
        await tx.inventory.updateMany({
          where: {
            outletId,
            productId: item.productId
          },
          data: {
            quantity: {
              decrement: item.quantity
            }
          }
        });

      }

      return createdOrder;
    });

    res.status(201).json({ message: "Manual order created", order });

  } catch (error) {
    console.error("Error creating manual order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getProducts = async (req, res) => {
  const outletId = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: "Provide a valid outletId" });
  }

  try {
    const products = await prisma.inventory.findMany({
      where: {
        outletId: outletId,
        quantity: {
          gt: 0,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            imageUrl: true,
            category: true,
          },
        },
      },
    });

    const availableProducts = products.map((entry) => ({
      id: entry.product.id,
      name: entry.product.name,
      description: entry.product.description,
      price: entry.product.price,
      imageUrl: entry.product.imageUrl,
      category: entry.product.category,
      quantityAvailable: entry.quantity,
    }));

    return res.status(200).json({ products: availableProducts });

  } catch (error) {
    console.error("Error fetching available products:", error);
    return res.status(500).json({ message: "Failed to fetch available products" });
  }
};
