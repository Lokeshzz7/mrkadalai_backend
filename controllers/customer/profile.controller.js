// controllers/customer/profile.controller.js
import prisma from "../../prisma/client.js";
import { uploadImage } from "../../config/s3.js"; // Adjust path
import multer from "multer";

// Configure multer for file upload
const storage = multer.memoryStorage();
export const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
}).single("image");

export const editProfile = async (req, res) => {
  // Destructure with fallback to handle missing fields
  const { name, phone, email, bio, yearOfStudy, degree } = req.body || {};
  const userId = req.user.id;

  try {
    if (!name && !phone && !email && !bio && !yearOfStudy && !degree && !req.file) {
      return res.status(400).json({ message: "No updates provided" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerInfo: true },
    });

    if (!existingUser || !existingUser.customerInfo) {
      return res.status(404).json({ message: "Customer not found" });
    }

    let imageUrl = existingUser.imageUrl; // Retain existing image if no new one
    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, req.file.originalname);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || existingUser.name,
        phone: phone || existingUser.phone,
        email: email || existingUser.email,
        imageUrl,
        customerInfo: {
          update: {
            bio: bio || existingUser.customerInfo.bio,
            yearOfStudy: yearOfStudy ? parseInt(yearOfStudy) : existingUser.customerInfo.yearOfStudy,
            degree: degree || existingUser.customerInfo.degree,
          },
        },
      },
      include: {
        customerInfo: true,
      },
    });

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        imageUrl: updatedUser.imageUrl,
        bio: updatedUser.customerInfo.bio,
        yearOfStudy: updatedUser.customerInfo.yearOfStudy,
        degree: updatedUser.customerInfo.degree,
      },
    });
  } catch (error) {
    console.error("Edit profile error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
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
      imageUrl: user.imageUrl,
      bio: user.customerInfo.bio,
      yearOfStudy: user.customerInfo.yearOfStudy,
      degree: user.customerInfo.degree,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};