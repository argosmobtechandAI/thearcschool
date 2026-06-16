import { supabase } from "../config/supabaseClient.js";

export const createComplaint = async (req, res) => {
  const { data } = req.body;

  try {
    const studentIds = Array.isArray(data.student) ? data.student : (data.student ? [data.student] : []);

    if (studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No students provided for complaint",
      });
    }

    // 1️⃣ Create a complaint record for each student
    const complaintInserts = studentIds.map(sid => ({
        user_id: sid,
        title: data.type || "Complaint",
        description: data.description || "",
        status: data.status || "pending"
    }));

    const { data: complaints, error: insertError } = await supabase
      .from("complaints")
      .insert(complaintInserts)
      .select();

    if (insertError) {
      return res.status(400).json({
        success: false,
        message: insertError ? insertError.message : "Could not create complaint",
      });
    }

    // 2️⃣ Notify Students
    const notificationInserts = studentIds.map(sid => ({
        user_id: sid,
        title: "New Complaint Issued",
        message: `A complaint has been registered against you on ${data?.type}.`,
        type: "complaint",
        is_read: false
    }));

    if (notificationInserts.length > 0) {
        await supabase.from("notifications").insert(notificationInserts);
    }

    // 3️⃣ Notify Principals
    const { data: principals } = await supabase
      .from("user")
      .select("id")
      .eq("type", "principal");

    if (principals && principals.length > 0) {
        const activityInserts = principals.map(prince => ({
            user_id: prince.id,
            title: "Complaint Created",
            message: `Complaint registered for ${studentIds.length} student(s) under "${data?.type}".`,
            type: "complaint",
            is_read: false
        }));
        
        await supabase.from("activities").insert(activityInserts);
    }

    return res.status(200).json({
      success: true,
      message: "Complaint created successfully",
      data: complaints[0], // Return the first one for backwards compatibility
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occurred: ${e.message}`,
    });
  }
};

export const getComplaint = async (req, res) => {
  try {
    const { data: complaints, error } = await supabase.from("complaints").select("*, user:user_id(name)");

    if (error) throw error;

    if (complaints) {
      // Map to old structure where possible
      const mapped = complaints.map(c => ({
          ...c,
          student: [c.user_id],
          type: c.title
      }));

      return res.status(200).json({
        success: true,
        message: "Complaint get successfully",
        complaint: mapped,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not get complaint",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occured: ${e.message}`,
    });
  }
};

export const getComplaintById = async (req, res) => {
  const { id } = req.params;
  try {
    const { data: complaints, error } = await supabase
      .from("complaints")
      .select("*, user:user_id(name)")
      .eq("id", id);

    if (error) throw error;

    if (complaints && complaints.length > 0) {
      const mapped = complaints.map(c => ({
          ...c,
          student: [c.user_id],
          type: c.title
      }));

      return res.status(200).json({
        success: true,
        message: "Complaint get successfully",
        complaint: mapped,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Could not get complaint",
      });
    }
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: `Error occured: ${e.message}`,
    });
  }
};