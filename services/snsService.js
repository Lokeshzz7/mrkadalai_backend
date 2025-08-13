import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const sns = new AWS.SNS();

class SNSService {
  constructor() {
    this.platformApplicationArn = process.env.AWS_SNS_PLATFORM_APPLICATION_ARN;
  }

  // Create platform endpoint for a device token
  async createPlatformEndpoint(deviceToken, platform = 'android') {
    try {
      const params = {
        PlatformApplicationArn: this.platformApplicationArn,
        Token: deviceToken,
        CustomUserData: platform
      };

      const result = await sns.createPlatformEndpoint(params).promise();
      return result.EndpointArn;
    } catch (error) {
      console.error('Error creating platform endpoint:', error);
      throw error;
    }
  }

  // Send push notification to a specific device
  async sendPushNotification(endpointArn, title, message, data = {}) {
    try {
      const payload = {
        default: message,
        GCM: JSON.stringify({
          data: {
            title,
            message,
            ...data
          },
          notification: {
            title,
            body: message,
            sound: 'default'
          }
        }),
        APNS: JSON.stringify({
          aps: {
            alert: {
              title,
              body: message
            },
            sound: 'default',
            badge: 1
          },
          data
        })
      };

      const params = {
        Message: JSON.stringify(payload),
        MessageStructure: 'json',
        TargetArn: endpointArn
      };

      const result = await sns.publish(params).promise();
      return result;
    } catch (error) {
      console.error('Error sending push notification:', error);
      throw error;
    }
  }

  // Send push notification to multiple devices
  async sendBulkPushNotifications(deviceTokens, title, message, data = {}) {
    try {
      const promises = deviceTokens.map(async (deviceToken) => {
        try {
          const endpointArn = await this.createPlatformEndpoint(deviceToken);
          return await this.sendPushNotification(endpointArn, title, message, data);
        } catch (error) {
          console.error(`Error sending to device ${deviceToken}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(promises);
      return results.filter(result => result.status === 'fulfilled' && result.value);
    } catch (error) {
      console.error('Error sending bulk push notifications:', error);
      throw error;
    }
  }

  // Delete platform endpoint
  async deletePlatformEndpoint(endpointArn) {
    try {
      const params = {
        EndpointArn: endpointArn
      };

      await sns.deleteEndpoint(params).promise();
    } catch (error) {
      console.error('Error deleting platform endpoint:', error);
      throw error;
    }
  }
}

export default new SNSService();
