import prisma from "../../prisma/client.js";

export const getProductsAndStocks = async (req, res) => {
  try {
    const outletId = req.user.outletId;

    if (!outletId) {
      return res.status(400).json({ message: "Outlet ID not found in request." });
    }

    const products = await prisma.product.findMany({
      where: {
        outletId,
      },
      include: {
        inventory: true,
      },
    });

    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products and stocks:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
