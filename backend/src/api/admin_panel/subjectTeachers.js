import { supabaseAdmin } from "../../config/supabaseClient.js";

export const getSubjectTeachers = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("subject_teachers")
      .select("*");

    if (error) throw error;

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const assignSubjectTeacher = async (req, res) => {
  try {
    const { subjectId, classId, teacherId } = req.body.data;

    if (!subjectId || !classId) {
      return res.status(400).json({ success: false, message: "Subject and Class are required" });
    }

    if (!teacherId) {
      // Remove assignment if teacher is unassigned
      const { error: delError } = await supabaseAdmin
        .from("subject_teachers")
        .delete()
        .match({ subject_id: subjectId, class_id: classId });
      if (delError) throw delError;
      return res.status(200).json({ success: true, message: "Assignment removed" });
    }

    // Upsert assignment
    const { data, error } = await supabaseAdmin
      .from("subject_teachers")
      .upsert(
        { subject_id: subjectId, class_id: classId, teacher_id: teacherId },
        { onConflict: 'subject_id, class_id' }
      )
      .select();

    if (error) throw error;

    return res.status(200).json({ success: true, message: "Teacher assigned successfully", data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
