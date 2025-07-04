import prisma from "../../prisma/client.js";


export const editProfile = async (req, res) => {
  const { name, phone, email, bio, yearOfStudy, degree } = req.body;
  const userId = req.user.id;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerInfo: true }
    });

    if (!existingUser || !existingUser.customerInfo) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        email,
        customerInfo: {
          update: {
            bio,
            yearOfStudy,
            degree,
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

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerInfo: true,
      },
    });

    if (!user || !user.customerInfo) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      bio: user.customerInfo.bio,
      yearOfStudy: user.customerInfo.yearOfStudy,
      degree: user.customerInfo.degree,
      // add other fields as needed
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};