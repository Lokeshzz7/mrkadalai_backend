import prisma from "../../prisma/client.js";
import { uploadImage, deleteImage } from "../../config/s3.js";
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

// Get staff profile
export const getStaffProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                staffInfo: true,
                outlet: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            },
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        res.status(200).json({
            message: "Staff profile fetched successfully",
            profile: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                imageUrl: user.imageUrl,
                designation: user.staffInfo.staffRole,
                outlet: user.outlet
            }
        });
    } catch (error) {
        console.error("Get staff profile error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Update staff profile
export const updateStaffProfile = async (req, res) => {
    try {
        const { name, phone, designation } = req.body;
        const userId = req.user.id;

        if (!name && !phone && !designation && !req.file) {
            return res.status(400).json({ message: "No updates provided" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                staffInfo: true,
                outlet: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            },
        });

        if (!existingUser || !existingUser.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        let imageUrl = existingUser.imageUrl;

        // Handle image upload - replace existing image if new one is provided
        if (req.file) {
            // Delete old image if exists
            if (existingUser.imageUrl) {
                await deleteImage(existingUser.imageUrl);
            }

            // Upload new image
            imageUrl = await uploadImage(req.file.buffer, req.file.originalname);
        }

        // Update user and staff info
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                name: name || existingUser.name,
                phone: phone || existingUser.phone,
                imageUrl,
                staffInfo: {
                    update: {
                        staffRole: designation || existingUser.staffInfo.staffRole,
                    },
                },
            },
            include: {
                staffInfo: true,
                outlet: {
                    select: {
                        id: true,
                        name: true,
                        address: true
                    }
                }
            },
        });

        res.status(200).json({
            message: "Profile updated successfully",
            profile: {
                id: updatedUser.id,
                name: updatedUser.name,
                email: updatedUser.email,
                phone: updatedUser.phone,
                imageUrl: updatedUser.imageUrl,
                designation: updatedUser.staffInfo.staffRole,
                outlet: updatedUser.outlet
            }
        });
    } catch (error) {
        console.error("Update staff profile error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Upload staff profile image
export const uploadStaffImage = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "No image file provided" });
        }

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { imageUrl: true }
        });

        if (!existingUser) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Delete old image if exists
        if (existingUser.imageUrl) {
            await deleteImage(existingUser.imageUrl);
        }

        // Upload new image
        const imageUrl = await uploadImage(req.file.buffer, req.file.originalname);

        // Update user with new image URL
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { imageUrl },
            select: {
                id: true,
                name: true,
                imageUrl: true
            }
        });

        res.status(200).json({
            message: "Image uploaded successfully",
            imageUrl: updatedUser.imageUrl,
            user: updatedUser
        });
    } catch (error) {
        console.error("Upload staff image error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Delete staff profile image
export const deleteStaffImage = async (req, res) => {
    try {
        const userId = req.user.id;

        const existingUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { imageUrl: true }
        });

        if (!existingUser) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (!existingUser.imageUrl) {
            return res.status(400).json({ message: "No image to delete" });
        }

        // Delete image from S3
        await deleteImage(existingUser.imageUrl);

        // Update user to remove image URL
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { imageUrl: null },
            select: {
                id: true,
                name: true,
                imageUrl: true
            }
        });

        res.status(200).json({
            message: "Image deleted successfully",
            user: updatedUser
        });
    } catch (error) {
        console.error("Delete staff image error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};