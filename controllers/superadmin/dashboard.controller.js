import prisma from "../../prisma/client.js";

export const getDashboardOverview = async (req, res, next) => {
  try {
    const totalActiveOutlets = await prisma.outlet.count({
      where: { isActive: true }
    });

    const totalRevenueResult = await prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
      }
    });

    const totalCustomers = await prisma.order.groupBy({
      by: ['customerId'],
      where: {
        customerId: { not: null }
      }
    });

    const totalOrders = await prisma.order.count();

    const topPerformingOutlet = await prisma.order.groupBy({
      by: ['outletId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1
    });

    let topOutletDetails = null;
    if (topPerformingOutlet.length > 0) {
      topOutletDetails = await prisma.outlet.findUnique({
        where: { id: topPerformingOutlet[0].outletId },
        select: { id: true, name: true, address: true }
      });
    }

    res.status(200).json({
      totalActiveOutlets,
      totalRevenue: totalRevenueResult._sum.totalAmount || 0,
      totalCustomers: totalCustomers.length,
      totalOrders,
      topPerformingOutlet: topOutletDetails ? {
        ...topOutletDetails,
        orderCount: topPerformingOutlet[0]._count.id
      } : null
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard overview", error: err.message });
  }
};

export const getRevenueTrend = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        },
        status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
      },
      select: {
        totalAmount: true,
        createdAt: true
      }
    });

    const dailyRevenue = {};
    for (const order of orders) {
      const date = order.createdAt.toISOString().slice(0, 10);
      dailyRevenue[date] = (dailyRevenue[date] || 0) + Number(order.totalAmount);
    }

    const result = Object.entries(dailyRevenue)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch revenue trend", error: err.message });
  }
};

export const getOrderStatusDistribution = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      _count: { id: true }
    });

    const result = {
      delivered: 0,
      pending: 0,
      cancelled: 0,
      partiallyDelivered: 0
    };

    for (const statusCount of statusCounts) {
      switch (statusCount.status) {
        case 'DELIVERED':
          result.delivered = statusCount._count.id;
          break;
        case 'PENDING':
          result.pending = statusCount._count.id;
          break;
        case 'CANCELLED':
          result.cancelled = statusCount._count.id;
          break;
        case 'PARTIALLY_DELIVERED':
          result.partiallyDelivered = statusCount._count.id;
          break;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order status distribution", error: err.message });
  }
};

export const getOrderSourceDistribution = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const sourceCounts = await prisma.order.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        }
      },
      _count: { id: true }
    });

    const result = {
      appOrders: 0,
      manualOrders: 0
    };

    for (const sourceCount of sourceCounts) {
      if (sourceCount.type === 'APP') {
        result.appOrders = sourceCount._count.id;
      } else if (sourceCount.type === 'MANUAL') {
        result.manualOrders = sourceCount._count.id;
      }
    }

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch order source distribution", error: err.message });
  }
};

export const getTopSellingItems = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: new Date(from),
            lte: new Date(to)
          },
          status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] }
        }
      },
      select: {
        productId: true,
        quantity: true,
        unitPrice: true,
        product: {
          select: { name: true }
        },
        order: {
          select: { createdAt: true }
        }
      }
    });

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;

    const productStats = {};
    for (const item of orderItems) {
      const productId = item.productId;
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: item.product.name,
          totalOrders: 0,
          totalRevenue: 0,
          orderDates: new Set()
        };
      }
      productStats[productId].totalOrders += item.quantity;
      productStats[productId].totalRevenue += item.quantity * item.unitPrice;
      productStats[productId].orderDates.add(item.order.createdAt.toISOString().slice(0, 10));
    }

    const result = Object.values(productStats)
      .map(stat => ({
        productId: stat.productId,
        productName: stat.productName,
        totalOrders: stat.totalOrders,
        totalRevenue: stat.totalRevenue,
        averageDailyOrders: stat.totalOrders / daysDiff,
        averageDailySales: stat.totalRevenue / daysDiff
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders)
      .slice(0, 3);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch top selling items", error: err.message });
  }
};

export const getPeakTimeSlots = async (req, res, next) => {
  const { from, to } = req.body;

  if (!from || !to) {
    return res.status(400).json({ message: "from and to dates are required" });
  }

  try {
    const slotCounts = await prisma.order.groupBy({
      by: ['deliverySlot'],
      where: {
        createdAt: {
          gte: new Date(from),
          lte: new Date(to)
        },
        deliverySlot: { not: null }
      },
      _count: { id: true }
    });

    const allSlots = [
      'SLOT_11_12',
      'SLOT_12_13',
      'SLOT_13_14',
      'SLOT_14_15',
      'SLOT_15_16',
      'SLOT_16_17'
    ];

    const result = allSlots.map(slot => {
      const found = slotCounts.find(s => s.deliverySlot === slot);
      return {
        timeSlot: slot,
        displayName: slot.replace('SLOT_', '').replace('_', ':') + ':00',
        orderCount: found ? found._count.id : 0
      };
    });

    result.sort((a, b) => b.orderCount - a.orderCount);

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch peak time slots", error: err.message });
  }
};

// List all admins pending verification
export const getPendingAdminVerifications = async (req, res, next) => {
  try {
    const pendingAdmins = await prisma.admin.findMany({
      where: { isVerified: false },
      select: {
        id: true,
        email: true,
        name: true,
        phone:true,
        createdAt: true
      }
    });
    res.status(200).json(pendingAdmins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending admin verifications', error: err.message });
  }
};

// Superadmin verifies an admin
export const verifyAdmin = async (req, res, next) => {
  const { adminId } = req.params;
  try {
    const updated = await prisma.admin.update({
      where: { id: Number(adminId) },
      data: { isVerified: true }
    });
    res.status(200).json({ message: 'Admin verified', admin: { id: updated.id, name: updated.name, email: updated.email } });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify admin', error: err.message });
  }
};

export const getVerifiedAdmins = async (req, res, next) => {
  try {
    const verifiedAdmins = await prisma.admin.findMany({
      where: { isVerified: true },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        outlets: { // Include associated outlets if needed
          select: {
            outletId: true,
            outlet: {
              select: { name: true, address: true }
            }
          }
        },
        permissions: { // Include permissions if needed
          select: {
            type: true,
            isGranted: true
          }
        }
      },
    });
    res.status(200).json(verifiedAdmins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch verified admins', error: err.message });
  }
};

export const mapOutletsToAdmin = async (req, res, next) => {
  const { adminId, outletIds } = req.body;

  if (!adminId || !outletIds || !Array.isArray(outletIds) || outletIds.length === 0) {
    return res.status(400).json({ message: "adminId and a non-empty array of outletIds are required" });
  }

  try {
    // Check if admin exists and is verified
    const admin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      include: { outlets: true },
    });

    if (!admin || !admin.isVerified) {
      return res.status(404).json({ message: "Admin not found or not verified" });
    }

    // Check if outlets exist and are active
    const validOutlets = await prisma.outlet.findMany({
      where: { id: { in: outletIds }, isActive: true },
    });

    if (validOutlets.length !== outletIds.length) {
      return res.status(400).json({ message: "One or more outlets are invalid or inactive" });
    }

    // Create or update AdminOutlet records
    const existingOutletIds = admin.outlets.map(o => o.outletId);
    const newOutlets = outletIds.filter(id => !existingOutletIds.includes(id));

    if (newOutlets.length > 0) {
      await prisma.adminOutlet.createMany({
        data: newOutlets.map(outletId => ({
          adminId: Number(adminId),
          outletId: outletId,
        })),
      });
    }

    const updatedAdmin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      include: { outlets: { include: { outlet: true } } },
    });

    res.status(200).json({
      message: "Outlets mapped to admin successfully",
      admin: {
        id: updatedAdmin.id,
        email: updatedAdmin.email,
        outlets: updatedAdmin.outlets.map(o => ({
          outletId: o.outletId,
          name: o.outlet.name,
          address: o.outlet.address,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to map outlets to admin", error: err.message });
  }
};


export const assignAdminPermissions = async (req, res, next) => {
  const { adminId, outletId, permissions } = req.body;

  if (!adminId || !outletId || !permissions || !Array.isArray(permissions) || permissions.length === 0) {
    return res.status(400).json({ message: "adminId, outletId, and a non-empty array of permissions are required" });
  }

  try {
    // Check if admin exists and is verified
    const admin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      include: { outlets: true },
    });

    if (!admin || !admin.isVerified) {
      return res.status(404).json({ message: "Admin not found or not verified" });
    }

    // Check if the outlet is associated with the admin
    const adminOutlet = await prisma.adminOutlet.findUnique({
      where: { adminId_outletId: { adminId: Number(adminId), outletId: Number(outletId) } },
    });

    if (!adminOutlet) {
      return res.status(400).json({ message: "Outlet is not mapped to this admin" });
    }

    // Validate and create permissions
    const permissionData = permissions.map(p => ({
      adminOutletId: adminOutlet.id,
      type: p.type, // e.g., 'ORDER_MANAGEMENT', 'INVENTORY_MANAGEMENT'
      isGranted: p.isGranted || true,
    }));

    await prisma.adminPermission.createMany({
      data: permissionData,
      skipDuplicates: true, // Avoid duplicate permissions
    });

    const updatedPermissions = await prisma.adminPermission.findMany({
      where: { adminOutletId: adminOutlet.id },
    });

    res.status(200).json({
      message: "Permissions assigned successfully",
      adminId,
      outletId,
      permissions: updatedPermissions,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to assign permissions", error: err.message });
  }
};

export const verifyStaff = async (req, res, next) => {
  const { userId } = req.params;
  const { outletId, staffRole } = req.body; // Include staffRole in the request body

  try {
    const staff = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { role: true, isVerified: true, staffInfo: { select: { id: true } } },
    });
    if (!staff || staff.role !== 'STAFF') {
      return res.status(404).json({ message: 'Staff not found' });
    }

    if (staff.isVerified) {
      return res.status(400).json({ message: 'Staff is already verified' });
    }

    if (!outletId) {
      return res.status(400).json({ message: 'outletId is required for verification' });
    }

    // Step 1: Update the User with outletId and isVerified
    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        isVerified: true,
        outletId: Number(outletId),
      },
      include: { staffInfo: true },
    });

    // Step 2: Create or update StaffDetails if it doesn't exist
    let staffInfo;
    if (!updatedUser.staffInfo) {
      staffInfo = await prisma.staffDetails.create({
        data: {
          userId: Number(userId),
          staffRole: staffRole || null,
        },
      });
    } else {
      staffInfo = await prisma.staffDetails.update({
        where: { userId: Number(userId) },
        data: {
          staffRole: staffRole || null,
        },
      });
    }

    // Define default permission types using the PermissionType enum
    const defaultPermissions = [
      'BILLING',
      'PRODUCT_INSIGHTS',
      'REPORTS',
      'INVENTORY',
    ];

    // Create permissions with isGranted: false
    const permissionCreates = defaultPermissions.map(type => ({
      staffId: staffInfo.id,
      type,
      isGranted: false,
    }));

    await prisma.staffPermission.createMany({
      data: permissionCreates,
    });

    res.status(200).json({
      message: 'Staff verified successfully',
      user: { id: updatedUser.id, name: updatedUser.name, email: updatedUser.email, outletId: updatedUser.outletId, staffRole: staffInfo.staffRole }
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to verify staff', error: err.message });
  }
};


export const getUnverifiedStaff = async (req, res, next) => {
  try {
    const unverifiedStaff = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        isVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        outletId: true, // Will be null for unverified staff
      },
    });
    res.status(200).json(unverifiedStaff);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unverified staff', error: err.message });
  }
};