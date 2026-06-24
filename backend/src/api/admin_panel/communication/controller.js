import { supabase } from "../../../config/supabaseClient.js";

// System Monitor: Get all unique conversations across the school
export const getSystemMonitorList = async (req, res) => {
  try {
    const { data: chats, error } = await supabase
      .from("communication")
      .select("sender_id, receiver_id, message, created_at, type")
      .eq("type", "live_chat")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Group by unique pairs
    const pairsMap = new Map();
    const userIdsToFetch = new Set();

    for (const chat of chats) {
      if (!chat.sender_id || !chat.receiver_id) continue;
      
      const pairKey = [chat.sender_id, chat.receiver_id].sort().join("_");
      
      if (!pairsMap.has(pairKey)) {
        pairsMap.set(pairKey, {
          id: pairKey, // unique identifier for the conversation thread
          user1_id: chat.sender_id,
          user2_id: chat.receiver_id,
          lastMessage: chat.message,
          time: chat.created_at,
        });
        userIdsToFetch.add(chat.sender_id);
        userIdsToFetch.add(chat.receiver_id);
      }
    }

    // Fetch user details
    const userDict = {};
    if (userIdsToFetch.size > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("id, name, type")
        .in("id", Array.from(userIdsToFetch));

      if (!usersError && usersData) {
        for (const u of usersData) {
          userDict[u.id] = { name: u.name, role: u.type };
        }
      }
    }

    // Attach user details to the pairs and filter out any pairs involving an admin
    const result = Array.from(pairsMap.values()).map(pair => {
      return {
        ...pair,
        user1: userDict[pair.user1_id] || { name: "Unknown", role: "unknown" },
        user2: userDict[pair.user2_id] || { name: "Unknown", role: "unknown" }
      };
    }).filter(pair => 
      pair.user1.role !== 'admin' && pair.user2.role !== 'admin' &&
      pair.user1.role !== 'principal' && pair.user2.role !== 'principal'
    );

    return res.status(200).json({
      success: true,
      chats: result
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

// System Monitor: Get chat history between any two users
export const getSystemMonitorHistory = async (req, res) => {
  const { user1, user2 } = req.params;

  if (!user1 || !user2) {
    return res.status(400).json({ success: false, message: "Missing user IDs" });
  }

  try {
    const { data: chats, error } = await supabase
      .from("communication")
      .select("*")
      .eq("type", "live_chat")
      .or(`and(sender_id.eq.${user1},receiver_id.eq.${user2}),and(sender_id.eq.${user2},receiver_id.eq.${user1})`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: "Successfully fetched chat history",
      chats: chats,
    });
  } catch (e) {
    console.error("Error fetching admin monitor history:", e);
    return res.status(500).json({
      success: false,
      message: `Error Occurred: ${e.message}`,
    });
  }
};
