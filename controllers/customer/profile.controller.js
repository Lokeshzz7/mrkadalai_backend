import prisma from "../../prisma/client.js";



export const editProfile = async (req, res) => {
  const { customerId, name, phone, email, bio } = req.body;

  try {

    const existingUser = await prisma.user.findUnique({
      where: { id: customerId },
      include: { customerInfo: true }
    });

    if (!existingUser || !existingUser.customerInfo) {
      return res.status(404).json({ message: 'Customer not found' });
    }

  
    const updatedUser = await prisma.user.update({
      where: { id: customerId },
      data: {
        name,
        phone,
        email,
        customerInfo: {
          update: {
            bio,
          },
        },
      },
      include: {
        customerInfo: true,
      },
    });

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Edit profile error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

