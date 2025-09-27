import prisma from "../../prisma/client.js";

const formatSlotForDisplay = (slot) => {
    if (!slot) return 'N/A';
    try {
        const parts = slot.replace('SLOT_', '').split('_');
        const startTime = parseInt(parts[0], 10);
        const endTime = parseInt(parts[1], 10);

        const formatHour = (hour) => {
            if (hour === 12) return '12 PM';
            if (hour === 0) return '12 AM';
            const ampm = hour < 12 ? 'AM' : 'PM';
            const h = hour % 12 || 12;
            return `${h} ${ampm}`;
        };

        return `${formatHour(startTime)} - ${formatHour(endTime)}`;
    } catch (e) {
        return slot;
    }
};


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

        const totalCustomers = await prisma.customerDetails.count();

        const totalOrders = await prisma.order.count();

        const topPerformingOutletResult = await prisma.order.groupBy({
            by: ['outletId'],
            _sum: { totalAmount: true },
            orderBy: {
                _sum: {
                    totalAmount: 'desc'
                }
            },
            take: 1
        });

        let topOutletDetails = null;
        if (topPerformingOutletResult.length > 0) {
            topOutletDetails = await prisma.outlet.findUnique({
                where: { id: topPerformingOutletResult[0].outletId },
                select: { id: true, name: true }
            });
        }

        res.status(200).json({
            totalActiveOutlets,
            totalRevenue: totalRevenueResult._sum.totalAmount || 0,
            totalCustomers,
            totalOrders,
            topPerformingOutlet: topOutletDetails
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
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate
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
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const statusCounts = await prisma.order.groupBy({
            by: ['status'],
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate
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
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const sourceCounts = await prisma.order.groupBy({
            by: ['type'],
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate
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
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999); 
        const orderItems = await prisma.orderItem.findMany({
            where: {
                order: {
                    createdAt: {
                        gte: fromDate,
                        lte: toDate,
                    },
                    status: { in: ['DELIVERED', 'PARTIALLY_DELIVERED'] },
                },
            },
            include: {
                product: {
                    select: { name: true },
                },
            },
        });

        const productStats = {};
        for (const item of orderItems) {
            if (!productStats[item.productId]) {
                productStats[item.productId] = {
                    productId: item.productId,
                    productName: item.product.name,
                    totalOrders: 0,
                    totalRevenue: 0,
                };
            }
            productStats[item.productId].totalOrders += item.quantity;
            productStats[item.productId].totalRevenue += item.quantity * item.unitPrice;
        }

        const result = Object.values(productStats)
            .sort((a, b) => b.totalOrders - a.totalOrders)
            .slice(0, 3); 

        res.status(200).json(result);
    } catch (err) {
        console.error("Error fetching top selling items:", err);
        res.status(500).json({ message: "Failed to fetch top selling items", error: err.message });
    }
};


export const getPeakTimeSlots = async (req, res, next) => {
    const { from, to } = req.body;

    if (!from || !to) {
        return res.status(400).json({ message: "from and to dates are required" });
    }

    try {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const slotCounts = await prisma.order.groupBy({
            by: ['deliverySlot'],
            where: {
                createdAt: {
                    gte: fromDate,
                    lte: toDate
                },
                deliverySlot: { not: null }
            },
            _count: { id: true },
            orderBy: {
                _count: {
                    id: 'desc'
                }
            }
        });

        const result = slotCounts.map(slot => ({
            timeSlot: slot.deliverySlot,
            displayName: formatSlotForDisplay(slot.deliverySlot),
            orderCount: slot._count.id || 0
        }));

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
        phone: true,
        aadharUrl: true,
        panUrl: true,
        createdAt: true
      }
    });
    res.status(200).json(pendingAdmins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch pending admin verifications', error: err.message });
  }
};

export const verifyAdmin = async (req, res, next) => {
  const { adminId } = req.params;
  const { outletIds } = req.body; // Expect an array of outletIds

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      select: { isVerified: true },
    });
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (admin.isVerified) {
      return res.status(400).json({ message: 'Admin is already verified' });
    }

    if (!outletIds || !Array.isArray(outletIds) || outletIds.length === 0) {
      return res.status(400).json({ message: 'At least one outletId is required for verification' });
    }

    // Validate that all outletIds exist and are active
    const validOutlets = await prisma.outlet.findMany({
      where: { id: { in: outletIds }, isActive: true },
    });

    if (validOutlets.length !== outletIds.length) {
      return res.status(400).json({ message: 'One or more outlets are invalid or inactive' });
    }

    // Update admin to verified status
    const updatedAdmin = await prisma.admin.update({
      where: { id: Number(adminId) },
      data: { isVerified: true },
      select: { id: true, name: true, email: true },
    });

    // Create AdminOutlet relations for each outletId
    const adminOutletCreates = outletIds.map(outletId => ({
      adminId: Number(adminId),
      outletId: outletId,
    }));

    await prisma.adminOutlet.createMany({
      data: adminOutletCreates,
    });

    // Define default permission types using AdminPermissionType enum
    const defaultPermissions = [
      'ORDER_MANAGEMENT',
      'STAFF_MANAGEMENT',
      'INVENTORY_MANAGEMENT',
      'EXPENDITURE_MANAGEMENT',
      'WALLET_MANAGEMENT',
      'CUSTOMER_MANAGEMENT',
      'TICKET_MANAGEMENT',
      'NOTIFICATIONS_MANAGEMENT',
      'PRODUCT_MANAGEMENT',
      'APP_MANAGEMENT',
      'REPORTS_ANALYTICS',
      'SETTINGS',
      'ONBOARDING',
      'ADMIN_MANAGEMENT',
    ];

    // Create permissions with isGranted: false for each AdminOutlet
    const adminOutlets = await prisma.adminOutlet.findMany({
      where: { adminId: Number(adminId) },
    });

    const permissionCreates = adminOutlets.flatMap(adminOutlet =>
      defaultPermissions.map(type => ({
        adminOutletId: adminOutlet.id,
        type,
        isGranted: false,
      }))
    );

    await prisma.adminPermission.createMany({
      data: permissionCreates,
      skipDuplicates: true,
    });

    res.status(200).json({
      message: 'Admin verified successfully',
      admin: { id: updatedAdmin.id, name: updatedAdmin.name, email: updatedAdmin.email, outletIds },
    });
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
        outlets: {
          select: {
            outletId: true
          }
        }
      },
    });
    res.status(200).json(verifiedAdmins);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch verified admins', error: err.message });
  }
};

export const getAdminDetails = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const id = parseInt(adminId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        isVerified: true,
        outlets: {
          select: {
            outletId: true,
            outlet: {
              select: {
                name: true,
                address: true,
              },
            },
            permissions: {
              select: {
                type: true,
                isGranted: true,
              },
            },
          },
        },
      },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    res.status(200).json(admin);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch admin details', error: err.message });
  }
};

export const deleteAdmin = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    const id = parseInt(adminId, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid admin ID' });
    }

    const admin = await prisma.admin.findUnique({
      where: { id },
    });

    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }

    if (req.user.role === 'SUPERADMIN' && req.user.id === id) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    await prisma.admin.delete({
      where: { id },
    });

    res.status(200).json({ message: 'Admin deleted successfully' });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.status(500).json({ message: 'Failed to delete admin', error: err.message });
  }
};

export const mapOutletsToAdmin = async (req, res, next) => {
  const { adminId, outletIds } = req.body;

  if (!adminId || !outletIds || !Array.isArray(outletIds) || outletIds.length === 0) {
    return res.status(400).json({ message: "adminId and a non-empty array of outletIds are required" });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      include: { outlets: true },
    });

    if (!admin || !admin.isVerified) {
      return res.status(404).json({ message: "Admin not found or not verified" });
    }

    const validOutlets = await prisma.outlet.findMany({
      where: { id: { in: outletIds }, isActive: true },
    });

    if (validOutlets.length !== outletIds.length) {
      return res.status(400).json({ message: "One or more outlets are invalid or inactive" });
    }

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
  const { adminId, permissions } = req.body;

  console.log('Received adminId:', adminId);
  console.log('Received permissions:', JSON.stringify(permissions, null, 2));

  if (!adminId || !permissions || typeof permissions !== 'object' || Object.keys(permissions).length === 0) {
    return res.status(400).json({ message: "adminId and a non-empty permissions object are required" });
  }

  try {
    const admin = await prisma.admin.findUnique({
      where: { id: Number(adminId) },
      include: { outlets: true },
    });

    if (!admin || !admin.isVerified) {
      return res.status(404).json({ message: "Admin not found or not verified" });
    }

    const adminOutletIds = admin.outlets.map(outlet => outlet.outletId);
    const requestedOutletIds = Object.keys(permissions).map(id => Number(id));

    const invalidOutlets = requestedOutletIds.filter(id => !adminOutletIds.includes(id));
    if (invalidOutlets.length > 0) {
      return res.status(400).json({ message: `Outlets ${invalidOutlets.join(', ')} are not mapped to this admin` });
    }

    // Process permissions for each outlet separately to avoid transaction timeouts
    for (const [outletId, perms] of Object.entries(permissions)) {
      const numOutletId = Number(outletId);

      // Find the AdminOutlet record
      const adminOutlet = await prisma.adminOutlet.findUnique({
        where: {
          adminId_outletId: {
            adminId: Number(adminId),
            outletId: numOutletId
          }
        },
      });

      if (!adminOutlet) {
        return res.status(400).json({ message: `Outlet ${outletId} is not mapped to this admin` });
      }

      console.log(`Processing ${perms.length} permissions for outlet ${outletId} (adminOutletId: ${adminOutlet.id})`);

      // Get all existing permissions for this outlet
      const existingPermissions = await prisma.adminPermission.findMany({
        where: {
          adminOutletId: adminOutlet.id,
        },
      });

      // Create a map for quick lookup
      const existingPermMap = {};
      existingPermissions.forEach(perm => {
        existingPermMap[perm.type] = perm;
      });

      // Process each permission
      for (const perm of perms) {
        if (!perm.type) {
          console.error('Permission missing type:', perm);
          continue;
        }

        try {
          const existingPerm = existingPermMap[perm.type];

          if (existingPerm) {
            // Update existing permission if the value is different
            if (existingPerm.isGranted !== Boolean(perm.isGranted)) {
              await prisma.adminPermission.update({
                where: { id: existingPerm.id },
                data: { isGranted: Boolean(perm.isGranted) },
              });
              console.log(`Updated permission: ${perm.type} = ${Boolean(perm.isGranted)}`);
            } else {
              console.log(`Permission ${perm.type} already has correct value: ${Boolean(perm.isGranted)}`);
            }
          } else {
            // Create new permission
            await prisma.adminPermission.create({
              data: {
                adminOutletId: adminOutlet.id,
                type: perm.type,
                isGranted: Boolean(perm.isGranted),
              },
            });
            console.log(`Created permission: ${perm.type} = ${Boolean(perm.isGranted)}`);
          }
        } catch (permError) {
          console.error('Error processing permission:', perm, permError);
          continue;
        }
      }
    }

    const updatedPermissions = {};
    for (const outletId of requestedOutletIds) {
      const adminOutlet = await prisma.adminOutlet.findUnique({
        where: {
          adminId_outletId: {
            adminId: Number(adminId),
            outletId
          }
        },
      });

      if (adminOutlet) {
        const perms = await prisma.adminPermission.findMany({
          where: { adminOutletId: adminOutlet.id },
          select: {
            type: true,
            isGranted: true,
          },
        });
        updatedPermissions[outletId] = perms;
      }
    }

    console.log('Successfully updated all permissions');

    res.status(200).json({
      message: "Permissions assigned successfully",
      adminId,
      permissions: updatedPermissions,
    });
  } catch (err) {
    console.error('Error in assignAdminPermissions:', err);
    res.status(500).json({ message: "Failed to assign permissions", error: err.message });
  }
};

export const verifyStaff = async (req, res, next) => {
  const { userId } = req.params;
  const { outletId, staffRole } = req.body;

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

    const updatedUser = await prisma.user.update({
      where: { id: Number(userId) },
      data: {
        isVerified: true,
        outletId: Number(outletId),
      },
      include: { staffInfo: true },
    });

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

    const defaultPermissions = [
      'BILLING',
      'PRODUCT_INSIGHTS',
      'REPORTS',
      'INVENTORY',
    ];

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
        outletId: true,
        staffInfo: {
          select: {
            aadharUrl: true,
            panUrl: true,
          }
        }
      },
    });
    res.status(200).json(unverifiedStaff);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch unverified staff', error: err.message });
  }
};


export const getVerifiedStaff = async (req, res, next) => {
  try {
    const verifiedStaff = await prisma.user.findMany({
      where: {
        role: 'STAFF',
        isVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        createdAt: true,
        outletId: true,
        staffInfo: {
          select: {
            id: true,
            staffRole: true,
          },
        },
      },
    });
    res.status(200).json(verifiedStaff);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch verified staff', error: err.message });
  }
};

export const getLowStockNotifications = async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { isRead: false },
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { name: true } },
        outlet: { select: { name: true } },
      },
    });
    res.status(200).json({ notifications });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch low-stock notifications', error: err.message });
  }
};