import { supabase } from "../../../config/supabaseClient.js";
import { getIO } from "../../../sockets/chatHandler.js";

export const createCommunication = async (req, res) => {
  const payload = req.body.data || req.body;

  try {
    // Map legacy payload (firstPerson, title) to current schema (sender_id, message)
    const dbPayload = {
      sender_id: payload.firstPerson || payload.sender_id,
      message: payload.title || payload.message,
      type: payload.type,
      // For broadcasts/posts, receiver_id might be null or handled differently
      receiver_id: payload.receiver_id || null
    };

    // 1️⃣ Insert Chat / Communication
    const { data: chat, error: insertError } = await supabase
      .from("communication")
      .insert([dbPayload])
      .select();

    if (insertError || !chat || chat.length === 0) {
      console.error("Communication Insert Error:", insertError, "Payload:", dbPayload);
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Could not send",
      });
    }

    // Emit live chat socket event if this is a one-on-one message
    if (dbPayload.receiver_id && dbPayload.sender_id) {
      try {
        const io = getIO();
        const room = [dbPayload.sender_id, dbPayload.receiver_id].sort().join('_');
        io.to(room).to(dbPayload.sender_id).to(dbPayload.receiver_id).to("admin_monitor").emit("receive_message", chat[0]);
      } catch (socketErr) {
        console.error("Socket error during API createCommunication:", socketErr);
      }
    }

    // 2️⃣ Get Receiver IDs from data.secondPerson
    let receiverIds = Array.isArray(payload.secondPerson)
      ? payload.secondPerson
      : [];

    // Never send notifications to the sender
    receiverIds = receiverIds.filter(id => id !== dbPayload.sender_id);

    if (receiverIds.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from("user")
        .select("id")
        .in("id", receiverIds);

      if (!usersError && users) {
        // 3️⃣ Update Each Receiver's notifications
        const notificationInserts = users.map(user => ({
            user_id: user.id,
            title: "New Message",
            message: `You got a new ${payload?.type}`,
            type: payload?.type || "communication",
            is_read: false
        }));

        await supabase.from("notifications").insert(notificationInserts);

        // 4️⃣ Send Push Notifications to Receivers
        try {
          const { FCMService } = await import("../../../services/fcmService.js");
          const userIds = users.map(user => user.id);
          const title = "New Message";
          const body = payload.message || `You got a new ${payload?.type}`;
          
          let senderName = "User";
          try {
            const { data: sData } = await supabase.from("user").select("name").eq("id", dbPayload.sender_id).single();
            if (sData && sData.name) senderName = sData.name;
          } catch (e) {}

          const routeData = {
            routeScreen: "ChatRoomScreen",
            routeParams: {
              chatId: dbPayload.sender_id, chatName: senderName,
              teacherId: dbPayload.sender_id, teacherName: senderName
            }
          };

          await FCMService.sendToUsers(userIds, title, body, {
             type: payload?.type || "live_chat",
             sender_id: dbPayload.sender_id,
             routeScreen: routeData.routeScreen,
             routeParams: JSON.stringify(routeData.routeParams)
          });
        } catch (fcmError) {
          console.error("Failed to send FCM push for chat:", fcmError);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Successfully sent",
      data: chat[0],
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const getCommunication = async (req, res) => {
  const { type } = req.params;
  try {
    const { data: chat, error } = await supabase
      .from("communication")
      .select("*")
      .eq("type", type);

    if (error) throw error;

    if (chat) {
      return res.status(200).json({
        success: true,
        message: "Successfully get",
        chats: chat,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not get",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error Occured: ${e.message}`,
    });
  }
};