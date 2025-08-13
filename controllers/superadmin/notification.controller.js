import prisma from "../../prisma/client.js";
import notificationScheduler from "../../services/notificationScheduler.js";
import fcmService from "../../services/fcmService.js";

export const createScheduledNotification = async (req, res) => {
  try {
    const { title, message, priority, imageUrl, scheduledDate, scheduledTime, outletId } = req.body;

    if (!title || !message || !scheduledDate || !scheduledTime || !outletId) {
      return res.status(400).json({
        success: false,
        message: "Title, message, scheduled date, scheduled time, and outlet ID are required"
      });
    }

    const scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`);

    // Validate that scheduled time is in the future
    if (scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "Scheduled time must be in the future"
      });
    }

    // Create the scheduled notification
    const notification = await notificationScheduler.addScheduledNotification({
      title,
      message,
      priority: priority || 'MEDIUM',
      imageUrl,
      scheduledAt,
      outletId: parseInt(outletId)
    });

    res.status(201).json({
      success: true,
      message: "Notification scheduled successfully",
      data: notification
    });
  } catch (error) {
    console.error('Error creating scheduled notification:', error);
    res.status(500).json({
      success: false,
      message: "Failed to schedule notification",
      error: error.message
    });
  }
};

// Get all scheduled notifications for an outlet
export const getScheduledNotifications = async (req, res) => {
  try {
    const { outletId } = req.params;

    const notifications = await notificationScheduler.getScheduledNotifications(parseInt(outletId));

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get scheduled notifications",
      error: error.message
    });
  }
};

// Cancel a scheduled notification
export const cancelScheduledNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    await notificationScheduler.cancelScheduledNotification(parseInt(notificationId));

    res.status(200).json({
      success: true,
      message: "Notification cancelled successfully"
    });
  } catch (error) {
    console.error('Error cancelling scheduled notification:', error);
    res.status(500).json({
      success: false,
      message: "Failed to cancel notification",
      error: error.message
    });
  }
};

// Send immediate notification (for testing)
export const sendImmediateNotification = async (req, res) => {
  try {
    const { title, message, outletId } = req.body;

    if (!title || !message || !outletId) {
      return res.status(400).json({
        success: false,
        message: "Title, message, and outlet ID are required"
      });
    }

    // Get device tokens for the outlet
    const deviceTokens = await prisma.userDeviceToken.findMany({
      where: {
        user: {
          outletId: parseInt(outletId),
          role: 'CUSTOMER'
        },
        isActive: true
      },
      select: {
        deviceToken: true
      }
    });

    if (deviceTokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No device tokens found for this outlet"
      });
    }

    const tokens = deviceTokens.map(dt => dt.deviceToken);

    // Send push notifications
    const results = await fcmService.sendBulkPushNotifications(tokens, title, message, {
      outletId: parseInt(outletId),
      type: 'immediate'
    });

    res.status(200).json({
      success: true,
      message: `Notification sent to ${results.length} devices`,
      data: {
        sentCount: results.length,
        totalDevices: tokens.length
      }
    });
  } catch (error) {
    console.error('Error sending immediate notification:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification",
      error: error.message
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const { outletId } = req.params;

    const stats = await prisma.scheduledNotification.groupBy({
      by: ['isSent'],
      where: {
        outletId: parseInt(outletId)
      },
      _count: {
        id: true
      }
    });

    const totalNotifications = await prisma.scheduledNotification.count({
      where: {
        outletId: parseInt(outletId)
      }
    });

    const sentCount = stats.find(s => s.isSent)?._count.id || 0;
    const pendingCount = stats.find(s => !s.isSent)?._count.id || 0;

    res.status(200).json({
      success: true,
      data: {
        total: totalNotifications,
        sent: sentCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Error getting notification stats:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get notification statistics",
      error: error.message
    });
  }
};

// Register device token for push notifications
export const registerDeviceToken = async (req, res) => {
  try {
    const { deviceToken, platform } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!deviceToken || !platform) {
      return res.status(400).json({
        success: false,
        message: "Device token and platform are required"
      });
    }

    // Upsert device token
    const userDeviceToken = await prisma.userDeviceToken.upsert({
      where: {
        userId_deviceToken: {
          userId,
          deviceToken
        }
      },
      update: {
        platform,
        isActive: true,
        updatedAt: new Date()
      },
      create: {
        userId,
        deviceToken,
        platform,
        isActive: true
      }
    });

    res.status(200).json({
      success: true,
      message: "Device token registered successfully",
      data: userDeviceToken
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      message: "Failed to register device token",
      error: error.message
    });
  }
};

// Unregister device token
export const unregisterDeviceToken = async (req, res) => {
  try {
    const { deviceToken } = req.body;
    const userId = req.user.id;

    if (!deviceToken) {
      return res.status(400).json({
        success: false,
        message: "Device token is required"
      });
    }

    await prisma.userDeviceToken.updateMany({
      where: {
        userId,
        deviceToken
      },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.status(200).json({
      success: true,
      message: "Device token unregistered successfully"
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({
      success: false,
      message: "Failed to unregister device token",
      error: error.message
    });
  }
};

// Test FCM service status
export const testFCMService = async (req, res) => {
  try {
    const status = fcmService.getServiceStatus();
    
    res.status(200).json({
      success: true,
      message: "FCM Service Status",
      data: status
    });
  } catch (error) {
    console.error('Error getting FCM service status:', error);
    res.status(500).json({
      success: false,
      message: "Failed to get FCM service status",
      error: error.message
    });
  }
};

// Test single device notification
export const testSingleDeviceNotification = async (req, res) => {
  try {
    const { deviceToken, title, message } = req.body;

    if (!deviceToken || !title || !message) {
      return res.status(400).json({
        success: false,
        message: "Device token, title, and message are required"
      });
    }

    const result = await fcmService.sendPushNotification(deviceToken, title, message, {
      type: 'test',
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: "Test notification sent",
      data: result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send test notification",
      error: error.message
    });
  }
};