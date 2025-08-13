import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class FCMService {
  constructor() {
    this.serverKey = process.env.FCM_SERVER_KEY;
    this.fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    
    if (!this.serverKey) {
      console.error('FCM_SERVER_KEY is not configured in environment variables');
    }
  }

  // Send push notification to a single device
  async sendPushNotification(deviceToken, title, message, data = {}) {
    try {
      if (!this.serverKey) {
        throw new Error('FCM Server Key not configured');
      }

      const payload = {
        to: deviceToken,
        notification: {
          title: title,
          body: message,
          sound: 'default',
          badge: 1,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        data: {
          title: title,
          message: message,
          ...data
        },
        priority: 'high',
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channel_id: 'default_channel'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await axios.post(this.fcmUrl, payload, {
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success === 1) {
        console.log(`Notification sent successfully to device: ${deviceToken}`);
        return { success: true, messageId: response.data.results[0].message_id };
      } else {
        console.error(`Failed to send notification to device: ${deviceToken}`, response.data);
        return { success: false, error: response.data.results[0].error };
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send push notification to multiple devices
  async sendBulkPushNotifications(deviceTokens, title, message, data = {}) {
    try {
      if (!this.serverKey) {
        throw new Error('FCM Server Key not configured');
      }

      if (!Array.isArray(deviceTokens) || deviceTokens.length === 0) {
        throw new Error('Device tokens array is required and cannot be empty');
      }

      // FCM allows up to 1000 tokens per request
      const maxTokensPerRequest = 1000;
      const results = [];

      // Split tokens into chunks if more than 1000
      for (let i = 0; i < deviceTokens.length; i += maxTokensPerRequest) {
        const tokenChunk = deviceTokens.slice(i, i + maxTokensPerRequest);
        
        const payload = {
          registration_ids: tokenChunk,
          notification: {
            title: title,
            body: message,
            sound: 'default',
            badge: 1,
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
          },
          data: {
            title: title,
            message: message,
            ...data
          },
          priority: 'high',
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channel_id: 'default_channel'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1
              }
            }
          }
        };

        const response = await axios.post(this.fcmUrl, payload, {
          headers: {
            'Authorization': `key=${this.serverKey}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success > 0) {
          console.log(`Successfully sent notifications to ${response.data.success} devices`);
          
          // Process results for each token
          response.data.results.forEach((result, index) => {
            if (result.message_id) {
              results.push({
                deviceToken: tokenChunk[index],
                success: true,
                messageId: result.message_id
              });
            } else if (result.error) {
              results.push({
                deviceToken: tokenChunk[index],
                success: false,
                error: result.error
              });
            }
          });
        } else {
          console.error('Failed to send bulk notifications:', response.data);
          tokenChunk.forEach(token => {
            results.push({
              deviceToken: token,
              success: false,
              error: 'Bulk send failed'
            });
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  // Send notification to a topic (for broadcast messages)
  async sendToTopic(topic, title, message, data = {}) {
    try {
      if (!this.serverKey) {
        throw new Error('FCM Server Key not configured');
      }

      const payload = {
        to: `/topics/${topic}`,
        notification: {
          title: title,
          body: message,
          sound: 'default',
          badge: 1,
          click_action: 'FLUTTER_NOTIFICATION_CLICK'
        },
        data: {
          title: title,
          message: message,
          ...data
        },
        priority: 'high'
      };

      const response = await axios.post(this.fcmUrl, payload, {
        headers: {
          'Authorization': `key=${this.serverKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success === 1) {
        console.log(`Topic notification sent successfully to: ${topic}`);
        return { success: true, messageId: response.data.message_id };
      } else {
        console.error(`Failed to send topic notification to: ${topic}`, response.data);
        return { success: false, error: response.data.error };
      }
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }

  // Validate device token
  async validateDeviceToken(deviceToken) {
    try {
      const result = await this.sendPushNotification(deviceToken, 'Test', 'Test notification');
      return result.success;
    } catch (error) {
      console.error('Error validating device token:', error);
      return false;
    }
  }

  // Get FCM service status
  getServiceStatus() {
    return {
      configured: !!this.serverKey,
      serverKey: this.serverKey ? 'Configured' : 'Not configured',
      fcmUrl: this.fcmUrl
    };
  }
}

export default new FCMService();
