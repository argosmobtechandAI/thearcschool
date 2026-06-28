import { supabaseAdmin } from "../../../config/supabaseClient.js";

export const getAllStudentOfWeek = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("student_of_the_week")
      .select(`
        id,
        reason,
        week_start_date,
        week_end_date,
        created_at,
        student:student_id (id, name, avatar_url),
        class:class_id (id, name, section),
        metrics
      `)
      .order("week_start_date", { ascending: false });

    if (error) {
      if (error.code === 'PGRST205') {
        return res.status(200).json({ success: true, table_missing: true, data: [] });
      }
      throw error;
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Error fetching students of the week:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteStudentOfWeek = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabaseAdmin
      .from("student_of_the_week")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Record deleted successfully" });
  } catch (error) {
    console.error("Error deleting student of the week:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

  export const createStudentOfWeekOverride = async (req, res) => {
    try {
      const { student_id, class_id, week_start_date, week_end_date, reason } = req.body;
      
      if (!student_id || !class_id || !week_start_date || !week_end_date || !reason) {
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
  
      // Check if an entry already exists for this exact week and class
      const { data: existing, error: checkError } = await supabaseAdmin
        .from("student_of_the_week")
        .select("id")
        .eq("class_id", class_id)
        .eq("week_start_date", week_start_date)
        .eq("week_end_date", week_end_date)
        .maybeSingle();

    let result;
      if (existing) {
        // Update existing record for this week and class
        const { data, error } = await supabaseAdmin
          .from("student_of_the_week")
          .update({ student_id, reason })
          .eq("id", existing.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new record
        const { data, error } = await supabaseAdmin
          .from("student_of_the_week")
          .insert({ student_id, class_id, week_start_date, week_end_date, reason, metrics: {} })
          .select()
          .single();
          
        if (error) throw error;
      result = data;
    }

    return res.status(200).json({ success: true, data: result, message: "Student of the Week updated successfully" });
  } catch (error) {
    console.error("Error overriding student of the week:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
