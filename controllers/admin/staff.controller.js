import bcrypt from 'bcryptjs';
import prisma from "../../prisma/client.js";

export const outletAddStaff = async (req, res, next) => {
  try {
    const { email, password, name , phone, outletId, staffRole, permissions = [] } = req.body;


    if (!email || !password || !name || !phone || !staffRole || !outletId || !staffRole){
      return res.status(400).json({ message: "Please provide email, password, fullName, and phone." });
    }


    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }


    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        password: hashedPassword,
        outletId,
        role: 'STAFF',
        staffInfo: {
          create: {
            staffRole
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

export const outletStaffPermission = async (req, res, next) => {
  const { permission, grant, staffId } = req.body;

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

export const getOutletStaff = async (req, res, next) => {
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
            outletId: true,
            name : true,
            phone : true
          },
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

export const outletUpdateStaff = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.staffId);
    const { name, email, phone, staffRole } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: 'Invalid staff ID' });
    }

    
    const staffDetails = await prisma.staffDetails.findUnique({
      where: { id: staffId },
      include: { user: true }
    });

    if (!staffDetails) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: staffDetails.user.id },
      data: {
        name: name || staffDetails.user.name,
        email: email || staffDetails.user.email,
        phone: phone || staffDetails.user.phone,
      }
    });

    let updatedStaff = staffDetails;
    if (staffRole) {
      updatedStaff = await prisma.staffDetails.update({
        where: { id: staffId },
        data: { staffRole }
      });
    }

    res.status(200).json({ 
      message: 'Staff updated successfully',
      staff: {
        ...updatedStaff,
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const outletDeleteStaff = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.staffId);

    if (!staffId) {
      return res.status(400).json({ message: 'Invalid staff ID' });
    }

  
    const staffDetails = await prisma.staffDetails.findUnique({
      where: { id: staffId },
      include: { user: true }
    });

    if (!staffDetails) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Delete staff permissions first (due to foreign key constraints)
    await prisma.staffPermission.deleteMany({
      where: { staffId: staffId }
    });

    // Delete staff details
    await prisma.staffDetails.delete({
      where: { id: staffId }
    });

    // Delete the user account
    await prisma.user.delete({
      where: { id: staffDetails.user.id }
    });

    res.status(200).json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getStaffById = async (req, res, next) => {
  try {
    const staffId = parseInt(req.params.staffId);

    if (!staffId) {
      return res.status(400).json({ message: 'Invalid staff ID' });
    }

    const staff = await prisma.staffDetails.findUnique({
      where: { id: staffId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            outletId: true
          }
        },
        permissions: true
      }
    });

    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    res.status(200).json({ staff });
  } catch (error) {
    console.error('Error fetching staff details:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};