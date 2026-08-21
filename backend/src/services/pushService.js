/**
 * MitigatePlus Push Notification Service
 * Integrates with Expo Push Notification Service API (https://exp.host/--/api/v2/push/send)
 * Supports all Expo React Native iOS and Android devices out of the box.
 */

const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken) {
    console.log(`[PUSH NOTICE] No push token registered for target user. Title: '${title}'`);
    return { success: false, reason: 'No push token registered' };
  }

  // Check if token matches standard Expo Push format or if demo mode
  const isDemo = !process.env.EXPO_PUSH_ACCESS_TOKEN || process.env.EXPO_PUSH_ACCESS_TOKEN === 'your_expo_push_access_token_here';

  console.log(`[PUSH SERVICE] Dispatching to Token '${pushToken}' | Title: '${title}' | Body: '${body}' (${isDemo ? 'Demo/Standard Mode' : 'Authenticated Mode'})`);

  try {
    const messagePayload = [{
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
    }];

    const headers = {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    };

    if (process.env.EXPO_PUSH_ACCESS_TOKEN && !isDemo) {
      headers['Authorization'] = `Bearer ${process.env.EXPO_PUSH_ACCESS_TOKEN}`;
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers,
      body: JSON.stringify(messagePayload),
    });

    const result = await response.json();
    console.log(`[PUSH DISPATCH RESULT] Expo Push API Response:`, result);

    return {
      success: response.ok,
      mode: isDemo ? 'demo' : 'live',
      result: result.data || result,
    };
  } catch (error) {
    console.error(`[PUSH SERVICE ERROR] Failed to deliver push notification:`, error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendPushNotification };
