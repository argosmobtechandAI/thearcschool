import { supabase } from "../../../config/supabaseClient.js";

// --- Admin Endpoints ---

export const createConsent = async (req, res) => {
  try {
    const { title, description, class_id, event_date } = req.body;
    const created_by = req.user.id;

    if (!title || !class_id) {
      return res.status(400).json({ success: false, message: "Title and Class ID are required." });
    }

    // Insert consent
    const { data: consent, error: consentError } = await supabase
      .from("consents")
      .insert([{ title, description, class_id, event_date, created_by }])
      .select()
      .single();

    if (consentError) throw consentError;

    // Fetch students of the class to assign the consent
    const { data: classStudents, error: studentsError } = await supabase
      .from("class_students")
      .select("student_id")
      .eq("class_id", class_id);

    if (studentsError) throw studentsError;

    if (classStudents && classStudents.length > 0) {
      const rawStudentIds = classStudents.map(s => s.student_id).filter(id => id);

      // Verify that these students actually exist in the user table to prevent FK errors
      const { data: validUsers } = await supabase
        .from("user")
        .select("id")
        .in("id", rawStudentIds);

      const validStudentIds = validUsers ? validUsers.map(u => u.id) : [];

      if (validStudentIds.length > 0) {
        const responses = validStudentIds.map((id) => ({
          consent_id: consent.id,
          student_id: id,
          status: "pending",
        }));

        const { error: responseError } = await supabase
          .from("consent_responses")
          .insert(responses);

        if (responseError) throw responseError;
        
        try {
           const { FCMService } = await import("../../../services/fcmService.js");
           const notifTitle = "New Consent Form";
           const message = `A new consent form "${title}" requires your response.`;
           await FCMService.sendToUsers(validStudentIds, notifTitle, message, { type: "consent" });
           await supabase.from("notifications").insert(validStudentIds.map(sid => ({ user_id: sid, title: notifTitle, message, type: "consent", is_read: false })));
        } catch (notifErr) { console.error("Consent Notification Error:", notifErr); }
      }
    }

    res.status(201).json({ success: true, message: "Consent created successfully", data: consent });
  } catch (error) {
    console.error("Error creating consent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConsentsByFilters = async (req, res) => {
  try {
    const { class_id, date } = req.query;
    
    let query = supabase.from("consents").select("*, class:class_id(name, section)");

    if (class_id) query = query.eq("class_id", class_id);
    if (date) query = query.eq("event_date", date);

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching consents:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getConsentReport = async (req, res) => {
  try {
    const { id } = req.params;

    const { data: consent, error: consentError } = await supabase
      .from("consents")
      .select("*, class:class_id(name, section)")
      .eq("id", id)
      .single();

    if (consentError) throw consentError;

    const { data: responses, error: responseError } = await supabase
      .from("consent_responses")
      .select("*, student:user(name, email, admission_number)")
      .eq("consent_id", id);

    if (responseError) throw responseError;

    res.status(200).json({ success: true, data: { consent, responses } });
  } catch (error) {
    console.error("Error fetching consent report:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConsent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, event_date } = req.body;

    const { data, error } = await supabase
      .from("consents")
      .update({ title, description, event_date })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, message: "Consent updated successfully", data });
  } catch (error) {
    console.error("Error updating consent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteConsent = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete responses first if no cascade is configured
    await supabase.from("consent_responses").delete().eq("consent_id", id);

    // Delete the consent
    const { data, error } = await supabase.from("consents").delete().eq("id", id).select();

    if (error) throw error;

    res.status(200).json({ success: true, message: "Consent deleted successfully", data });
  } catch (error) {
    console.error("Error deleting consent:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- Student/Parent Endpoints ---

export const getStudentConsents = async (req, res) => {
  try {
    const student_id = req.user.id;

    const { data, error } = await supabase
      .from("consent_responses")
      .select("*, consent:consent_id(*)")
      .eq("student_id", student_id)
      .order("created_at", { ascending: false, foreignTable: "consent" });

    if (error) throw error;

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching student consents:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateConsentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const student_id = req.user.id; // Or parent making the request for the student

    if (!["accepted", "declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be accepted or declined." });
    }

    const { data, error } = await supabase
      .from("consent_responses")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("student_id", student_id)
      .select()
      .single();

    if (error) throw error;

    res.status(200).json({ success: true, message: "Consent status updated", data });
  } catch (error) {
    console.error("Error updating consent status:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
