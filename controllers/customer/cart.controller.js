import prisma from "../../prisma/client.js";

export const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, action } = req.body;
    const userId = req.user.id;

    if (!productId || !quantity || quantity <= 0 || !["add", "remove"].includes(action)) {
      return res.status(400).json({ message: "Invalid input: productId, quantity, and valid action are required" });
    }

    // Get Customer
    const customer = await prisma.customerDetails.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const customerId = customer.id;

    // Get or create Cart
    let cart = await prisma.cart.findUnique({
      where: { customerId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerId },
      });
    }

    const cartId = cart.id;
    const existingCartItem = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId,
          productId,
        },
      },
    });

    if (action === "add") {
      if (existingCartItem) {
        await prisma.cartItem.update({
          where: {
            cartId_productId: {
              cartId,
              productId,
            },
          },
          data: {
            quantity: existingCartItem.quantity + quantity,
          },
        });
      } else {
        await prisma.cartItem.create({
          data: {
            cartId,
            productId,
            quantity,
          },
        });
      }

      return res.status(200).json({ message: "Product added to cart" });
    }

    if (action === "remove") {
      if (!existingCartItem) {
        return res.status(404).json({ message: "Item not found in cart" });
      }

      if (quantity > existingCartItem.quantity) {
        return res.status(400).json({ message: `Cannot remove ${quantity} item(s), only ${existingCartItem.quantity} in cart` });
      }

      if (quantity === existingCartItem.quantity) {
        await prisma.cartItem.delete({
          where: {
            cartId_productId: {
              cartId,
              productId,
            },
          },
        });

        return res.status(200).json({ message: "Item completely removed from cart" });
      } else {
        await prisma.cartItem.update({
          where: {
            cartId_productId: {
              cartId,
              productId,
            },
          },
          data: {
            quantity: existingCartItem.quantity - quantity,
          },
        });

        return res.status(200).json({ message: "Item quantity reduced" });
      }
    }

  } catch (error) {
    console.error("Error updating cart:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};




