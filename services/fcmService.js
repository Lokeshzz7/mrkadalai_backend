import admin from 'firebase-admin';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// No default big image. Small icon is controlled by the client app resources.

const resolveServiceAccount = () => {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }

    const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const defaultPaths = [
      configuredPath,
      path.join(__dirname, '../serviceAccountKey.json'),
      path.join(__dirname, '../../mrkadalai-16fdc-firebase-adminsdk-fbsvc-8a9c66a79c.json')
    ].filter(Boolean);

    const fallbackPath = defaultPaths.find((p) => existsSync(p));

    if (!fallbackPath) {
      console.warn('[FCM] service account file not found. Push notifications disabled.');
      return null;
    }

    return JSON.parse(readFileSync(fallbackPath, 'utf8'));
  } catch (error) {
    console.warn('[FCM] Failed to load Firebase service account:', error.message);
    return null;
  }
};

const serviceAccount = resolveServiceAccount();

// FCM data payload values MUST be strings. This helper coerces values.
const stringifyData = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)])
  );

class FCMService {
  constructor() {
    this.enabled = false;

    if (!serviceAccount) {
      console.warn('[FCM] Firebase credentials missing. Service disabled.');
      return;
    }

    // Initialize the Firebase Admin SDK only if it hasn't been already.
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase Admin SDK initialized successfully.');
    }

    this.enabled = true;
  }

  /**
   * Sends a push notification to a single device.
   * @param {string} deviceToken - The FCM token of the target device.
   * @param {string} title - The notification title.
   * @param {string} message - The notification body.
   * @param {object} data - Additional data to send with the notification.
   */
  async sendPushNotification(deviceToken, title, message, data = {}) {
    if (!this.enabled) {
      console.warn('[FCM] sendPushNotification skipped (service disabled).');
      return { success: false, error: 'fcm_disabled' };
    }
    try {
      const messaging = admin.messaging();

      // Prefer modern send API if available
      if (typeof messaging.send === 'function') {
        const dataStringified = stringifyData({ title, message, ...data });

        // Optional customization fields (do not force big image; include only if explicitly provided)
        const imageUrl = data?.imageUrl || data?.image || undefined;
        const tag = data?.tag || data?.collapseKey || undefined;
        const channelId = data?.channelId || undefined;
        const color = data?.color || undefined;
        const icon = data?.icon || undefined;

        const payload = {
          token: deviceToken,
          notification: { title, body: message, ...(imageUrl ? { image: imageUrl } : {}) },
          data: dataStringified,
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              ...(imageUrl ? { image: imageUrl } : {}),
              ...(tag ? { tag } : {}),
              ...(channelId ? { channelId } : {}),
              ...(color ? { color } : {}),
              ...(icon ? { icon } : {})
            }
          },
          apns: {
            headers: {
              ...(tag ? { 'apns-collapse-id': tag } : {})
            },
            fcm_options: {
              ...(imageUrl ? { image: imageUrl } : {})
            },
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                ...(tag ? { 'thread-id': tag } : {})
              }
            }
          }
        };
        const response = await messaging.send(payload);
        console.log(`Notification sent successfully to device: ${deviceToken}`, response);
        return { success: true, messageId: response };
      }

      // Fallback to legacy sendToDevice
      const legacyPayload = {
        notification: { title, body: message },
        data: stringifyData({ title, message, ...data })
      };
      const legacyResp = await messaging.sendToDevice(deviceToken, legacyPayload, { priority: 'high' });
      const first = legacyResp.results?.[0];
      if (first && first.messageId) {
        console.log(`Notification sent successfully to device (legacy): ${deviceToken}`, first.messageId);
        return { success: true, messageId: first.messageId };
      }
      console.error(`Failed to send notification to device (legacy): ${deviceToken}`, first?.error);
      return { success: false, error: first?.error?.code || 'unknown_error' };
    } catch (error) {
      console.error(`Failed to send notification to device: ${deviceToken}`, error);
      return { success: false, error: error.code || 'unknown_error' };
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

     if (!this.enabled) {
      console.warn('[FCM] sendBulkPushNotifications skipped (service disabled).');
      return deviceTokens.map((token) => ({
        deviceToken: token,
        success: false,
        error: 'fcm_disabled'
      }));
    }

    const messaging = admin.messaging();
    const concurrency = 50; // limit concurrent sends to avoid throttling
    const results = [];

    // Build a sender using messaging.send (works in all versions where single send works)
    const makeMessage = (token) => {
      const dataStringified = stringifyData({ title, message, ...data });
      const imageUrl = data?.imageUrl || data?.image || undefined;
      const tag = data?.tag || data?.collapseKey || undefined;
      const channelId = data?.channelId || undefined;
      const color = data?.color || undefined;
      const icon = data?.icon || undefined;

      return {
        token,
        notification: { title, body: message, ...(imageUrl ? { image: imageUrl } : {}) },
        data: dataStringified,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            ...(imageUrl ? { image: imageUrl } : {}),
            ...(tag ? { tag } : {}),
            ...(channelId ? { channelId } : {}),
            ...(color ? { color } : {}),
            ...(icon ? { icon } : {})
          }
        },
        apns: {
          headers: {
            ...(tag ? { 'apns-collapse-id': tag } : {})
          },
          fcm_options: {
            ...(imageUrl ? { image: imageUrl } : {})
          },
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              ...(tag ? { 'thread-id': tag } : {})
            }
          }
        }
      };
    };

    // Process in small batches with Promise.allSettled
    for (let i = 0; i < deviceTokens.length; i += concurrency) {
      const batch = deviceTokens.slice(i, i + concurrency);
      const promises = batch.map(async (token) => {
        try {
          const message = makeMessage(token);
          const resp = await messaging.send(message);
          results.push({ deviceToken: token, success: true, messageId: resp });
        } catch (err) {
          results.push({ deviceToken: token, success: false, error: err?.code || 'unknown_error' });
        }
      });
      await Promise.allSettled(promises);
    }

    return results;
  }

  /**
   * Sends a notification to a specific topic.
   * @param {string} topic - The name of the topic to send to.
   * @param {string} title - The notification title.
   * @param {string} message - The notification body.
   * @param {object} data - Additional data to send with the notification.
   */
  async sendToTopic(topic, title, message, data = {}) {
    if (!this.enabled) {
      console.warn('[FCM] sendToTopic skipped (service disabled).');
      return { success: false, error: 'fcm_disabled' };
    }
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
    if (!this.enabled) {
      console.warn('[FCM] validateDeviceToken skipped (service disabled).');
      return false;
    }
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
    const isConfigured = this.enabled && admin.apps.length > 0;
    return {
      configured: isConfigured,
      projectId: isConfigured ? admin.apps[0]?.options.credential.projectId : 'Not Initialized'
    };
  }
}

export default new FCMService();