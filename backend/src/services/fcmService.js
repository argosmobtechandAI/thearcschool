import { isFirebaseInitialized } from '../config/firebaseAdmin.js';
import { getMessaging } from 'firebase-admin/messaging';
import { supabase } from '../config/supabaseClient.js';

export const FCMService = {
  /**
   * Register or update a device token for a user
   */
  async registerToken(userId, fcmToken, deviceType) {
    // Check if token already exists
    const { data: existing } = await supabase
      .from('user_device_tokens')
      .select('id, user_id')
      .eq('fcm_token', fcmToken)
      .single();

    if (existing) {
      if (existing.user_id !== userId) {
        // Update ownership if token changed hands
        await supabase
          .from('user_device_tokens')
          .update({ user_id: userId, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // Just update timestamp
        await supabase
          .from('user_device_tokens')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      }
    } else {
      // Insert new token
      await supabase
        .from('user_device_tokens')
        .insert([{ user_id: userId, fcm_token: fcmToken, device_type: deviceType }]);
    }
  },

  /**
   * Send a notification to specific users
   */
  async sendToUsers(userIds, title, body, data = {}) {
    if (!isFirebaseInitialized()) {
      console.warn('Cannot send notification: Firebase Admin SDK not initialized');
      return;
    }

    try {
      if (!userIds || userIds.length === 0) return;

      // 1. Fetch tokens for these users in chunks of 50 to avoid 414 Request-URI Too Large from Supabase/Nginx
      let tokensData = [];
      const chunkSize = 50;
      for (let i = 0; i < userIds.length; i += chunkSize) {
        const chunk = userIds.slice(i, i + chunkSize);
        const { data: chunkTokens, error } = await supabase
          .from('user_device_tokens')
          .select('fcm_token, user_id')
          .in('user_id', chunk);

        if (!error && chunkTokens) {
          tokensData.push(...chunkTokens);
        }
      }

      if (!tokensData || tokensData.length === 0) return;
      const allTokens = [...new Set(tokensData.map(t => t.fcm_token))];

      // 2. Sanitize data payload
      const sanitizedData = {};
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          const val = data[key];
          if (val !== undefined && val !== null) {
            sanitizedData[key] = typeof val === 'string' ? val : (typeof val === 'object' ? JSON.stringify(val) : String(val));
          }
        });
      }
      sanitizedData.click_action = sanitizedData.click_action || 'FLUTTER_NOTIFICATION_CLICK';

      // 3. Send multicast messages in batches of 500 (FCM limit)
      for (let i = 0; i < allTokens.length; i += 500) {
        const batchTokens = allTokens.slice(i, i + 500);

        const message = {
          notification: {
            title,
            body,
          },
          android: {
            priority: 'high',
            notification: {
              channelId: 'high_importance_channel_v4',
              priority: 'max',
              visibility: 'public',
              defaultSound: true
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default'
              }
            }
          },
          data: sanitizedData,
          tokens: batchTokens,
        };

        const response = await getMessaging().sendEachForMulticast(message);
        console.log(`Successfully sent push notification batch: ${response.successCount} succeeded, ${response.failureCount} failed`);

        if (response.failureCount > 0) {
          const failedTokens = [];
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error?.code;
              console.error(`FCM send failed for token ${batchTokens[idx]}:`, resp.error);
              if (errCode === 'messaging/invalid-registration-token' || 
                  errCode === 'messaging/registration-token-not-registered') {
                failedTokens.push(batchTokens[idx]);
              }
            }
          });

          if (failedTokens.length > 0) {
            await supabase
              .from('user_device_tokens')
              .delete()
              .in('fcm_token', failedTokens);
          }
        }
      }
    } catch (err) {
      console.error("Error sending push notifications:", err);
    }
  }
};
