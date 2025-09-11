import prisma from "../../prisma/client.js";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Change Password
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                message: "Current password, new password, and confirm password are required"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        // Get user with current password
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const saltRounds = 10;
        const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword }
        });

        res.status(200).json({
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Generate 2FA Setup (QR Code)
export const generate2FASetup = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (user.staffInfo.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled" });
        }

        // Generate secret
        const secret = speakeasy.generateSecret({
            name: `MrKadalai Staff (${user.email})`,
            issuer: 'MrKadalai',
            length: 32
        });

        // Generate QR code
        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

        // Store temporary secret (not enabled yet)
        await prisma.staffDetails.update({
            where: { userId: userId },
            data: {
                twoFactorSecret: secret.base32 // Store temporarily
            }
        });

        res.status(200).json({
            message: "2FA setup generated successfully",
            qrCode: qrCodeUrl,
            secret: secret.base32,
            manualEntryKey: secret.base32
        });

    } catch (error) {
        console.error("Generate 2FA setup error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Verify and Enable 2FA
export const enable2FA = async (req, res) => {
    try {
        const { token } = req.body;
        const userId = req.user.id;

        if (!token) {
            return res.status(400).json({ message: "TOTP token is required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (user.staffInfo.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is already enabled" });
        }

        if (!user.staffInfo.twoFactorSecret) {
            return res.status(400).json({ message: "2FA setup not initiated. Please generate QR code first" });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.staffInfo.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps (60 seconds) for clock drift
        });

        if (!verified) {
            return res.status(400).json({ message: "Invalid TOTP token" });
        }

        // Generate backup codes
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }

        // Enable 2FA
        await prisma.staffDetails.update({
            where: { userId: userId },
            data: {
                twoFactorEnabled: true,
                twoFactorBackupCodes: backupCodes,
                twoFactorEnabledAt: new Date()
            }
        });

        res.status(200).json({
            message: "2FA enabled successfully",
            backupCodes: backupCodes
        });

    } catch (error) {
        console.error("Enable 2FA error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Disable 2FA
export const disable2FA = async (req, res) => {
    try {
        const { currentPassword, token } = req.body;
        const userId = req.user.id;

        if (!currentPassword) {
            return res.status(400).json({ message: "Current password is required to disable 2FA" });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (!user.staffInfo.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // If 2FA is enabled, require TOTP token
        if (token) {
            const verified = speakeasy.totp.verify({
                secret: user.staffInfo.twoFactorSecret,
                encoding: 'base32',
                token: token,
                window: 2
            });

            if (!verified) {
                return res.status(400).json({ message: "Invalid TOTP token" });
            }
        } else {
            return res.status(400).json({ message: "TOTP token is required to disable 2FA" });
        }

        // Disable 2FA
        await prisma.staffDetails.update({
            where: { userId: userId },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorBackupCodes: null,
                twoFactorEnabledAt: null
            }
        });

        res.status(200).json({
            message: "2FA disabled successfully"
        });

    } catch (error) {
        console.error("Disable 2FA error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Get 2FA Status
export const get2FAStatus = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        res.status(200).json({
            message: "2FA status fetched successfully",
            twoFactorEnabled: user.staffInfo.twoFactorEnabled,
            twoFactorEnabledAt: user.staffInfo.twoFactorEnabledAt
        });

    } catch (error) {
        console.error("Get 2FA status error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Verify 2FA Token (for login)
export const verify2FAToken = async (req, res) => {
    try {
        const { token, userId } = req.body;

        if (!token || !userId) {
            return res.status(400).json({ message: "Token and userId are required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo || !user.staffInfo.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA not enabled for this user" });
        }

        // Verify the token
        const verified = speakeasy.totp.verify({
            secret: user.staffInfo.twoFactorSecret,
            encoding: 'base32',
            token: token,
            window: 2
        });

        if (!verified) {
            return res.status(400).json({ message: "Invalid TOTP token" });
        }

        res.status(200).json({
            message: "2FA token verified successfully",
            verified: true
        });

    } catch (error) {
        console.error("Verify 2FA token error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};

// Get remaining backup codes count
export const getBackupCodesCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { staffInfo: true }
        });

        if (!user || !user.staffInfo) {
            return res.status(404).json({ message: "Staff not found" });
        }

        if (!user.staffInfo.twoFactorEnabled) {
            return res.status(400).json({ message: "2FA is not enabled" });
        }

        const backupCodes = user.staffInfo.twoFactorBackupCodes || [];

        res.status(200).json({
            message: "Backup codes count fetched successfully",
            remainingCodes: backupCodes.length,
            totalCodes: 10
        });

    } catch (error) {
        console.error("Get backup codes count error:", error);
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
};