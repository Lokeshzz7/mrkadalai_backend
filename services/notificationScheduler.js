import cron from 'node-cron';
import prisma from '../prisma/client.js';
import fcmService from './fcmService.js';

class NotificationScheduler {
  constructor() {
    this.jobs = new Map();
    this.initializeScheduler();
  }

  // Initialize the scheduler and load existing scheduled notifications
  async initializeScheduler() {
    try {
      console.log('Initializing notification scheduler...');
      
      // Load all unsent scheduled notifications
      const scheduledNotifications = await prisma.scheduledNotification.findMany({
        where: {
          isSent: false,
          scheduledAt: {
            gte: new Date()
          }
        },
        include: {
          outlet: true
        }
      });

      // Schedule each notification
      scheduledNotifications.forEach(notification => {
        this.scheduleNotification(notification);
      });

      console.log(`Loaded ${scheduledNotifications.length} scheduled notifications`);
    } catch (error) {
      console.error('Error initializing notification scheduler:', error);
    }
  }

  // Schedule a notification
  scheduleNotification(notification) {
    const { id, scheduledAt, title, message, outletId } = notification;
    
    // Convert scheduledAt to cron format
    const date = new Date(scheduledAt);
    const cronExpression = this.dateToCron(date);
    
    // Create cron job
    const job = cron.schedule(cronExpression, async () => {
      try {
        await this.sendScheduledNotification(notification);
        this.jobs.delete(id);
      } catch (error) {
        console.error(`Error sending scheduled notification ${id}:`, error);
      }
    }, {
      scheduled: false
    });

    // Store the job reference
    this.jobs.set(id, job);
    
    // Start the job
    job.start();
    
    console.log(`Scheduled notification ${id} for ${scheduledAt}`);
  }

  // Convert date to cron expression
  dateToCron(date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const dayOfWeek = date.getDay(); // 0 = Sunday
    
    return `${minute} ${hour} ${day} ${month} ${dayOfWeek}`;
  }

  // Send a scheduled notification
  async sendScheduledNotification(notification) {
    try {
      const { id, title, message, outletId } = notification;

      // Get all device tokens for customers of this outlet
      const deviceTokens = await prisma.userDeviceToken.findMany({
        where: {
          user: {
            outletId: outletId,
            role: 'CUSTOMER'
          },
          isActive: true
        },
        select: {
          deviceToken: true
        }
      });

      if (deviceTokens.length === 0) {
        console.log(`No device tokens found for outlet ${outletId}`);
        return;
      }

      const tokens = deviceTokens.map(dt => dt.deviceToken);

      // Send push notifications
      await fcmService.sendBulkPushNotifications(tokens, title, message, {
        notificationId: id,
        outletId: outletId,
        type: 'scheduled'
      });

      // Update notification as sent
      await prisma.scheduledNotification.update({
        where: { id },
        data: {
          isSent: true,
          sentAt: new Date()
        }
      });

      console.log(`Sent scheduled notification ${id} to ${tokens.length} devices`);
    } catch (error) {
      console.error('Error sending scheduled notification:', error);
      throw error;
    }
  }

  // Add a new scheduled notification
  async addScheduledNotification(notificationData) {
    try {
      const notification = await prisma.scheduledNotification.create({
        data: notificationData,
        include: {
          outlet: true
        }
      });

      // Schedule the notification if it's in the future
      if (new Date(notification.scheduledAt) > new Date()) {
        this.scheduleNotification(notification);
      }

      return notification;
    } catch (error) {
      console.error('Error adding scheduled notification:', error);
      throw error;
    }
  }

  // Cancel a scheduled notification
  async cancelScheduledNotification(notificationId) {
    try {
      // Stop the cron job if it exists
      const job = this.jobs.get(notificationId);
      if (job) {
        job.stop();
        this.jobs.delete(notificationId);
      }

      // Delete from database
      await prisma.scheduledNotification.delete({
        where: { id: notificationId }
      });

      console.log(`Cancelled scheduled notification ${notificationId}`);
    } catch (error) {
      console.error('Error cancelling scheduled notification:', error);
      throw error;
    }
  }

  // Get all scheduled notifications for an outlet
  async getScheduledNotifications(outletId) {
    try {
      return await prisma.scheduledNotification.findMany({
        where: { outletId },
        orderBy: { scheduledAt: 'asc' }
      });
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      throw error;
    }
  }

  // Clean up old sent notifications (optional)
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      await prisma.scheduledNotification.deleteMany({
        where: {
          isSent: true,
          sentAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up notifications older than ${daysOld} days`);
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }
}

export default new NotificationScheduler();
