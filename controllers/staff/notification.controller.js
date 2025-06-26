import prisma from "../../prisma/client.js";


export const OutletCurrentOrder=async (req,res,next)=>{
try {
    const outletId= parseInt(req.params.outletId);
    const {role} = req.user;

    if (role !== "STAFF") {
      return res.status(403).json({ message: "Access denied. Must be STAFF role" });
    }
    if (!outletId) {
      return res.status(400).json({ message: "Outlet ID is required" });
    }

    const orders = await prisma.order.findMany({
      where: {
        outletId,
        status: "PENDING",
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                description: true,
                price: true,
              },
            },
          },
        },
        customer: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "No pending orders found", orders: [] });
    }

    res.status(200).json({ message: "Pending orders retrieved", orders });
  } catch (error) {
    console.error("Error retrieving pending orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



