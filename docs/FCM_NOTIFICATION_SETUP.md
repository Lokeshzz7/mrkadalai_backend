# FCM (Firebase Cloud Messaging) Notification System

This document explains how to set up and test the FCM notification system that replaces AWS SNS.

## 🔧 Setup Requirements

### 1. Firebase Project Setup
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing project
3. Add your Android/iOS app to the project
4. Download the `google-services.json` (Android) or `GoogleService-Info.plist` (iOS)

### 2. Get FCM Server Key
1. In Firebase Console, go to **Project Settings**
2. Go to **Cloud Messaging** tab
3. Copy the **Server key** (this is your FCM_SERVER_KEY)

### 3. Environment Variables
Add to your `.env` file:
```env
FCM_SERVER_KEY=your_fcm_server_key_here
```

## 📱 Mobile App Integration

### Android (Flutter)
```dart
// Get FCM token
String? token = await FirebaseMessaging.instance.getToken();

// Send token to backend
await http.post(
  Uri.parse('your_api_url/api/customer/notifications/register-device'),
  headers: {
    'Authorization': 'Bearer $jwtToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'deviceToken': token,
    'platform': 'android'
  }),
);
```

### iOS (Flutter)
```dart
// Get FCM token
String? token = await FirebaseMessaging.instance.getToken();

// Send token to backend
await http.post(
  Uri.parse('your_api_url/api/customer/notifications/register-device'),
  headers: {
    'Authorization': 'Bearer $jwtToken',
    'Content-Type': 'application/json',
  },
  body: jsonEncode({
    'deviceToken': token,
    'platform': 'ios'
  }),
);
```

## 🧪 Testing with Postman

### 1. Check FCM Service Status
**GET** `{{base_url}}/api/superadmin/notifications/fcm-status`

**Headers:**
```
Authorization: Bearer {{superadmin_jwt_token}}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "FCM Service Status",
  "data": {
    "configured": true,
    "serverKey": "Configured",
    "fcmUrl": "https://fcm.googleapis.com/fcm/send"
  }
}
```

### 2. Test Single Device Notification
**POST** `{{base_url}}/api/superadmin/notifications/test-single`

**Headers:**
```
Authorization: Bearer {{superadmin_jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "deviceToken": "your_fcm_device_token_here",
  "title": "Test Notification",
  "message": "This is a test notification from FCM!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Test notification sent",
  "data": {
    "success": true,
    "messageId": "message_id_from_fcm"
  }
}
```

### 3. Send Immediate Notification to Outlet
**POST** `{{base_url}}/api/superadmin/notifications/send-immediate`

**Headers:**
```
Authorization: Bearer {{superadmin_jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Outlet Notification",
  "message": "New order received!",
  "outletId": 1
}
```

### 4. Schedule Notification
**POST** `{{base_url}}/api/superadmin/notifications/schedule`

**Headers:**
```
Authorization: Bearer {{superadmin_jwt_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "title": "Scheduled Notification",
  "message": "This will be sent at scheduled time",
  "priority": "HIGH",
  "scheduledDate": "2024-01-15",
  "scheduledTime": "14:30",
  "outletId": 1
}
```

## 🔍 Troubleshooting

### Common Issues:

1. **"FCM Server Key not configured"**
   - Check if `FCM_SERVER_KEY` is set in `.env`
   - Verify the server key is correct

2. **"Invalid registration token"**
   - Device token is invalid or expired
   - User needs to re-register their device

3. **"NotRegistered" error**
   - App was uninstalled or token is invalid
   - Remove the token from database

4. **"MismatchSenderId" error**
   - Server key doesn't match the app's sender ID
   - Check Firebase project configuration

### Testing with Mock Tokens:
For development, you can use mock tokens to test the API structure:
```json
{
  "deviceToken": "mock_fcm_token_12345",
  "title": "Test",
  "message": "Test message"
}
```

## 📊 FCM vs AWS SNS Comparison

| Feature | FCM | AWS SNS |
|---------|-----|---------|
| Setup Complexity | Simple | Complex |
| Cost | Free tier available | Pay per message |
| Platform Support | Android, iOS, Web | Android, iOS, Web |
| Direct Integration | Yes | No (requires endpoints) |
| Token Management | Automatic | Manual |
| Error Handling | Detailed | Basic |

## 🚀 Benefits of FCM

1. **Simpler Setup**: No AWS account or complex configuration needed
2. **Better Error Handling**: Detailed error messages for debugging
3. **Automatic Token Management**: FCM handles token refresh automatically
4. **Cost Effective**: Generous free tier
5. **Direct Integration**: Works directly with Firebase projects

## 📝 Notes

- FCM tokens are automatically refreshed by Firebase
- Invalid tokens are automatically cleaned up
- Maximum 1000 tokens per bulk request
- Notifications are delivered with high priority by default
- Sound and badge are automatically handled
