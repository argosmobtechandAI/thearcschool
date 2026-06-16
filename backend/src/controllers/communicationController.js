import { supabase } from "../config/supabaseClient.js";

export const createCommunication = async (req, res) => {
  const { data } = req.body;

  try {
    // 1️⃣ Insert Chat / Communication
    const { data: chat, error: insertError } = await supabase
      .from("communication")
      .insert([data])
      .select();

    if (insertError || !chat || chat.length === 0) {
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Could not send",
      });
    }

    // 2️⃣ Get Receiver IDs from data.secondPerson
    const receiverIds = Array.isArray(data.secondPerson)
      ? data.secondPerson
      : [];

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
            message: `You got a new ${data?.type}`,
            type: data?.type || "communication",
            is_read: false
        }));

        await supabase.from("notifications").insert(notificationInserts);
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