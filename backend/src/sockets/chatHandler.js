import { Server } from "socket.io";
import { supabase } from "../config/supabaseClient.js";
import { FCMService } from "../services/fcmService.js";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Authenticate / identify user
    socket.on("identify", async (userId) => {
      socket.userId = userId;
      socket.join(userId); // Join personal room for inbox updates
      
      let userName = "Unknown";
      let userType = "admin";
      try {
        let { data } = await supabase.from("user").select("name, type").eq("id", userId).maybeSingle();
        if (!data) {
          const { data: newRow } = await supabase.from("user").insert([{
            id: userId,
            email: "admin@thearcschool.in",
            name: "System Admin",
            type: "admin"
          }]).select("name, type").maybeSingle();
          data = newRow;
        }

        if (data) {
          if (data.name) userName = data.name;
          if (data.type) userType = data.type;
        }
      } catch (err) {}

      if (['admin', 'principal', 'unknown'].includes(userType) || !userType) {
         socket.join("admin_monitor");
      }

      socket.userName = userName;
      console.log(`Socket ${socket.id} identified as user ${userId} (${userName}, type: ${userType})`);
    });

    // Join a private room between two users
    socket.on("join_chat", ({ senderId, receiverId }) => {
      // Create a deterministic room name by sorting IDs
      const room = [senderId, receiverId].sort().join('_');
      socket.join(room);
      console.log(`Socket ${socket.id} (${socket.userName || 'Unknown'}) joined room ${room}`);
    });

    // Handle sending message
    socket.on("send_message", async (messageData) => {
      const { sender_id, receiver_id, message, type } = messageData;
      const room = [sender_id, receiver_id].sort().join('_');

      try {
        // Check if this is a brand new conversation thread
        const { count } = await supabase
          .from("communication")
          .select('*', { count: 'exact', head: true })
          .eq("type", "live_chat")
          .or(`and(sender_id.eq.${sender_id},receiver_id.eq.${receiver_id}),and(sender_id.eq.${receiver_id},receiver_id.eq.${sender_id})`);

        const isNewChat = count === 0;

        // Validate sender_id exists in public user table to avoid FK violation
        let finalSenderId = sender_id;
        if (finalSenderId) {
          const { data: sRow } = await supabase.from("user").select("id").eq("id", finalSenderId).maybeSingle();
          if (!sRow) {
            try {
              const { data: newRow } = await supabase.from("user").insert([{
                id: finalSenderId,
                email: "admin@thearcschool.in",
                name: socket.userName || "System Admin",
                type: "admin"
              }]).select("id").maybeSingle();
              if (!newRow) finalSenderId = null;
            } catch (e) {
              finalSenderId = null;
            }
          }
        }

        // Save to database
        const payload = {
          sender_id: finalSenderId,
          receiver_id: receiver_id,
          message: message,
          type: type || "live_chat"
        };

        const { data: chat, error } = await supabase
          .from("communication")
          .insert([payload])
          .select();

        if (error) throw error;

        const emitPayload = { ...chat[0], sender_id: sender_id };
        console.log(`About to emit receive_message to room: ${room}, chat:`, emitPayload);
        // Emit to the room, both users' personal rooms (for inbox updates), and admin monitor
        io.to(room).to(sender_id).to(receiver_id).to("admin_monitor").emit("receive_message", emitPayload);

        // Get sender details to encode for deep-linking
        let senderName = "User";
        let senderAvatar = null;
        try {
          const { data: sData } = await supabase.from("user").select("name, avatar").eq("id", sender_id).single();
          if (sData) {
            senderName = sData.name || "User";
            senderAvatar = sData.avatar;
          }
        } catch (e) {}

        const routeData = {
          routeScreen: "ChatRoomScreen", // Will be mapped by mobile app
          routeParams: {
            chatId: sender_id, chatName: senderName, chatAvatar: senderAvatar,
            teacherId: sender_id, teacherName: senderName, teacherAvatar: senderAvatar
          }
        };

        const notificationMessage = message || `You got a new ${payload.type}`;
        const dbMessage = `${notificationMessage}|||${JSON.stringify(routeData)}`;

        // Push notification for the receiver
        await FCMService.sendToUsers(
          [receiver_id],
          "New Message",
          notificationMessage,
          { 
            type: payload.type || 'live_chat', 
            sender_id: sender_id,
            routeScreen: routeData.routeScreen,
            routeParams: JSON.stringify(routeData.routeParams)
          }
        );

        // Insert notification into DB for the receiver
        await supabase.from("notifications").insert([{
            user_id: receiver_id,
            title: "New Message",
            message: dbMessage,
            type: payload.type || "live_chat",
            is_read: false
        }]);

        // If it's a new chat, notify the admins
        if (isNewChat) {
          const { data: admins } = await supabase.from("user").select("id").in("type", ["admin", "principal"]);
          
          if (admins && admins.length > 0) {
             const adminIds = admins
                .map(a => a.id)
                .filter(id => id !== sender_id && id !== receiver_id);
             
             if (adminIds.length > 0) {
                 // Get sender & receiver names for better notification
                 const { data: users } = await supabase.from("user").select("name").in("id", [sender_id, receiver_id]);
                 const userNames = users ? users.map(u => u.name).join(" and ") : "two users";

                 const title = "New System Conversation";
                 const body = `A new chat has started between ${userNames}`;

                 // 1. Send Push
                 await FCMService.sendToUsers(adminIds, title, body, { type: "system_monitor" });

                 // 2. Insert into notifications table so it appears in the History
                 const notificationInserts = adminIds.map(adminId => ({
                     user_id: adminId,
                     title: title,
                     message: body,
                     type: "system_monitor",
                     is_read: false
                 }));
                 await supabase.from("notifications").insert(notificationInserts);
             }
          }
        }
        
        console.log(`Socket ${socket.id} (${socket.userName || 'Unknown'}) sent a message to room ${room}`);
      } catch (err) {
        console.error("Error handling send_message event:", err);
      }
    });

    // Handle typing events
    socket.on("typing_start", ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join('_');
      io.to(room).to("admin_monitor").emit("typing_start", { senderId });
    });

    socket.on("typing_stop", ({ senderId, receiverId }) => {
      const room = [senderId, receiverId].sort().join('_');
      io.to(room).to("admin_monitor").emit("typing_stop", { senderId });
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
