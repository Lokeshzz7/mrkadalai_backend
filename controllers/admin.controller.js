import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config/env.js';



export const addOutlets = async(req , res , next) => {
    const { name, address, phone, email } = req.body;

  try {
    if (!name || !address || !email || !phone) {
      return res.status(400).json({ message: "Provide all outlet details" });
    }

    const existingOutlet = await prisma.outlet.findUnique({
      where: { email }
    });

    if (existingOutlet) {
      return res.status(400).json({ message: "Outlet already exists" });
    }


    const outlet = await prisma.outlet.create({
      data: {
        name,
        address,
        phone,
        email
      }
    });

    res.status(201).json({ message: "Outlet created successfully", outlet });
  } catch (error) {
    console.error("Error creating outlet:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const getOutlets = async(req , res , next) => {
    try {
    const outlets = await prisma.outlet.findMany();
    res.json({ outlets });
  } catch (error) {
    console.error("Error fetching outlets:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const outletAddStaff = async(req , res , next) => {
    try {
    const { email, password, fullName, phone, outletId ,staffRole,permissions = [] } = req.body;

   
    if (!email || !password || !fullName || !phone) {
      return res.status(400).json({ message: "Please provide email, password, fullName, and phone." });
    }

    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        outletId,
        role: 'STAFF',
        staffRole,
        staffInfo: {
          create: {
            fullName,
            phone,
          }
        }
      },
      include: {
        staffInfo: true,
      }
    });

    
    if (permissions.length > 0) {
      const permissionCreates = permissions.map(type => ({
        staffId: newUser.staffInfo.id,
        type,
        isGranted: true,
      }));

      await prisma.staffPermission.createMany({
        data: permissionCreates,
      });
    }

    return res.status(201).json({ message: "Staff user created successfully", user: { id: newUser.id, email: newUser.email, role: newUser.role } });
  }
  catch (error) {
    console.error("Error adding staff:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export const outletStaffPermission = async (req , res , next) => {
    const staffId = parseInt(req.params.staffId);
  const { permission, grant } = req.body;

  if (!staffId || !permission || typeof grant !== 'boolean') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const existing = await prisma.staffPermission.findFirst({
      where: {
        staffId,
        type: permission,
      }
    });

    if (existing) {
      
      const updated = await prisma.staffPermission.update({
        where: { id: existing.id },
        data: { isGranted: grant }
      });
      return res.json({ message: `Permission ${grant ? 'granted' : 'revoked'}`, permission: updated });
    } else {
     
      const created = await prisma.staffPermission.create({
        data: {
          staffId,
          type: permission,
          isGranted: grant,
        }
      });
      return res.json({ message: `Permission ${grant ? 'granted' : 'revoked'}`, permission: created });
    }
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export const outletTotalOrders = async(req , res , next) => {
    const { outletId } = req.params;

  try {
    const orders = await prisma.order.findMany({
      where: { outletId: Number(outletId) },
      include: {
        customer: {
          include: {
            user: {
              select: {
                email: true,
                createdAt: true
              }
            },
            phone: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
                price: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = orders.map(order => ({
      orderId: order.id,
      orderTime: order.createdAt,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      customerName: order.customer?.user?.email || 'N/A',
      customerPhone: order.customer?.phone || 'N/A',
      items: order.items.map(item => ({
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.unitPrice * item.quantity
      }))
    }));

    res.status(200).json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch orders", error: err.message });
  }
}

export const getOutletStaff = async (req , res , next) => {
    const outletId = parseInt(req.params.outletId);

  if (!outletId) {
    return res.status(400).json({ message: 'Invalid outlet ID' });
  }

  try {
    const staffs = await prisma.staffDetails.findMany({
      where: {
        user: {
          outletId: outletId,   
          role: 'STAFF'          
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            outletId: true
          }
        },
        permissions: true     
      }
    });

    res.status(200).json({ staffs });
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}