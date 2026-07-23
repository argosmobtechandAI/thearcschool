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
    
    // Fetch all admin/principal user IDs to group admin desk communications
    const { data: adminUsers } = await supabase
      .from("user")
      .select("id, type, name")
      .or("type.eq.admin,type.eq.principal,type.eq.super_admin,name.eq.System Admin");
    const adminIds = new Set(adminUsers ? adminUsers.map(u => u.id) : []);

    const isOtherAdmin = adminIds.has(userId);
    const isCurrentAdmin = adminIds.has(currentUserId);

    const { data: chats, error } = await supabase
      .from("communication")
      .select("*")
      .eq("type", "live_chat")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId},sender_id.is.null`)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Filter down to messages between these two entities, correctly accounting for admin desk users
    const filteredChats = chats.filter(chat => {
      if (isOtherAdmin) {
        const isFromCurrentToAdmin = chat.sender_id === currentUserId && (!chat.receiver_id || adminIds.has(chat.receiver_id));
        const isFromAdminToCurrent = (!chat.sender_id || adminIds.has(chat.sender_id)) && chat.receiver_id === currentUserId;
        return isFromCurrentToAdmin || isFromAdminToCurrent;
      } else if (isCurrentAdmin) {
        const isFromAdminToUser = (!chat.sender_id || adminIds.has(chat.sender_id)) && chat.receiver_id === userId;
        const isFromUserToAdmin = chat.sender_id === userId && (!chat.receiver_id || adminIds.has(chat.receiver_id));
        return isFromAdminToUser || isFromUserToAdmin;
      } else {
        const isSenderCurrent = (chat.sender_id === currentUserId || !chat.sender_id) && chat.receiver_id === userId;
        const isSenderOther = (chat.sender_id === userId || !chat.sender_id) && (chat.receiver_id === currentUserId || !chat.receiver_id);
        return isSenderCurrent || isSenderOther;
      }
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
    const currentUserId = req.user?.id;
    const currentUserType = req.user?.type;

    let teachersQuery = supabase
      .from("user")
      .select("id, name, email, type, avatar_url")
      .eq("type", "teacher");

    if (currentUserType === "student" || currentUserType === "parent") {
      let studentIds = [];

      if (currentUserType === "parent") {
        // Find connected students
        const [connections1, connections2] = await Promise.all([
          supabase.from("user_connections").select("student_id").eq("parent_id", currentUserId),
          supabase.from("student_parents").select("student_id").eq("parent_id", currentUserId)
        ]);

        const sIds = new Set();
        if (connections1.data) connections1.data.forEach(c => sIds.add(c.student_id));
        if (connections2.data) connections2.data.forEach(c => sIds.add(c.student_id));
        studentIds = Array.from(sIds);
      } else {
        studentIds = [currentUserId];
      }

      if (studentIds.length > 0) {
        // Fetch classes for these students
        const { data: classMappings, error: classErr } = await supabase
          .from("class_students")
          .select("class_id")
          .in("student_id", studentIds);

        if (classErr) throw classErr;

        const classIds = (classMappings || []).map(m => m.class_id).filter(Boolean);

        if (classIds.length > 0) {
          // Fetch teachers teaching these classes
          const [subjectTeachersRes, classTeachersRes] = await Promise.all([
            supabase.from("subject_teachers").select("teacher_id").in("class_id", classIds),
            supabase.from("class_teachers").select("teacher_id").in("class_id", classIds)
          ]);

          const teacherIds = new Set();
          if (subjectTeachersRes.data) {
            subjectTeachersRes.data.forEach(st => {
              if (st.teacher_id) teacherIds.add(st.teacher_id);
            });
          }
          if (classTeachersRes.data) {
            classTeachersRes.data.forEach(ct => {
              if (ct.teacher_id) teacherIds.add(ct.teacher_id);
            });
          }

          const teacherIdList = Array.from(teacherIds);
          if (teacherIdList.length > 0) {
            teachersQuery = teachersQuery.in("id", teacherIdList);
          } else {
            return res.status(200).json({
              success: true,
              teachers: []
            });
          }
        } else {
          return res.status(200).json({
            success: true,
            teachers: []
          });
        }
      } else {
        return res.status(200).json({
          success: true,
          teachers: []
        });
      }
    }

    const { data: teachers, error } = await teachersQuery;
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
    const { data: adminUsers } = await supabase
      .from("user")
      .select("id, name, email, type")
      .or("type.eq.admin,type.eq.principal,type.eq.super_admin,name.eq.System Admin")
      .limit(1);

    const principal = adminUsers && adminUsers.length > 0 ? adminUsers[0] : null;

    return res.status(200).json({
      success: true,
      principal: principal ? { ...principal, name: "System Admin" } : { id: "admin", name: "System Admin", type: "admin" }
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
    // Fetch all admin/principal user IDs to group admin desk entries
    const { data: adminUsers } = await supabase
      .from("user")
      .select("id, type, name")
      .or("type.eq.admin,type.eq.principal,type.eq.super_admin,name.eq.System Admin");
    const adminIds = new Set(adminUsers ? adminUsers.map(u => u.id) : []);

    const { data: chats, error } = await supabase
      .from("communication")
      .select("sender_id, receiver_id, message, created_at")
      .eq("type", "live_chat")
      .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId},sender_id.is.null`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const userMap = new Map();
    const userIdsToFetch = new Set();
    let hasAdminThread = false;

    for (const chat of chats) {
      const otherId = chat.sender_id === currentUserId ? chat.receiver_id : chat.sender_id;
      const isOtherAdmin = !otherId || adminIds.has(otherId);

      if (isOtherAdmin) {
        if (!hasAdminThread) {
          hasAdminThread = true;
          const primaryAdminId = Array.from(adminIds)[0] || otherId || "admin";
          const isUnread = chat.sender_id !== currentUserId;
          userMap.set("ADMIN_DESK", {
            id: primaryAdminId,
            name: "System Admin",
            role: "admin",
            lastMessage: chat.message,
            time: chat.created_at,
            unread: isUnread ? 1 : 0
          });
        }
      } else {
        if (!userMap.has(otherId)) {
          const isUnread = chat.sender_id !== currentUserId;
          userMap.set(otherId, {
            id: otherId,
            lastMessage: chat.message,
            time: chat.created_at,
            unread: isUnread ? 1 : 0
          });
          userIdsToFetch.add(otherId);
        }
      }
    }

    if (userIdsToFetch.size > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("user")
        .select("id, name, type")
        .in("id", Array.from(userIdsToFetch));

      if (!usersError && usersData) {
        for (const u of usersData) {
          const isAdminUser = u.type === 'admin' || u.type === 'principal' || u.type === 'super_admin' || u.name === 'System Admin';

          if (isAdminUser) {
            const orphanThread = userMap.get(u.id);
            userMap.delete(u.id);

            if (!userMap.has("ADMIN_DESK")) {
              userMap.set("ADMIN_DESK", {
                id: u.id,
                name: "System Admin",
                role: "admin",
                lastMessage: orphanThread?.lastMessage || "",
                time: orphanThread?.time || new Date().toISOString(),
                unread: 0
              });
            } else {
              const adminThread = userMap.get("ADMIN_DESK");
              if (orphanThread && new Date(orphanThread.time) > new Date(adminThread.time)) {
                adminThread.lastMessage = orphanThread.lastMessage;
                adminThread.time = orphanThread.time;
              }
            }
          } else if (userMap.has(u.id)) {
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
