import { FCMService } from '../../../services/fcmService.js';
import { supabase, supabaseAdmin } from '../../../config/supabaseClient.js';

export const registerToken = async (req, res) => {
  try {
    const { fcm_token, device_type } = req.body;
    const userId = req.user.id;

    if (!fcm_token || !device_type) {
      return res.status(400).json({ success: false, message: 'fcm_token and device_type are required' });
    }

    await FCMService.registerToken(userId, fcm_token, device_type);
    
    return res.status(200).json({ success: true, message: 'Token registered successfully' });
  } catch (error) {
    console.error('Error registering FCM token:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getNotificationHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 50 } = req.query;
    
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;

    return res.status(200).json({ success: true, data, total: count });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const db = supabaseAdmin || supabase;
    const { data, error, count } = await db
      .from('notifications')
      .select('*, user:user_id(name, email, type)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) throw error;

    return res.status(200).json({ success: true, data, total: count });
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const query = supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    
    if (id && id !== 'all') {
      query.eq('id', id);
    }

    const { error } = await query;
    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const sendBroadcast = async (req, res) => {
  try {
    const { title, body, targetAudience, targetUserIds, routeScreen, routeParams } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'Title and body are required' });
    }

    const db = supabaseAdmin || supabase;
    let userQuery = db.from('user').select('id');
    
    if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      userQuery = userQuery.in('id', targetUserIds);
    } else if (targetAudience && targetAudience !== 'all') {
      userQuery = userQuery.eq('type', targetAudience);
    }

    const { data: users, error } = await userQuery;

    if (error) throw error;
    
    if (users && users.length > 0) {
      const userIds = users.map(u => u.id);
      
      let dbMessage = body;
      if (routeScreen) {
        const routeData = { routeScreen };
        if (routeParams) routeData.routeParams = routeParams;
        dbMessage = `${body}|||${JSON.stringify(routeData)}`;
      }

      const notificationInserts = userIds.map(id => ({
        user_id: id,
        title,
        message: dbMessage,
        type: 'broadcast',
        is_read: false
      }));

      const { error: insertError } = await db.from("notifications").insert(notificationInserts);
      
      if (insertError) {
        console.error("Failed to insert notification:", insertError);
        throw new Error("Database insertion failed: " + insertError.message);
      }

      const dataPayload = {
        type: 'broadcast',
        timeSent: new Date().toISOString()
      };

      if (routeScreen) {
        dataPayload.routeScreen = routeScreen;
        if (routeParams) {
          dataPayload.routeParams = JSON.stringify(routeParams);
        }
      }

      await FCMService.sendToUsers(userIds, title, body, dataPayload);
    }

    return res.status(200).json({ success: true, message: `Broadcast sent to ${users?.length || 0} users` });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
