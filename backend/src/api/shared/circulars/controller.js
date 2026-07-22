import { supabase } from "../../../config/supabaseClient.js";
import { FCMService } from "../../../services/fcmService.js";
import fs from "fs";
import { resolveLocalPath } from "../upload/deleteController.js";

// Upload file — local dev saves to uploads/circular/, VPS saves to /var/www/arcschool/uploads/circular/
export const uploadCircularFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const isVPS = fs.existsSync("/var/www") && process.platform === "linux";

    let fileUrl;
    if (isVPS) {
      fileUrl = `https://cdn.arcschool.cloud/circular/${req.file.filename}`;
    } else {
      const protocol = req.protocol;
      const host = req.get("host"); // localhost:3003
      fileUrl = `${protocol}://${host}/uploads/circular/${req.file.filename}`;
    }

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Create a circular and dispatch FCM notifications
export const createCircular = async (req, res) => {
  try {
    const { title, content, attachment_url, target_audience, class_id } = req.body;
    const userId = req.user.id;

    if (!title || !content || !target_audience) {
      return res.status(400).json({ success: false, message: "Title, content, and target audience are required" });
    }

    // Verify the user exists in the public 'user' table (avoids FK violation for
    // Supabase dashboard admins who only exist in auth.users, not in 'user' table)
    const { data: userRow } = await supabase
      .from("user")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    const createdBy = userRow ? userId : null;

    // Insert circular into Supabase
    const { data: circular, error } = await supabase
      .from("circulars")
      .insert({
        title,
        content,
        attachment_url,
        target_audience,
        class_id: target_audience === "class" ? class_id : null,
        created_by: createdBy
      })
      .select()
      .single();

    if (error) throw error;

    // Send FCM Broadcasts / Announcements
    try {
      let targetUserQuery = supabase.from("user").select("id");

      if (target_audience === "teachers") {
        targetUserQuery = targetUserQuery.eq("type", "teacher");
      } else if (target_audience === "class" && class_id) {
        // Query student user ids belonging to the class
        const { data: students } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", class_id);

        const studentIds = (students || []).map(s => s.student_id);
        targetUserQuery = targetUserQuery.in("id", studentIds);
      } else {
        // 'all' audience: send to all teachers, students, parents
        targetUserQuery = targetUserQuery.in("type", ["teacher", "student", "parent"]);
      }

      const { data: users } = await targetUserQuery;

      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);

        // Insert into notifications table
        const dbNotifications = userIds.map(id => ({
          user_id: id,
          title: `New Circular: ${title}`,
          message: `${content.substring(0, 100)}...|||${JSON.stringify({ routeScreen: "Circulars" })}`,
          type: "broadcast",
          is_read: false
        }));

        await supabase.from("notifications").insert(dbNotifications);

        // Dispatch Firebase Push Notification
        await FCMService.sendToUsers(
          userIds,
          `New Circular: ${title}`,
          content.substring(0, 150),
          { routeScreen: "Circulars" }
        );
      }
    } catch (fcmErr) {
      console.error("FCM dispatch failed for circular:", fcmErr);
    }

    return res.status(201).json({ success: true, data: circular });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Get circulars based on the authenticated user role
export const getCirculars = async (req, res) => {
  try {
    const { role, id: userId } = req.user;
    let query = supabase.from("circulars").select("*, creator:created_by(name)");

    if (role === "student" || role === "parent") {
      // Fetch student's class
      const { data: studentClass } = await supabase
        .from("class_students")
        .select("class_id")
        .eq("student_id", userId)
        .maybeSingle();

      const studentClassId = studentClass?.class_id;

      if (studentClassId) {
        query = query.or(`target_audience.eq.all,and(target_audience.eq.class,class_id.eq.${studentClassId})`);
      } else {
        query = query.eq("target_audience", "all");
      }
    } else if (role === "teacher") {
      query = query.or("target_audience.eq.all,target_audience.eq.teachers");
    }
    // Admins and Principals see all circulars

    const { data: circulars, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    return res.status(200).json({ success: true, data: circulars });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Delete circular
export const deleteCircular = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch the circular first so we can delete its attachment from disk
    const { data: circular, error: fetchError } = await supabase
      .from("circulars")
      .select("attachment_url")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Delete the DB record
    const { error } = await supabase.from("circulars").delete().eq("id", id);
    if (error) throw error;

    // Delete the physical file from disk (best-effort, non-blocking)
    if (circular?.attachment_url) {
      try {
        const localPath = resolveLocalPath(circular.attachment_url);
        if (localPath && fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (fileErr) {
        console.warn("[deleteCircular] Could not delete attachment file:", fileErr.message);
      }
    }

    return res.status(200).json({ success: true, message: "Circular deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
