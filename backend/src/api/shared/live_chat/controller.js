import { supabase } from "../../../config/supabaseClient.js";

export const getLiveChatHistory = async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?.id; // from protect middleware

  if (!currentUserId || !userId) {
    return res.status(400).json({ success: false, message: "Missing user IDs" });
  }

  try {
    // Communication table has firstPerson (sender) and secondPerson (array of receivers)
    // We want messages where (firstPerson = currentUser AND secondPerson contains userId) 
    // OR (firstPerson = userId AND secondPerson contains currentUser)
    
    // We'll fetch all live_chat messages and filter, or use an OR query.
    // Supabase OR with arrays is a bit tricky, so we can just use a broad OR query.
    const { data: chats, error } = await supabase
      .from("communication")
      .select("*")
      .eq("type", "live_chat")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter down to only messages between these two specific users
    const filteredChats = chats.filter(chat => {
      const isSenderCurrent = chat.sender_id === currentUserId && chat.receiver_id === userId;
      const isSenderOther = chat.sender_id === userId && chat.receiver_id === currentUserId;
      return isSenderCurrent || isSenderOther;
    });

    return res.status(200).json({
      success: true,
      message: "Successfully fetched chat history",
      chats: filteredChats,
    });
  } catch (e) {
    console.error("Error fetching live chat history:", e);
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};

export const getTeachers = async (req, res) => {
  try {
    const { data: teachers, error } = await supabase
      .from("user")
      .select("id, name, email, type")
      .eq("type", "teacher");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      teachers: teachers || []
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
};

export const getStudents = async (req, res) => {
  try {
    const { data: students, error } = await supabase
      .from("user")
      .select("id, name, email, type")
      .eq("type", "student");

    if (error) throw error;

    return res.status(200).json({
      success: true,
      students: students || []
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
};

export const getPrincipal = async (req, res) => {
  try {
    const { data: principal, error } = await supabase
      .from("user")
      .select("id, name, email, type")
      .eq("type", "principal")
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is no rows found

    return res.status(200).json({
      success: true,
      principal: principal || null
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message
    });
  }
};
export const getLiveChatsList = async (req, res) => {
  const currentUserId = req.user?.id;
  if (!currentUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const { data: chats, error } = await supabase
      .from("communication")
      .select("sender_id, receiver_id, message, created_at")
      .eq("type", "live_chat")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // We need to find unique users that the current user has chatted with.
    const userMap = new Map();
    const userIdsToFetch = new Set();

    for (const chat of chats) {
      const otherId = chat.sender_id === currentUserId ? chat.receiver_id : chat.sender_id;
      if (!otherId) continue;
      
      if (!userMap.has(otherId)) {
        userMap.set(otherId, {
          id: otherId,
          lastMessage: chat.message,
          time: chat.created_at,
          unread: 0 // Placeholder
        });
        userIdsToFetch.add(otherId);
      }
    }

    if (userIdsToFetch.size > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("id, name, type")
        .in("id", Array.from(userIdsToFetch));

      if (!usersError && usersData) {
        for (const u of usersData) {
          if (userMap.has(u.id)) {
            const mapped = userMap.get(u.id);
            mapped.name = u.name;
            mapped.role = u.type;
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      chats: Array.from(userMap.values())
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
