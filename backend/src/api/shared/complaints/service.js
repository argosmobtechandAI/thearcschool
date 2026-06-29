import { supabase } from "../../../config/supabaseClient.js";

export class ComplaintService {
  static async createComplaint(data) {
    try {
      const studentIds = Array.isArray(data.student) ? data.student : (data.student ? [data.student] : []);

      if (studentIds.length === 0) {
        throw new Error("No students provided for complaint");
      }

      // Create complaint record for each student
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

      if (insertError) throw insertError;

      // Notify Students
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

      // Notify Principals
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

      return complaints[0];
    } catch (error) {
      console.error("Error creating complaint:", error);
      throw error;
    }
  }

  static async getComplaints(studentId) {
    try {
      let query = supabase
        .from("complaints")
        .select("*, user:user_id(name)");
        
      if (studentId) {
        query = query.eq("user_id", studentId);
      }
      
      const { data: complaints, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return complaints.map(c => ({
        ...c,
        student: [c.user_id],
        type: c.title
      }));
    } catch (error) {
      console.error("Error getting complaints:", error);
      throw error;
    }
  }

  static async getComplaintById(id) {
    try {
      const { data: complaints, error } = await supabase
        .from("complaints")
        .select("*, user:user_id(name)")
        .eq("id", id);

      if (error) throw error;
      if (!complaints || complaints.length === 0) throw new Error("Complaint not found");

      return complaints.map(c => ({
        ...c,
        student: [c.user_id],
        type: c.title
      }))[0];
    } catch (error) {
      console.error(`Error getting complaint by ID ${id}:`, error);
      throw error;
    }
  }
}
