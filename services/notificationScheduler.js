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
      const userDeviceTokens = await prisma.userDeviceToken.findMany({
        where: {
          user: {
            outletId: outletId,
            role: 'CUSTOMER'
          },
          isActive: true
        },
        select: {
          deviceToken: true,
          userId: true
        }
      });

      if (userDeviceTokens.length === 0) {
        console.log(`No device tokens found for outlet ${outletId}`);
        // Still mark as sent even if no recipients
        await prisma.scheduledNotification.update({
          where: { id },
          data: {
            isSent: true,
            sentAt: new Date()
          }
        });
        return;
      }

      // Create delivery records for tracking
      const deliveryRecords = userDeviceTokens.map(udt => ({
        scheduledNotificationId: id,
        userId: udt.userId,
        deviceToken: udt.deviceToken,
        status: 'PENDING'
      }));

      await prisma.notificationDelivery.createMany({
        data: deliveryRecords,
        skipDuplicates: true
      });

      const tokens = userDeviceTokens.map(udt => udt.deviceToken);

      // Send push notifications
      const results = await fcmService.sendBulkPushNotifications(tokens, title, message, {
        notificationId: id,
        outletId: outletId,
        type: 'scheduled'
      });

      // Update delivery status based on results
      for (const result of results) {
        const userDeviceToken = userDeviceTokens.find(udt => udt.deviceToken === result.deviceToken);
        if (userDeviceToken) {
          await prisma.notificationDelivery.updateMany({
            where: {
              scheduledNotificationId: id,
              userId: userDeviceToken.userId,
              deviceToken: result.deviceToken
            },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sentAt: result.success ? new Date() : null,
              failureReason: result.success ? null : result.error,
              messageId: result.success ? result.messageId : null
            }
          });
        }
      }

      // Update notification as sent
      await prisma.scheduledNotification.update({
        where: { id },
        data: {
          isSent: true,
          sentAt: new Date()
        }
      });

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;
      
      console.log(`Sent scheduled notification ${id}: ${successCount} successful, ${failureCount} failed out of ${results.length} total`);
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

  // Get delivery statistics for a notification
  async getNotificationDeliveryStats(notificationId) {
    try {
      const stats = await prisma.notificationDelivery.groupBy({
        by: ['status'],
        where: {
          scheduledNotificationId: notificationId
        },
        _count: {
          status: true
        }
      });

      const result = {
        total: 0,
        pending: 0,
        sent: 0,
        failed: 0,
        delivered: 0
      };

      stats.forEach(stat => {
        result.total += stat._count.status;
        result[stat.status.toLowerCase()] = stat._count.status;
      });

      return result;
    } catch (error) {
      console.error('Error getting delivery stats:', error);
      throw error;
    }
  }

  // Get detailed delivery information for a notification
  async getNotificationDeliveries(notificationId, status = null) {
    try {
      const where = { scheduledNotificationId: notificationId };
      if (status) {
        where.status = status;
      }

      return await prisma.notificationDelivery.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting notification deliveries:', error);
      throw error;
    }
  }

  // Retry failed notifications
  async retryFailedNotifications(notificationId) {
    try {
      const failedDeliveries = await prisma.notificationDelivery.findMany({
        where: {
          scheduledNotificationId: notificationId,
          status: 'FAILED'
        },
        include: {
          scheduledNotification: true,
          user: true
        }
      });

      if (failedDeliveries.length === 0) {
        console.log(`No failed deliveries found for notification ${notificationId}`);
        return { retried: 0, successful: 0, failed: 0 };
      }

      const notification = failedDeliveries[0].scheduledNotification;
      const tokens = failedDeliveries.map(fd => fd.deviceToken);

      // Retry sending
      const results = await fcmService.sendBulkPushNotifications(
        tokens, 
        notification.title, 
        notification.message, 
        {
          notificationId: notificationId,
          outletId: notification.outletId,
          type: 'scheduled_retry'
        }
      );

      // Update delivery status
      let successful = 0;
      let failed = 0;

      for (const result of results) {
        const delivery = failedDeliveries.find(fd => fd.deviceToken === result.deviceToken);
        if (delivery) {
          await prisma.notificationDelivery.update({
            where: { id: delivery.id },
            data: {
              status: result.success ? 'SENT' : 'FAILED',
              sentAt: result.success ? new Date() : delivery.sentAt,
              failureReason: result.success ? null : result.error,
              messageId: result.success ? result.messageId : delivery.messageId
            }
          });

          if (result.success) successful++;
          else failed++;
        }
      }

      console.log(`Retried notification ${notificationId}: ${successful} successful, ${failed} failed out of ${failedDeliveries.length} retries`);
      
      return { 
        retried: failedDeliveries.length, 
        successful, 
        failed 
      };
    } catch (error) {
      console.error('Error retrying failed notifications:', error);
      throw error;
    }
  }

  // Clean up old sent notifications (optional)
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      // Delete old notifications (this will cascade delete delivery records)
      const result = await prisma.scheduledNotification.deleteMany({
        where: {
          isSent: true,
          sentAt: {
            lt: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${result.count} notifications older than ${daysOld} days`);
      return result.count;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

export default new NotificationScheduler();
