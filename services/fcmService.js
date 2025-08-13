import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccount = JSON.parse(
  readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8')
);

class FCMService {
  constructor() {
    // Initialize the Firebase Admin SDK only if it hasn't been already.
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin SDK initialized successfully.');
    }
  }

  /**
   * Sends a push notification to a single device.
   * @param {string} deviceToken - The FCM token of the target device.
   * @param {string} title - The notification title.
   * @param {string} message - The notification body.
   * @param {object} data - Additional data to send with the notification.
   */
  async sendPushNotification(deviceToken, title, message, data = {}) {
    const payload = {
      token: deviceToken,
      notification: {
        title: title,
        body: message,
      },
      data: {
        title: title,
        message: message,
        ...data,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log(`Notification sent successfully to device: ${deviceToken}`, response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error(`Failed to send notification to device: ${deviceToken}`, error);
      return { success: false, error: error.code };
    }
  }

  /**
   * Sends the same push notification to multiple devices.
   * @param {string[]} deviceTokens - An array of FCM device tokens.
   * @param {string} title - The notification title.
   * @param {string} message - The notification body.
   * @param {object} data - Additional data to send with the notification.
   */
  async sendBulkPushNotifications(deviceTokens, title, message, data = {}) {
    if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
      throw new Error('Device tokens array is required and cannot be empty');
    }

    const payload = {
      tokens: deviceTokens,
      notification: {
        title: title,
        body: message,
      },
      data: {
        title: title,
        message: message,
        ...data
      },
    };

    try {
      const response = await admin.messaging().sendMulticast(payload);
      console.log(`Successfully sent notifications to ${response.successCount} of ${deviceTokens.length} devices`);

      if (response.failureCount > 0) {
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            failedTokens.push({
              token: deviceTokens[idx],
              error: resp.error.code
            });
          }
        });
        console.log('List of failed tokens:', failedTokens);
      }
      return response.responses;
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  /**
   * Sends a notification to a specific topic.
   * @param {string} topic - The name of the topic to send to.
   * @param {string} title - The notification title.
   * @param {string} message - The notification body.
   * @param {object} data - Additional data to send with the notification.
   */
  async sendToTopic(topic, title, message, data = {}) {
    const payload = {
      topic: topic,
      notification: {
        title: title,
        body: message,
      },
      data: {
        title: title,
        message: message,
        ...data,
      },
    };

    try {
      const response = await admin.messaging().send(payload);
      console.log(`Topic notification sent successfully to: ${topic}`, response);
      return { success: true, messageId: response };
    } catch (error) {
      console.error(`Failed to send topic notification to: ${topic}`, error);
      return { success: false, error: error.code };
    }
  }

  /**
   * Validates a device token by attempting to send a dry-run notification.
   * @param {string} deviceToken - The FCM token to validate.
   */
  async validateDeviceToken(deviceToken) {
    const message = {
      token: deviceToken
    };
    try {
      // The `validateOnly` flag sends the request for validation without actually delivering the notification.
      await admin.messaging().send(message, true);
      return true;
    } catch (error) {
      console.error('Error validating device token:', error.code);
      return false;
    }
  }

  /**
   * Returns the status of the FCM service connection.
   */
  getServiceStatus() {
    const isConfigured = admin.apps.length > 0;
    return {
      configured: isConfigured,
      projectId: isConfigured ? admin.apps[0]?.options.credential.projectId : 'Not Initialized'
    };
  }
}

export default new FCMService();