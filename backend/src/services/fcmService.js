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
      // 1. Fetch tokens for these users
      const { data: tokensData, error } = await supabase
        .from('user_device_tokens')
        .select('fcm_token, user_id')
        .in('user_id', userIds);

      if (error) throw error;
      if (!tokensData || tokensData.length === 0) return;

      const tokens = tokensData.map(t => t.fcm_token);

      // 2. Save notification to history table
      const historyPayload = userIds.map(uid => ({
        user_id: uid,
        title,
        body,
        data
      }));
      await supabase.from('notifications').insert(historyPayload);

      // 3. Construct message payload
      const message = {
        notification: {
          title,
          body,
        },
        data: {
          ...data,
          // Ensure all data values are strings as required by FCM
          click_action: data.click_action || 'FLUTTER_NOTIFICATION_CLICK', 
        },
        tokens,
      };

      // 4. Send multicast message
      const response = await getMessaging().sendEachForMulticast(message);
      
      console.log(`Successfully sent messages: ${response.successCount}`);
      if (response.failureCount > 0) {
        console.warn(`Failed to send ${response.failureCount} messages`);
        // Optional: Remove invalid tokens here based on response.responses
        const failedTokens = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errCode = resp.error?.code;
            if (errCode === 'messaging/invalid-registration-token' || 
                errCode === 'messaging/registration-token-not-registered') {
              failedTokens.push(tokens[idx]);
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
    } catch (err) {
      console.error('Error sending push notifications:', err);
    }
  }
};
