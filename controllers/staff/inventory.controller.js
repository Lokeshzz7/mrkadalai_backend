import prisma from "../../prisma/client.js";

export const getStocks = async (req, res, next) => {
  const outletId = parseInt(req.params.outletId);
  if (!outletId) return res.status(400).json({ message: "Provide outletId" })
  try {
    const products = await prisma.product.findMany({
      where: { outletId },
      include: {
        inventory: true,
      }
    });

    if (!products || products.length === 0) {
      return res.status(200).json({ message: "No products found for this outlet." });
    }

    const stockInfo = products.map(prod => ({
      id: prod.id,
      name: prod.name,
      category: prod.category,
      price: prod.price,
      quantity: prod.inventory?.quantity ?? 0,
      threshold: prod.inventory?.threshold ?? 0,
    }));

    return res.status(200).json({ stocks: stockInfo });
  } catch (err) {
    console.error("Error fetching stocks:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const addStock = async (req, res, next) => {
  const { productId, outletId, addedQuantity } = req.body;

  if (!productId || !outletId || !addedQuantity) {
    return res.status(400).json({ message: "Required fields are missing" });
  }

  if (isNaN(productId) || isNaN(outletId) || isNaN(addedQuantity)) {
    return res.status(400).json({ message: "Invalid number in request" });
  }

  try {
    const inventory = await prisma.inventory.findUnique({ where: { productId } });

    if (!inventory) {
      return res.status(404).json({ message: "Product inventory not found" });
    }

    const updatedInventory = await prisma.inventory.update({
      where: { productId },
      data: {
        quantity: { increment: addedQuantity }
      }
    });

    await prisma.stockHistory.create({
      data: {
        productId: parseInt(productId),
        outletId : parseInt(outletId),
        quantity: addedQuantity,
        action: "ADD"
      }
    });

    return res.status(200).json({ message: "Stock updated successfully", updatedInventory });
  } catch (err) {
    console.error("Error updating stock:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const deductStock = async (req, res, next) => {
  const { productId, outletId, quantity } = req.body;

  if (!productId || !outletId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: "Provide valid productId, outletId, and quantity." });
  }

  try {
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: parseInt(productId),
        outletId: parseInt(outletId),
      }
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found." });
    }

    if (inventory.quantity < quantity) {
      return res.status(400).json({ message: "Insufficient stock available." });
    }

    const updatedInventory = await prisma.inventory.update({
      where: { productId: parseInt(productId) },
      data: {
        quantity: {
          decrement: quantity
        }
      }
    });

    await prisma.stockHistory.create({
      data: {
        productId: parseInt(productId),
        outletId: parseInt(outletId),
        quantity,
        action: "REMOVE",
      }
    });

    res.status(200).json({ message: "Stock deducted successfully", currentQuantity: updatedInventory.quantity });

  } catch (err) {
    console.error("Error deducting stock:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const stockHistory = async (req, res, next) => {
  const { outletId, startDate, endDate } = req.body;

  if (!outletId || !startDate || !endDate) {
    return res.status(400).json({ message: "outletId, startDate, and endDate are required." });
  }

  try {
    const parsedOutletId = parseInt(outletId);
    const from = new Date(startDate);
    const to = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    const history = await prisma.stockHistory.findMany({
      where: {
        outletId: parsedOutletId,
        action: {
            in: ["ADD", "REMOVE"]
        },
        timestamp: {
          gte: from,
          lte: to
        }
      },
      orderBy: {
        timestamp: "desc"
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            category : true
          }
        }
      }
    });

    res.status(200).json({ message: "Stock history fetched", history });
  } catch (error) {
    console.error("Error fetching stock history:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};