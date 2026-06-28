import { supabase } from "../../../config/supabaseClient.js";
import { FCMService } from "../../../services/fcmService.js";
import fs from "fs";

// Upload file to VPS CDN path
export const uploadCircularFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Check if we are running locally (no /var/www directory on Linux VPS)
    const isVPS = fs.existsSync("/var/www") && process.platform === "linux";
    if (!isVPS) {
      try {
        const formData = new FormData();
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
        formData.append("file", fileBlob, req.file.originalname);

        const vpsResponse = await fetch("https://api.thearcschool.in/api/circulars/upload", {
          method: "POST",
          headers: {
            "Authorization": req.headers.authorization
          },
          body: formData
        });

        // Clean up the local temp file
        try {
          fs.unlinkSync(req.file.path);
        } catch (unlinkErr) { }

        const vpsResult = await vpsResponse.json();

        if (vpsResponse.ok && vpsResult.success) {
          return res.status(200).json(vpsResult);
        } else {
          return res.status(vpsResponse.status).json({
            success: false,
            message: `VPS upload failed: ${vpsResult.message || vpsResponse.statusText}`
          });
        }
      } catch (forwardErr) {
        // Fallback to local URL if forwarding fails (e.g. VPS backend not deployed yet)
        const host = req.get("host");
        const protocol = req.protocol;
        const localUrl = `${protocol}://${host}/uploads/circular/${req.file.filename}`;

        return res.status(200).json({
          success: true,
          url: localUrl,
          fileName: req.file.filename,
          warning: "Failed to forward to VPS, using local dev server fallback"
        });
      }
    }

    // We are running on VPS
    const fileUrl = `https://cdn.thearcschool.in/circular/${req.file.filename}`;

    return res.status(200).json({
      success: true,
      url: fileUrl,
      fileName: req.file.filename
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

    // Insert circular into Supabase
    const { data: circular, error } = await supabase
      .from("circulars")
      .insert({
        title,
        content,
        attachment_url,
        target_audience,
        class_id: target_audience === "class" ? class_id : null,
        created_by: userId
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
    const { error } = await supabase.from("circulars").delete().eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Circular deleted successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
